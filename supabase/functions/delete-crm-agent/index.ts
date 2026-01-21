import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteAgentRequest {
  agent_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: DeleteAgentRequest = await req.json();
    console.log("Deleting agent:", body.agent_id);

    if (!body.agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Archive all leads assigned to this agent
    const { error: leadsError } = await supabaseAdmin
      .from("crm_leads")
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_reason: "Agent deleted",
      })
      .eq("assigned_agent_id", body.agent_id);

    if (leadsError) {
      console.error("Error archiving leads:", leadsError);
      // Continue with deletion even if archiving fails
    }

    // Set agent as inactive
    const { error: updateError } = await supabaseAdmin
      .from("crm_agents")
      .update({ is_active: false })
      .eq("id", body.agent_id);

    if (updateError) {
      console.error("Error updating agent:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      body.agent_id
    );

    if (authError) {
      console.error("Error deleting auth user:", authError);
      // Agent is already deactivated, so we can continue
    }

    console.log("Agent deleted successfully:", body.agent_id);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
