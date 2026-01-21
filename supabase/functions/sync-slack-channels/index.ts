import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://gateway.lovable.dev/slack/api";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get required environment variables
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");
    if (!SLACK_API_KEY) {
      console.log("Slack not connected - returning empty channel list");
      return new Response(
        JSON.stringify({ 
          success: true, 
          channels: [],
          message: "Slack not connected. Please connect Slack integration first."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching Slack channels...");

    // Fetch public channels from Slack
    const response = await fetch(`${GATEWAY_URL}/conversations.list`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": SLACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        types: "public_channel",
        exclude_archived: true,
        limit: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Slack API error:", data);
      throw new Error(`Slack API call failed: ${data.error || "Unknown error"}`);
    }

    console.log(`Found ${data.channels?.length || 0} Slack channels`);

    // Upsert channels into database
    const channels = (data.channels || []).map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private || false,
      member_count: channel.num_members || 0,
      last_synced_at: new Date().toISOString(),
    }));

    if (channels.length > 0) {
      const { error: upsertError } = await supabase
        .from("slack_channels")
        .upsert(channels, { onConflict: "id" });

      if (upsertError) {
        console.error("Error upserting channels:", upsertError);
        throw new Error(`Database error: ${upsertError.message}`);
      }
    }

    console.log(`Successfully synced ${channels.length} channels to database`);

    return new Response(
      JSON.stringify({
        success: true,
        channels,
        synced_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error syncing Slack channels:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
