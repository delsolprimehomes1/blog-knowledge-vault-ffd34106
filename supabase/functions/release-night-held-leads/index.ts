import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get language flag emoji
function getLanguageFlag(language: string): string {
  const flags: Record<string, string> = {
    fr: "🇫🇷", fi: "🇫🇮", pl: "🇵🇱", en: "🇬🇧", nl: "🇳🇱",
    de: "🇩🇪", es: "🇪🇸", sv: "🇸🇪", da: "🇩🇰", hu: "🇭🇺",
  };
  return flags[language?.toLowerCase()] || "🌍";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[release-night-held-leads] Checking for leads to release...");

    // Get current time
    const now = new Date().toISOString();

    // Find night-held leads that are ready to be released
    const { data: heldLeads, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("is_night_held", true)
      .eq("lead_claimed", false)
      .lte("scheduled_release_at", now);

    if (error) {
      console.error("[release-night-held-leads] Error fetching leads:", error);
      throw error;
    }

    if (!heldLeads || heldLeads.length === 0) {
      console.log("[release-night-held-leads] No leads ready for release");
      return new Response(
        JSON.stringify({ success: true, released: 0, message: "No leads ready for release" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[release-night-held-leads] Found ${heldLeads.length} leads to release`);

    let releasedCount = 0;

    for (const lead of heldLeads) {
      const language = lead.language || "en";

      // Get round robin config for this language
      const { data: roundConfig } = await supabase
        .from("crm_round_robin_config")
        .select("*")
        .eq("language", language)
        .eq("round_number", 1)
        .eq("is_active", true)
        .single();

      const claimWindowMinutes = roundConfig?.claim_window_minutes || 15;

      // Update lead: Release from night hold and set up for routing
      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          is_night_held: false,
          scheduled_release_at: null,
          lead_status: "new",
          current_round: 1,
          round_broadcast_at: new Date().toISOString(),
          claim_window_expires_at: new Date(Date.now() + claimWindowMinutes * 60 * 1000).toISOString(),
          claim_timer_started_at: new Date().toISOString(),
          last_alarm_level: 0,
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`[release-night-held-leads] Error releasing lead ${lead.id}:`, updateError);
        continue;
      }

      // Find available agents for broadcast
      let availableAgents: any[] = [];

      if (roundConfig && roundConfig.agent_ids?.length > 0) {
        const { data: roundAgents } = await supabase
          .from("crm_agents")
          .select("*")
          .in("id", roundConfig.agent_ids)
          .eq("is_active", true)
          .eq("accepts_new_leads", true);

        const capacityFiltered = (roundAgents || []).filter(
          (agent: { current_lead_count: number; max_active_leads: number }) => 
            agent.current_lead_count < agent.max_active_leads
        );
        const nonAdminAgents = capacityFiltered.filter((agent: { role: string }) => agent.role !== 'admin');
        availableAgents = nonAdminAgents.length > 0 ? nonAdminAgents : capacityFiltered;
      } else {
        // Fallback to language-matched agents
        const { data: eligibleAgents } = await supabase
          .from("crm_agents")
          .select("*")
          .contains("languages", [language])
          .eq("is_active", true)
          .eq("accepts_new_leads", true);

        const capacityFilteredFallback = (eligibleAgents || []).filter(
          (agent: { current_lead_count: number; max_active_leads: number }) => 
            agent.current_lead_count < agent.max_active_leads
        );
        const nonAdminFallback = capacityFilteredFallback.filter((agent: { role: string }) => agent.role !== 'admin');
        availableAgents = nonAdminFallback.length > 0 ? nonAdminFallback : capacityFilteredFallback;
      }

      // Create notifications for all eligible agents
      if (availableAgents.length > 0) {
        const notifications = availableAgents.map((agent: { id: string }) => ({
          agent_id: agent.id,
          lead_id: lead.id,
          notification_type: "new_lead_available",
          title: `${getLanguageFlag(language)} 🌅 Morning Lead Release: ${language.toUpperCase()}`,
          message: `${lead.first_name} ${lead.last_name} - ${lead.lead_segment} - ${lead.budget_range || "Budget TBD"} (Overnight lead now available)`,
          action_url: `/crm/agent/leads/${lead.id}/claim`,
          read: false,
        }));

        await supabase.from("crm_notifications").insert(notifications);

        // Trigger email notifications
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              lead,
              agents: availableAgents,
              claimWindowMinutes,
              notification_type: "broadcast",
            }),
          });
        } catch (emailError) {
          console.error("[release-night-held-leads] Error sending notifications:", emailError);
        }

        console.log(`[release-night-held-leads] Lead ${lead.id} released, notified ${availableAgents.length} agents`);
      } else {
        console.log(`[release-night-held-leads] Lead ${lead.id} released but no available agents for ${language}`);
      }

      // Log activity
      await supabase.from("crm_activities").insert({
        lead_id: lead.id,
        agent_id: null,
        activity_type: "note",
        notes: `🌅 Lead released from overnight hold at business hours opening. Originally received at ${lead.created_at}. Now available for claiming.`,
        created_at: new Date().toISOString(),
      });

      releasedCount++;
    }

    console.log(`[release-night-held-leads] Completed - Released ${releasedCount} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        released: releasedCount,
        message: `Released ${releasedCount} overnight leads for routing`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[release-night-held-leads] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
