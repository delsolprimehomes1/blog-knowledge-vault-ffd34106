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

    console.log("[check-sla-breaches] Starting SLA breach check (notification-only mode)...");

    // Get SLA settings from database
    const { data: slaSettings } = await supabase
      .from("crm_system_settings")
      .select("value")
      .eq("key", "sla_settings")
      .single();

    const slaMinutes = slaSettings?.value?.first_action_minutes || 10;

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - slaMinutes * 60 * 1000).toISOString();

    console.log(`[check-sla-breaches] SLA timeout: ${slaMinutes} minutes, Cutoff: ${cutoffTime}`);

    // Find leads that breached SLA:
    // - Claimed (assigned) but no first action
    // - Assigned more than X minutes ago
    // - Not already marked as breached
    // - Not archived
    const { data: breachedLeads, error } = await supabase
      .from("crm_leads")
      .select(`
        *,
        crm_agents!crm_leads_assigned_agent_id_fkey(id, first_name, last_name, email)
      `)
      .eq("lead_claimed", true)
      .eq("first_action_completed", false)
      .eq("sla_breached", false)
      .eq("archived", false)
      .neq("assignment_method", "admin_fallback")
      .lt("assigned_at", cutoffTime);

    if (error) {
      console.error("[check-sla-breaches] Error fetching leads:", error);
      throw error;
    }

    if (!breachedLeads || breachedLeads.length === 0) {
      console.log("[check-sla-breaches] No SLA breaches found");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No SLA breaches detected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[check-sla-breaches] Found ${breachedLeads.length} SLA breaches to process`);

    let processedCount = 0;
    const appUrl = Deno.env.get("APP_URL") || "https://blog-knowledge-vault.lovable.app";

    for (const lead of breachedLeads) {
      const assignedAgent = lead.crm_agents;
      const timeSinceAssignment = Math.round((Date.now() - new Date(lead.assigned_at).getTime()) / 60000);

      console.log(`[check-sla-breaches] Processing lead ${lead.id} - assigned to ${assignedAgent?.first_name || "Unknown"} for ${timeSinceAssignment} mins`);

      // 1. Mark lead as SLA breached (for tracking/reporting) - DO NOT reassign
      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          sla_breached: true,
          breach_timestamp: new Date().toISOString(),
          // NOTE: Lead stays with the original agent - no reassignment
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`[check-sla-breaches] Error updating lead ${lead.id}:`, updateError);
        continue;
      }

      // 2. Find the language-specific admin from round robin config
      const { data: adminConfig } = await supabase
        .from("crm_round_robin_config")
        .select("agent_ids, fallback_admin_id")
        .eq("language", lead.language)
        .eq("is_admin_fallback", true)
        .eq("is_active", true)
        .single();

      // Prioritize explicit fallback_admin_id, then first agent in list
      let adminAgentId = adminConfig?.fallback_admin_id || adminConfig?.agent_ids?.[0];
      console.log(`[check-sla-breaches] Found admin config for ${lead.language}: fallback_admin_id=${adminConfig?.fallback_admin_id}, agent_ids=${JSON.stringify(adminConfig?.agent_ids)}`);

      // Fallback to default admin if no language-specific admin found
      if (!adminAgentId) {
        adminAgentId = slaSettings?.value?.admin_id || "95808453-dde1-421c-85ba-52fe534ef288";
        console.log(`[check-sla-breaches] Using fallback default admin: ${adminAgentId}`);
      }

      // Get admin agent details
      const { data: adminAgent } = await supabase
        .from("crm_agents")
        .select("id, email, first_name, last_name")
        .eq("id", adminAgentId)
        .single();

      // 3. Send SLA warning email to admin (notification only - no reassignment)
      if (adminAgent?.email) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              lead: {
                id: lead.id,
                first_name: lead.first_name,
                last_name: lead.last_name,
                phone_number: lead.phone_number,
                email: lead.email,
                language: lead.language,
                lead_segment: lead.lead_segment,
                budget_range: lead.budget_range,
                location_preference: lead.location_preference,
                property_type: lead.property_type,
                lead_source: lead.lead_source,
              },
              agents: [adminAgent],
              claimWindowMinutes: slaMinutes,
              notification_type: "sla_warning",
              assigned_agent_name: `${assignedAgent?.first_name || "Unknown"} ${assignedAgent?.last_name || "Agent"}`,
              time_since_assignment_minutes: timeSinceAssignment,
            }),
          });
          console.log(`[check-sla-breaches] SLA warning email sent to admin ${adminAgent.email}:`, response.ok);
        } catch (emailError) {
          console.error(`[check-sla-breaches] Failed to send SLA warning email:`, emailError);
        }
      }

      // 4. Create in-app notification for admin (informational)
      await supabase.from("crm_notifications").insert({
        agent_id: adminAgentId,
        lead_id: lead.id,
        notification_type: "sla_warning",
        title: `⚠️ SLA Warning: Lead Not Worked`,
        message: `${getLanguageFlag(lead.language)} ${lead.first_name} ${lead.last_name} has not been worked by ${assignedAgent?.first_name || "Agent"} after ${timeSinceAssignment} minutes. Lead remains assigned to agent.`,
        action_url: `/crm/agent/leads/${lead.id}`,
        read: false,
      });

      // 5. Create softer reminder notification for the assigned agent
      if (lead.assigned_agent_id) {
        await supabase.from("crm_notifications").insert({
          agent_id: lead.assigned_agent_id,
          lead_id: lead.id,
          notification_type: "sla_reminder",
          title: `⏰ SLA Reminder: Action Required`,
          message: `${getLanguageFlag(lead.language)} You have exceeded the ${slaMinutes}-minute first action window for ${lead.first_name} ${lead.last_name}. Please take action soon.`,
          action_url: `/crm/agent/leads/${lead.id}`,
          read: false,
        });
      }

      // 6. Log activity for audit trail (softer message)
      await supabase.from("crm_activities").insert({
        lead_id: lead.id,
        agent_id: lead.assigned_agent_id,
        activity_type: "note",
        notes: `⚠️ SLA WARNING: No first action logged within the ${slaMinutes}-minute SLA window. Admin (${adminAgent?.first_name || "Admin"}) has been notified. Lead remains assigned to ${assignedAgent?.first_name || "Agent"} ${assignedAgent?.last_name || ""}.`,
        created_at: new Date().toISOString(),
      });

      processedCount++;
      console.log(`[check-sla-breaches] Lead ${lead.id} - SLA warning sent to admin ${adminAgent?.first_name || "Admin"} (no reassignment)`);
    }

    console.log(`[check-sla-breaches] Completed - Processed ${processedCount} SLA warnings (notification-only)`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        slaMinutes,
        mode: "notification_only",
        message: `Sent ${processedCount} SLA warning notifications to admins`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[check-sla-breaches] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
