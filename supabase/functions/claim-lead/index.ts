import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimRequest {
  leadId: string;
  agentId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, agentId }: ClaimRequest = await req.json();

    if (!leadId || !agentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing leadId or agentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[claim-lead] Agent ${agentId} attempting to claim lead ${leadId}`);

    // Use the database function for atomic claiming with race condition protection
    const { data: result, error: claimError } = await supabase.rpc("claim_lead", {
      p_lead_id: leadId,
      p_agent_id: agentId,
    });

    if (claimError) {
      console.error("[claim-lead] RPC error:", claimError);
      return new Response(
        JSON.stringify({ success: false, error: claimError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[claim-lead] Claim result:", result);

    if (!result.success) {
      return new Response(
        JSON.stringify(result),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NEW: Start contact window timer (5 minutes for first contact)
    const now = new Date();
    const contactWindowExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const { error: timerError } = await supabase
      .from("crm_leads")
      .update({
        contact_timer_started_at: now.toISOString(),
        contact_timer_expires_at: contactWindowExpiry.toISOString(),
        contact_sla_breached: false,
        // Clear claim timer since lead is now claimed
        claim_timer_expires_at: null,
      })
      .eq("id", leadId);

    if (timerError) {
      console.error("[claim-lead] Failed to start contact timer:", timerError);
    } else {
      console.log(`[claim-lead] Contact timer started for lead ${leadId}`);
      console.log(`[claim-lead] Contact window expires at: ${contactWindowExpiry.toISOString()}`);
    }

    // Log activity for audit trail
    await supabase.from("crm_activities").insert({
      lead_id: leadId,
      agent_id: agentId,
      activity_type: "note",
      notes: "Lead claimed - 5-minute contact window started",
      created_at: now.toISOString(),
    });

    // Mark notification as read for this agent
    await supabase
      .from("crm_notifications")
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq("lead_id", leadId)
      .eq("agent_id", agentId);

    // Notify other agents that this lead was claimed
    await supabase.rpc("notify_lead_claimed", {
      p_lead_id: leadId,
      p_claiming_agent_id: agentId,
    });

    // Fetch the FULL lead data now that it's claimed - agent gets access to contact info
    const { data: fullLead, error: fetchError } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError) {
      console.error("[claim-lead] Error fetching full lead:", fetchError);
    }

    console.log(`[claim-lead] Lead ${leadId} successfully claimed by agent ${agentId}`);

    return new Response(
      JSON.stringify({ ...result, lead: fullLead }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[claim-lead] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
