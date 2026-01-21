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

    console.log("[check-sla-breaches] Starting SLA breach check...");

    // Get SLA settings from database
    const { data: slaSettings } = await supabase
      .from("crm_system_settings")
      .select("value")
      .eq("key", "sla_settings")
      .single();

    const slaMinutes = slaSettings?.value?.first_action_minutes || 10;
    const adminId = slaSettings?.value?.admin_id || "95808453-dde1-421c-85ba-52fe534ef288"; // Hans

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

    // Get admin agent info
    const { data: adminAgent } = await supabase
      .from("crm_agents")
      .select("*")
      .eq("id", adminId)
      .single();

    let processedCount = 0;

    for (const lead of breachedLeads) {
      const originalAgent = lead.crm_agents;
      const originalAgentId = lead.assigned_agent_id;

      console.log(`[check-sla-breaches] Processing lead ${lead.id} - assigned to ${originalAgent?.first_name || "Unknown"}`);

      // 1. Mark lead as SLA breached
      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          sla_breached: true,
          breach_timestamp: new Date().toISOString(),
          // Reassign to admin
          assigned_agent_id: adminId,
          assigned_at: new Date().toISOString(),
          assignment_method: "sla_escalation",
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`[check-sla-breaches] Error updating lead ${lead.id}:`, updateError);
        continue;
      }

      // 2. Decrement original agent's lead count
      if (originalAgentId) {
        await supabase.rpc("decrement_agent_lead_count", { p_agent_id: originalAgentId });
      }

      // 3. Increment admin's lead count
      if (adminAgent) {
        await supabase
          .from("crm_agents")
          .update({ current_lead_count: (adminAgent.current_lead_count || 0) + 1 })
          .eq("id", adminId);
      }

      // 4. Notify original agent (SLA failure warning)
      if (originalAgentId) {
        await supabase.from("crm_notifications").insert({
          agent_id: originalAgentId,
          lead_id: lead.id,
          notification_type: "sla_breach",
          title: `⚠️ SLA Breach - Lead Reassigned`,
          message: `${getLanguageFlag(lead.language)} ${lead.first_name} ${lead.last_name} was reassigned to admin due to no action within ${slaMinutes} minutes.`,
          action_url: `/crm/agent/leads`,
          read: false,
        });
      }

      // 5. Notify Admin (escalation)
      await supabase.from("crm_notifications").insert({
        agent_id: adminId,
        lead_id: lead.id,
        notification_type: "sla_escalation",
        title: `🚨 SLA Escalation: ${lead.first_name} ${lead.last_name}`,
        message: `${getLanguageFlag(lead.language)} Lead reassigned from ${originalAgent?.first_name || "Unknown Agent"} - No first action in ${slaMinutes}+ minutes. Segment: ${lead.lead_segment}, Budget: ${lead.budget_range || "TBD"}`,
        action_url: `/crm/agent/leads/${lead.id}`,
        read: false,
      });

      // 6. Log activity for audit trail
      await supabase.from("crm_activities").insert({
        lead_id: lead.id,
        agent_id: adminId,
        activity_type: "note",
        notes: `⚠️ SLA BREACH: Lead automatically reassigned from ${originalAgent?.first_name || "Unknown"} ${originalAgent?.last_name || "Agent"}. No first action was logged within the ${slaMinutes}-minute SLA window. Lead escalated to admin for immediate attention.`,
        created_at: new Date().toISOString(),
      });

      processedCount++;
      console.log(`[check-sla-breaches] Lead ${lead.id} escalated to admin (${adminAgent?.first_name || "Admin"})`);
    }

    console.log(`[check-sla-breaches] Completed - Processed ${processedCount} SLA breaches`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        slaMinutes,
        adminId,
        message: `Processed ${processedCount} SLA breach escalations`,
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
