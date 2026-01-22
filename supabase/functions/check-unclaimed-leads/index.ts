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

    console.log("[check-unclaimed-leads] Starting check...");

    // Find unclaimed leads with expired claim windows
    const { data: expiredLeads, error: leadsError } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("lead_claimed", false)
      .eq("archived", false)
      .lt("claim_window_expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50);

    if (leadsError) {
      console.error("[check-unclaimed-leads] Error fetching leads:", leadsError);
      throw leadsError;
    }

    if (!expiredLeads || expiredLeads.length === 0) {
      console.log("[check-unclaimed-leads] No expired leads found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[check-unclaimed-leads] Found ${expiredLeads.length} expired leads`);

    let escalated = 0;
    let assignedToAdmin = 0;

    for (const lead of expiredLeads) {
      try {
        // Use the database function to escalate
        const { data: result, error: escalateError } = await supabase.rpc(
          "escalate_lead_to_next_round",
          { p_lead_id: lead.id }
        );

        if (escalateError) {
          console.error(`[check-unclaimed-leads] Error escalating lead ${lead.id}:`, escalateError);
          continue;
        }

        console.log(`[check-unclaimed-leads] Escalation result for ${lead.id}:`, result);

        if (result.action === "escalated") {
          // Lead was escalated to next round - notify new agents
          escalated++;

          // Get the new round agents
          const { data: agents } = await supabase
            .from("crm_agents")
            .select("*")
            .in("id", result.agent_ids)
            .eq("is_active", true)
            .eq("accepts_new_leads", true);

          const availableAgents = (agents || []).filter(
            (a: { current_lead_count: number; max_active_leads: number }) =>
              a.current_lead_count < a.max_active_leads
          );

          if (availableAgents.length > 0) {
            // Create notifications for Round N agents
            const notifications = availableAgents.map((agent: { id: string }) => ({
              agent_id: agent.id,
              lead_id: lead.id,
              notification_type: "new_lead_available",
              title: `${getLanguageFlag(lead.language)} ROUND ${result.new_round}: ${lead.language.toUpperCase()} Lead`,
              message: `${lead.first_name} ${lead.last_name} - ${lead.lead_segment} - Escalated from Round ${result.new_round - 1}`,
              action_url: `/crm/agent/leads/${lead.id}/claim`,
              read: false,
            }));

            await supabase.from("crm_notifications").insert(notifications);

            // Trigger email notifications
            await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                lead,
                agents: availableAgents,
                claimWindowMinutes: result.claim_window_minutes,
                isEscalation: true,
                currentRound: result.new_round,
              }),
            });
          }

        } else if (result.action === "admin_fallback") {
          // No more rounds - assign to admin
          assignedToAdmin++;

          // Get admin agent(s)
          let adminAgentId = null;
          
          if (result.admin_agent_ids?.length > 0) {
            adminAgentId = result.admin_agent_ids[0];
          } else {
            // Find any admin
            const { data: admins } = await supabase
              .from("crm_agents")
              .select("id")
              .eq("is_active", true)
              .eq("role", "admin")
              .limit(1);

            adminAgentId = admins?.[0]?.id;
          }

          if (adminAgentId) {
            // Get admin details
            const { data: admin } = await supabase
              .from("crm_agents")
              .select("*")
              .eq("id", adminAgentId)
              .single();

            // Assign lead to admin
            await supabase
              .from("crm_leads")
              .update({
                assigned_agent_id: adminAgentId,
                assigned_at: new Date().toISOString(),
                assignment_method: "admin_fallback",
                lead_claimed: true,
                claimed_by: "Unclaimed - Admin Fallback",
              })
              .eq("id", lead.id);

            // Increment admin's lead count
            if (admin) {
              await supabase
                .from("crm_agents")
                .update({ current_lead_count: (admin.current_lead_count || 0) + 1 })
                .eq("id", adminAgentId);
            }

            // Create urgent notification for admin
            await supabase.from("crm_notifications").insert({
              agent_id: adminAgentId,
              lead_id: lead.id,
              notification_type: "admin_fallback",
              title: `🚨 UNCLAIMED: ${lead.first_name} ${lead.last_name}`,
              message: `${lead.language.toUpperCase()} lead went unclaimed after ${lead.current_round} round(s). Manual action required.`,
              action_url: `/crm/agent/leads/${lead.id}`,
              read: false,
            });

            // Send email notification to admin with full lead details
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  lead: {
                    ...lead,
                    current_round: lead.current_round,
                  },
                  agents: [admin],
                  claimWindowMinutes: 0,
                  notification_type: 'admin_unclaimed',
                  isAdminFallback: true,
                }),
              });
              console.log(`[check-unclaimed-leads] Admin email sent to ${admin.email} for lead ${lead.id}`);
            } catch (emailError) {
              console.error(`[check-unclaimed-leads] Failed to send admin email:`, emailError);
            }

            // Log activity
            await supabase.from("crm_activities").insert({
              lead_id: lead.id,
              agent_id: adminAgentId,
              activity_type: "note",
              notes: `Lead went unclaimed after ${lead.current_round} round(s). Auto-assigned to admin for manual handling.`,
              created_at: new Date().toISOString(),
            });

            console.log(`[check-unclaimed-leads] Lead ${lead.id} assigned to admin ${adminAgentId}`);
          } else {
            console.error(`[check-unclaimed-leads] No admin found for lead ${lead.id}`);
          }
        }
      } catch (leadError) {
        console.error(`[check-unclaimed-leads] Error processing lead ${lead.id}:`, leadError);
      }
    }

    console.log(`[check-unclaimed-leads] Complete. Escalated: ${escalated}, Admin fallback: ${assignedToAdmin}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiredLeads.length,
        escalated,
        assignedToAdmin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[check-unclaimed-leads] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
