import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Phone normalization utility - extracts last 9 digits for flexible matching
function normalizePhone(phone: string): { normalized: string; last9: string } {
  const normalized = phone.replace(/[^0-9+]/g, '');
  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  const last9 = digitsOnly.slice(-9);
  return { normalized, last9 };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse webhook payload
    const payload = await req.json();
    console.log("[salestrail-webhook] Received:", JSON.stringify(payload, null, 2));

    // Support both Salestrail format (camelCase) and test format (snake_case)
    const callId = payload.callId || payload.call_id;
    const userEmail = payload.userEmail || payload.agent_email;
    const userPhone = payload.userPhone || payload.agent_phone;
    const phoneNumber = payload.formattedNumber || payload.number || payload.phone_number;
    const { duration, answered } = payload;
    const direction = payload.inbound !== undefined 
      ? (payload.inbound ? 'inbound' : 'outbound')
      : payload.direction;
    const startTime = payload.startTime || payload.started_at;
    const endTime = payload.endTime || payload.ended_at;
    const recordingUrl = payload.recordingUrl || payload.recording_url;

    // ============================================
    // STEP 1: Validate required fields
    // ============================================
    if (!callId) {
      console.warn("[salestrail-webhook] Missing callId");
      return new Response(
        JSON.stringify({ success: false, error: "Missing callId" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userEmail && !userPhone) {
      console.warn("[salestrail-webhook] Missing agent identifier (need userEmail or userPhone)");
      return new Response(
        JSON.stringify({ success: false, error: "Missing userEmail or userPhone" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // STEP 2: Match Agent (REQUIRED)
    // ============================================
    let agentQuery = supabase.from("crm_agents").select("*");
    
    if (userEmail && userPhone) {
      agentQuery = agentQuery.or(`email.eq.${userEmail},phone.eq.${userPhone}`);
    } else if (userEmail) {
      agentQuery = agentQuery.eq("email", userEmail);
    } else {
      agentQuery = agentQuery.eq("phone", userPhone);
    }

    const { data: agent, error: agentError } = await agentQuery.maybeSingle();

    if (agentError) {
      console.error("[salestrail-webhook] Agent query error:", agentError);
    }

    if (!agent) {
      console.warn("[salestrail-webhook] Agent not matched. Email:", userEmail, "Phone:", userPhone);
      return new Response(
        JSON.stringify({ success: false, message: "Agent not matched" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[salestrail-webhook] Matched agent: ${agent.first_name} ${agent.last_name} (${agent.id})`);

    // ============================================
    // STEP 3: Match Lead (BEST EFFORT)
    // Only match leads assigned to this agent
    // ============================================
    let lead = null;
    if (phoneNumber) {
      const { normalized, last9 } = normalizePhone(phoneNumber);
      
      console.log(`[salestrail-webhook] Searching for lead with phone: ${phoneNumber} (normalized: ${normalized}, last9: ${last9})`);
      
      // Search ALL leads for phone match (not just agent's assigned leads)
      // This ensures calls are logged even when agent calls a lead assigned to someone else
      const { data: matchedLead, error: leadError } = await supabase
        .from("crm_leads")
        .select("*")
        .or(`phone_number.ilike.%${last9}%,full_phone.ilike.%${normalized}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leadError) {
        console.error("[salestrail-webhook] Lead query error:", leadError);
      }

      lead = matchedLead;
      
      if (lead) {
        console.log(`[salestrail-webhook] Matched lead: ${lead.first_name} ${lead.last_name} (${lead.id})`);
      } else {
        console.warn("[salestrail-webhook] No matching lead found for phone:", phoneNumber);
      }
    }

    // ============================================
    // STEP 4: Insert Activity
    // ============================================
    const durationSeconds = duration || 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = durationSeconds ? ` - ${minutes}m ${seconds}s` : "";

    const activityData = {
      lead_id: lead?.id || null,
      agent_id: agent.id,
      activity_type: "call",
      outcome: answered ? "answered" : "no_answer",
      call_duration: durationSeconds,
      notes: `Salestrail auto-logged call - ${direction || "unknown"} - ${answered ? "Answered" : "No Answer"}${durationStr}`,
      salestrail_call_id: callId,
      salestrail_recording_url: recordingUrl || null,
      call_direction: direction || null,
      call_answered: answered ?? null,
      salestrail_metadata: payload,
      created_at: startTime || new Date().toISOString(),
    };

    const { data: activity, error: activityError } = await supabase
      .from("crm_activities")
      .insert(activityData)
      .select()
      .single();

    if (activityError) {
      // Check for duplicate (unique constraint violation on salestrail_call_id)
      if (activityError.code === "23505") {
        console.log("[salestrail-webhook] Duplicate call already logged:", callId);
        return new Response(
          JSON.stringify({ success: true, duplicate: true, message: "Call already logged" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("[salestrail-webhook] Activity insert error:", activityError);
      return new Response(
        JSON.stringify({ success: false, error: activityError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[salestrail-webhook] Activity created: ${activity.id}`);

    // ============================================
    // STEP 5: Update SLA (if lead matched and no prior first contact)
    // ============================================
    if (lead && !lead.first_contact_at) {
      const contactTime = startTime || new Date().toISOString();
      
      const { error: slaError } = await supabase
        .from("crm_leads")
        .update({
          first_contact_at: contactTime,
          first_action_completed: true,
          last_contact_at: contactTime,
          // Clear contact timer (contact made successfully)
          contact_timer_expires_at: null,
          contact_sla_breached: false,
        })
        .eq("id", lead.id);

      if (slaError) {
        console.error("[salestrail-webhook] SLA update error:", slaError);
      } else {
        console.log(`[salestrail-webhook] SLA completed for lead ${lead.id}`);
        console.log(`[salestrail-webhook] Contact timer cleared - call logged successfully`);
      }
    }

    // If lead already had first contact but contact timer was active, clear it
    if (lead && lead.first_contact_at && lead.contact_timer_expires_at) {
      const { error: timerClearError } = await supabase
        .from("crm_leads")
        .update({
          contact_timer_expires_at: null,
          contact_sla_breached: false,
          last_contact_at: startTime || new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (timerClearError) {
        console.error("[salestrail-webhook] Timer clear error:", timerClearError);
      } else {
        console.log(`[salestrail-webhook] Cleared active contact timer for lead ${lead.id}`);
      }
    }

    // ============================================
    // STEP 6: Create Notification (if lead matched)
    // ============================================
    if (lead) {
      const notificationMessage = durationSeconds 
        ? `Your ${minutes}m ${seconds}s ${direction || ""} call with ${lead.first_name} ${lead.last_name} was recorded`
        : `Your ${direction || ""} call with ${lead.first_name} ${lead.last_name} was recorded`;

      const { error: notifError } = await supabase.from("crm_notifications").insert({
        agent_id: agent.id,
        lead_id: lead.id,
        notification_type: "call_logged",
        title: "📞 Call Automatically Logged",
        message: notificationMessage.trim(),
        action_url: `/crm/agent/leads/${lead.id}`,
        read: false,
      });

      if (notifError) {
        console.error("[salestrail-webhook] Notification insert error:", notifError);
      } else {
        console.log(`[salestrail-webhook] Notification created for agent ${agent.id}`);
      }
    }

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        activity_id: activity.id,
        lead_matched: !!lead,
        agent_matched: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    // Always return 200 to prevent Salestrail retry storms
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[salestrail-webhook] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
