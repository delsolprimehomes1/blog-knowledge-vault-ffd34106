import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAgentRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  languages: string[];
  max_active_leads: number;
  slack_channel_id?: string;
  email_notifications: boolean;
  timezone: string;
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

    const body: CreateAgentRequest = await req.json();
    console.log("Creating agent with email:", body.email);

    // Validate required fields
    if (!body.email || !body.password || !body.first_name || !body.last_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if agent with this email already exists
    const { data: existingAgent } = await supabaseAdmin
      .from("crm_agents")
      .select("id")
      .eq("email", body.email)
      .single();

    if (existingAgent) {
      return new Response(
        JSON.stringify({ error: "An agent with this email already exists" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create auth user" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Auth user created:", authData.user.id);

    // Create agent record
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("crm_agents")
      .insert({
        id: authData.user.id,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone || null,
        role: body.role || "agent",
        languages: body.languages || ["en"],
        max_active_leads: body.max_active_leads || 50,
        slack_channel_id: body.slack_channel_id || null,
        email_notifications: body.email_notifications ?? true,
        timezone: body.timezone || "Europe/Madrid",
        is_active: true,
        accepts_new_leads: true,
        current_lead_count: 0,
      })
      .select()
      .single();

    if (agentError) {
      console.error("Agent creation error:", agentError);
      // Rollback: delete the auth user if agent creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: agentError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Agent created successfully:", agent.id);

    return new Response(
      JSON.stringify({ success: true, agent }),
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
