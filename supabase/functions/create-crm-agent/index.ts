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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the caller's token to verify their identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      console.error("Caller auth error:", callerError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin using the is_admin function
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc("is_admin", { _user_id: caller.id });
    if (adminCheckError) {
      console.error("Admin check error:", adminCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can create agents" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateAgentRequest = await req.json();
    console.log("Creating agent with email:", body.email, "by admin:", caller.id);

    // Validate required fields
    if (!body.email || !body.password || !body.first_name || !body.last_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if agent record with this email already exists in crm_agents
    const { data: existingAgent } = await supabaseAdmin
      .from("crm_agents")
      .select("id")
      .eq("email", body.email)
      .single();

    if (existingAgent) {
      return new Response(
        JSON.stringify({ error: "An agent with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string;
    let authUserCreated = false;

    // Try to create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError) {
      // Check if error is because email already exists
      if (authError.message?.includes("already been registered") || 
          authError.message?.includes("email_exists") ||
          authError.message?.includes("already exists")) {
        console.log("Auth user already exists, finding existing user...");
        
        // Find existing user by email
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (listError) {
          console.error("Failed to list users:", listError);
          return new Response(
            JSON.stringify({ error: "Failed to find existing user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const existingAuthUser = usersData.users.find(
          (u) => u.email?.toLowerCase() === body.email.toLowerCase()
        );

        if (!existingAuthUser) {
          console.error("Could not find existing auth user by email");
          return new Response(
            JSON.stringify({ error: "Could not find existing user with this email" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = existingAuthUser.id;
        console.log("Found existing auth user:", userId);

        // Update their password to the provided one
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: body.password,
        });
        
        if (updateError) {
          console.warn("Could not update password for existing user:", updateError.message);
          // Continue anyway - the user exists, just password wasn't updated
        } else {
          console.log("Updated password for existing auth user");
        }
      } else {
        // Different auth error
        console.error("Auth error:", authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      if (!authData.user) {
        return new Response(
          JSON.stringify({ error: "Failed to create auth user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = authData.user.id;
      authUserCreated = true;
      console.log("Auth user created:", userId);
    }

    // Create agent record
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("crm_agents")
      .insert({
        id: userId,
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
      
      // Rollback: only delete auth user if WE created it
      if (authUserCreated) {
        console.log("Rolling back: deleting newly created auth user");
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      
      return new Response(
        JSON.stringify({ error: agentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Agent created successfully:", agent.id);

    return new Response(
      JSON.stringify({ success: true, agent, agentId: agent.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
