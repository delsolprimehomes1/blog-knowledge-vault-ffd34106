import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state, redirectUri } = await req.json();

    if (!code || !state) {
      throw new Error("Missing authorization code or state");
    }

    // Decode state to get agentId
    let agentId: string;
    try {
      const stateData = JSON.parse(atob(state));
      agentId = stateData.agentId;
    } catch {
      throw new Error("Invalid state parameter");
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    console.log(`[gmail-auth-callback] Exchanging code for tokens, agent: ${agentId}`);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[gmail-auth-callback] Token exchange failed:", errorData);
      throw new Error("Failed to exchange authorization code for tokens");
    }

    const tokens = await tokenResponse.json();
    console.log(`[gmail-auth-callback] Token exchange successful`);

    // Get user's email to verify it's a @delsolprimehomes.com account
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info from Google");
    }

    const userInfo = await userInfoResponse.json();
    console.log(`[gmail-auth-callback] User email: ${userInfo.email}`);

    // Verify email domain
    if (!userInfo.email?.endsWith("@delsolprimehomes.com")) {
      console.error(`[gmail-auth-callback] Invalid domain: ${userInfo.email}`);
      throw new Error(
        "Only @delsolprimehomes.com Gmail accounts are allowed. Please use your company email."
      );
    }

    // Store tokens in database using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabase
      .from("crm_agents")
      .update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        email: userInfo.email,
      })
      .eq("id", agentId);

    if (updateError) {
      console.error("[gmail-auth-callback] Database update error:", updateError);
      throw new Error("Failed to save Gmail tokens to database");
    }

    console.log(`[gmail-auth-callback] Successfully connected Gmail for agent ${agentId}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: userInfo.email,
        message: "Gmail connected successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[gmail-auth-callback] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
