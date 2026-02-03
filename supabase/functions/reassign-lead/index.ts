import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://www.delsolprimehomes.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      lead_id,
      to_agent_id,
      reason, // 'unclaimed' | 'no_contact' | 'manual'
      notes,
      reassigned_by_id
    } = await req.json();

    console.log(`[reassign-lead] Reassigning lead ${lead_id} to agent ${to_agent_id}, reason: ${reason}`);

    // Validate inputs
    if (!lead_id || !to_agent_id || !reason || !reassigned_by_id) {
      console.error("[reassign-lead] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: lead_id, to_agent_id, reason, reassigned_by_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get lead details with assigned agent
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("*, assigned_agent:crm_agents!assigned_agent_id(id, email, first_name, last_name)")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      console.error("[reassign-lead] Lead not found:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromAgentId = lead.assigned_agent_id;
    const fromAgentName = lead.assigned_agent 
      ? `${lead.assigned_agent.first_name} ${lead.assigned_agent.last_name}` 
      : "Unassigned";

    console.log(`[reassign-lead] From agent: ${fromAgentName} (${fromAgentId})`);

    // Get new agent details
    const { data: toAgent, error: toAgentError } = await supabase
      .from("crm_agents")
      .select("*")
      .eq("id", to_agent_id)
      .single();

    if (toAgentError || !toAgent) {
      console.error("[reassign-lead] Target agent not found:", toAgentError);
      return new Response(
        JSON.stringify({ error: "Target agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toAgentName = `${toAgent.first_name} ${toAgent.last_name}`;
    console.log(`[reassign-lead] To agent: ${toAgentName} (${to_agent_id})`);

    // Prepare update payload
    const now = new Date();
    const contactWindowExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const leadUpdate: Record<string, unknown> = {
      assigned_agent_id: to_agent_id,
      previous_agent_id: fromAgentId,
      reassignment_count: (lead.reassignment_count || 0) + 1,
      reassignment_reason: reason,
      reassigned_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Set timers based on reason
    if (reason === 'unclaimed') {
      // Lead was never claimed, mark as claimed now with new contact timer
      leadUpdate.lead_claimed = true;
      leadUpdate.assigned_at = now.toISOString();
      leadUpdate.assignment_method = 'admin_reassignment';
      leadUpdate.claim_timer_expires_at = null;
      leadUpdate.claim_sla_breached = true; // Keep breach flag for history
      // Start fresh contact timer
      leadUpdate.contact_timer_started_at = now.toISOString();
      leadUpdate.contact_timer_expires_at = contactWindowExpiry.toISOString();
      leadUpdate.contact_sla_breached = false;
      leadUpdate.first_action_completed = false;
      console.log("[reassign-lead] Unclaimed reason: Starting new contact timer");
    } else if (reason === 'no_contact') {
      // Lead was claimed but no contact made, reset contact timer
      leadUpdate.contact_timer_started_at = now.toISOString();
      leadUpdate.contact_timer_expires_at = contactWindowExpiry.toISOString();
      leadUpdate.contact_sla_breached = false;
      leadUpdate.first_action_completed = false;
      leadUpdate.assigned_at = now.toISOString();
      leadUpdate.assignment_method = 'admin_reassignment';
      console.log("[reassign-lead] No contact reason: Resetting contact timer");
    } else {
      // Manual reassignment - no timer changes
      leadUpdate.assigned_at = now.toISOString();
      leadUpdate.assignment_method = 'admin_reassignment';
      console.log("[reassign-lead] Manual reason: No timer changes");
    }

    // Update lead
    const { error: updateError } = await supabase
      .from("crm_leads")
      .update(leadUpdate)
      .eq("id", lead_id);

    if (updateError) {
      console.error("[reassign-lead] Failed to update lead:", updateError);
      throw updateError;
    }

    console.log("[reassign-lead] Lead updated successfully");

    // Insert reassignment record
    const stageMap: Record<string, string> = {
      'unclaimed': 'claim_window',
      'no_contact': 'contact_window',
      'manual': 'manual'
    };

    const { error: reassignmentError } = await supabase
      .from("crm_lead_reassignments")
      .insert({
        lead_id,
        from_agent_id: fromAgentId,
        to_agent_id,
        reassigned_by: reassigned_by_id,
        reason,
        stage: stageMap[reason] || 'manual',
        notes: notes || null,
      });

    if (reassignmentError) {
      console.error("[reassign-lead] Failed to insert reassignment record:", reassignmentError);
      // Non-blocking - continue
    } else {
      console.log("[reassign-lead] Reassignment record created");
    }

    // Update agent lead counts
    if (fromAgentId) {
      const { error: decrementError } = await supabase.rpc('decrement_agent_lead_count', { p_agent_id: fromAgentId });
      if (decrementError) {
        console.error("[reassign-lead] Failed to decrement old agent count:", decrementError);
      } else {
        console.log("[reassign-lead] Decremented old agent lead count");
      }
    }

    const { error: incrementError } = await supabase.rpc('increment_agent_lead_count', { p_agent_id: to_agent_id });
    if (incrementError) {
      console.error("[reassign-lead] Failed to increment new agent count:", incrementError);
    } else {
      console.log("[reassign-lead] Incremented new agent lead count");
    }

    // Mark old agent's notifications as read
    if (fromAgentId) {
      await supabase
        .from("crm_notifications")
        .update({ read: true, read_at: now.toISOString() })
        .eq("lead_id", lead_id)
        .eq("agent_id", fromAgentId);
      console.log("[reassign-lead] Marked old agent notifications as read");
    }

    // Create notification for new agent
    const { error: notifError } = await supabase.from("crm_notifications").insert({
      agent_id: to_agent_id,
      lead_id,
      notification_type: "lead_reassigned",
      title: "🔄 Lead Reassigned to You",
      message: `Admin reassigned ${lead.first_name} ${lead.last_name} to you - ${reason.replace('_', ' ')}`,
      action_url: `/crm/agent/leads/${lead_id}`,
      read: false,
    });

    if (notifError) {
      console.error("[reassign-lead] Failed to create notification:", notifError);
    } else {
      console.log("[reassign-lead] Created notification for new agent");
    }

    // Log activity
    const reasonDescriptions: Record<string, string> = {
      'unclaimed': 'Lead was unclaimed within SLA window',
      'no_contact': 'Previous agent did not make contact within SLA window',
      'manual': 'Manual reassignment by admin'
    };

    const { error: activityError } = await supabase.from("crm_activities").insert({
      lead_id,
      agent_id: to_agent_id,
      activity_type: "note",
      notes: `Lead reassigned from ${fromAgentName} to ${toAgentName}. Reason: ${reasonDescriptions[reason] || reason}${notes ? '. Admin notes: ' + notes : ''}`,
      created_at: now.toISOString(),
    });

    if (activityError) {
      console.error("[reassign-lead] Failed to log activity:", activityError);
    } else {
      console.log("[reassign-lead] Activity logged");
    }

    // Send email to new agent
    const timerWarning = reason !== 'manual' 
      ? `<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400E; font-weight: bold;">⏱️ Contact Timer Active</p>
          <p style="margin: 5px 0 0 0; color: #92400E;">You have <strong>5 minutes</strong> to call this lead!</p>
        </div>`
      : '';

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CRM Assignments <crm@notifications.delsolprimehomes.com>",
        to: [toAgent.email],
        subject: `🔄 Lead Reassigned: ${lead.first_name} ${lead.last_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1E40AF; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🔄 Lead Reassigned to You</h1>
            </div>
            
            <div style="background: #F3F4F6; padding: 25px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${toAgent.first_name},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">A lead has been reassigned to you by admin.</p>
              
              ${timerWarning}
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 15px 0; color: #1E40AF; font-size: 18px;">Lead Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #6B7280;">Name:</td><td style="padding: 8px 0; font-weight: bold;">${lead.first_name} ${lead.last_name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6B7280;">Phone:</td><td style="padding: 8px 0; font-weight: bold;">${lead.phone_number}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6B7280;">Email:</td><td style="padding: 8px 0;">${lead.email || "Not provided"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6B7280;">Language:</td><td style="padding: 8px 0;">${lead.language?.toUpperCase() || "N/A"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6B7280;">Source:</td><td style="padding: 8px 0;">${lead.lead_source || "N/A"}</td></tr>
                </table>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 15px 0; color: #1E40AF; font-size: 18px;">Reassignment Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #6B7280;">Previous Agent:</td><td style="padding: 8px 0;">${fromAgentName}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6B7280;">Reason:</td><td style="padding: 8px 0;">${reasonDescriptions[reason] || reason}</td></tr>
                  ${notes ? `<tr><td style="padding: 8px 0; color: #6B7280;">Admin Notes:</td><td style="padding: 8px 0;">${notes}</td></tr>` : ''}
                </table>
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${APP_URL}/crm/agent/leads/${lead_id}" 
                   style="display: inline-block; background: #1E40AF; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  View Lead & Take Action
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 12px; margin-top: 30px; text-align: center;">
                Del Sol Prime Homes CRM - Automated Assignment Notification
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error("[reassign-lead] Failed to send email:", emailError);
    } else {
      console.log("[reassign-lead] Email sent to new agent");
    }

    console.log(`[reassign-lead] Successfully reassigned lead ${lead_id} to ${toAgentName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lead reassigned to ${toAgentName}`,
        lead_id,
        from_agent: fromAgentName,
        to_agent: toAgentName,
        reason,
        timer_reset: reason !== 'manual',
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[reassign-lead] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
