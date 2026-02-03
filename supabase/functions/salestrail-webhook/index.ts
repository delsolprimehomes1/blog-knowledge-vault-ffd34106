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

    // Extract fields from Salestrail payload
    const {
      call_id,
      phone_number,
      direction,
      duration,
      answered,
      started_at,
      ended_at,
      recording_url,
      agent_email,
      agent_phone
    } = payload;

    // ============================================
    // STEP 1: Validate required fields
    // ============================================
    if (!call_id) {
      console.warn("[salestrail-webhook] Missing call_id");
      return new Response(
        JSON.stringify({ success: false, error: "Missing call_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agent_email && !agent_phone) {
      console.warn("[salestrail-webhook] Missing agent identifier (need email or phone)");
      return new Response(
        JSON.stringify({ success: false, error: "Missing agent_email or agent_phone" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // STEP 2: Match Agent (REQUIRED)
    // ============================================
    let agentQuery = supabase.from("crm_agents").select("*");
    
    if (agent_email && agent_phone) {
      agentQuery = agentQuery.or(`email.eq.${agent_email},phone.eq.${agent_phone}`);
    } else if (agent_email) {
      agentQuery = agentQuery.eq("email", agent_email);
    } else {
      agentQuery = agentQuery.eq("phone", agent_phone);
    }

    const { data: agent, error: agentError } = await agentQuery.maybeSingle();

    if (agentError) {
      console.error("[salestrail-webhook] Agent query error:", agentError);
    }

    if (!agent) {
      console.warn("[salestrail-webhook] Agent not matched. Email:", agent_email, "Phone:", agent_phone);
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
    if (phone_number) {
      const { normalized, last9 } = normalizePhone(phone_number);
      
      console.log(`[salestrail-webhook] Searching for lead with phone: ${phone_number} (normalized: ${normalized}, last9: ${last9})`);
      
      const { data: matchedLead, error: leadError } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("assigned_agent_id", agent.id)
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
        console.warn("[salestrail-webhook] No matching lead found for phone:", phone_number);
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
      salestrail_call_id: call_id,
      salestrail_recording_url: recording_url || null,
      call_direction: direction || null,
      call_answered: answered ?? null,
      salestrail_metadata: payload,
      created_at: started_at || new Date().toISOString(),
    };

    const { data: activity, error: activityError } = await supabase
      .from("crm_activities")
      .insert(activityData)
      .select()
      .single();

    if (activityError) {
      // Check for duplicate (unique constraint violation on salestrail_call_id)
      if (activityError.code === "23505") {
        console.log("[salestrail-webhook] Duplicate call already logged:", call_id);
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
      const contactTime = started_at || new Date().toISOString();
      
      const { error: slaError } = await supabase
        .from("crm_leads")
        .update({
          first_contact_at: contactTime,
          first_action_completed: true,
          last_contact_at: contactTime,
        })
        .eq("id", lead.id);

      if (slaError) {
        console.error("[salestrail-webhook] SLA update error:", slaError);
      } else {
        console.log(`[salestrail-webhook] SLA completed for lead ${lead.id}`);
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
