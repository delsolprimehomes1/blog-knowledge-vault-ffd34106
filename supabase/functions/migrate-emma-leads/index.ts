import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[migrate-emma-leads] Starting migration from emma_conversations to emma_leads");

    // Fetch all emma_conversations
    const { data: conversations, error: fetchError } = await supabase
      .from("emma_conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("[migrate-emma-leads] Error fetching conversations:", fetchError);
      throw new Error(`Failed to fetch conversations: ${fetchError.message}`);
    }

    console.log(`[migrate-emma-leads] Found ${conversations?.length || 0} conversations to migrate`);

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, migrated: 0, message: "No conversations to migrate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const conv of conversations) {
      try {
        // Parse name into first/last name
        const nameParts = (conv.name || "").trim().split(" ");
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(" ") || null;

        // Parse custom_fields if it exists
        const customFields = conv.custom_fields || {};

        // Extract data from custom_fields or messages
        const leadData = {
          conversation_id: conv.conversation_id,
          first_name: customFields.first_name || firstName,
          last_name: customFields.last_name || lastName,
          phone_number: customFields.phone_number || conv.whatsapp || null,
          country_prefix: customFields.country_prefix || null,
          
          // Q&A Phase
          question_1: customFields.question_1 || null,
          answer_1: customFields.answer_1 || null,
          question_2: customFields.question_2 || null,
          answer_2: customFields.answer_2 || null,
          question_3: customFields.question_3 || null,
          answer_3: customFields.answer_3 || null,
          questions_answered: customFields.questions_answered || 0,
          
          // Property Criteria
          location_preference: customFields.location_preference || null,
          sea_view_importance: customFields.sea_view_importance || null,
          budget_range: customFields.budget_range || null,
          bedrooms_desired: customFields.bedrooms_desired || null,
          property_type: customFields.property_type || null,
          property_purpose: customFields.property_purpose || null,
          timeframe: customFields.timeframe || null,
          
          // System Data
          detected_language: customFields.detected_language || conv.language || "EN",
          intake_complete: customFields.intake_complete || false,
          declined_selection: customFields.declined_selection || false,
          conversation_date: conv.created_at || new Date().toISOString(),
          conversation_status: customFields.conversation_status || conv.status || "unknown",
          exit_point: customFields.exit_point || "unknown",
          
          // Webhook - mark as false so they can be resent
          webhook_sent: false,
          webhook_attempts: 0,
          webhook_last_error: null,
          webhook_sent_at: null,
          
          // Timestamps
          created_at: conv.created_at,
          updated_at: new Date().toISOString()
        };

        // Upsert into emma_leads
        const { error: upsertError } = await supabase
          .from("emma_leads")
          .upsert(leadData, { onConflict: "conversation_id" });

        if (upsertError) {
          console.error(`[migrate-emma-leads] Error upserting lead ${conv.conversation_id}:`, upsertError);
          errors.push(`${conv.conversation_id}: ${upsertError.message}`);
          skipped++;
        } else {
          migrated++;
          console.log(`[migrate-emma-leads] Migrated: ${conv.conversation_id} (${firstName} ${lastName})`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[migrate-emma-leads] Error processing ${conv.conversation_id}:`, err);
        errors.push(`${conv.conversation_id}: ${errorMessage}`);
        skipped++;
      }
    }

    console.log(`[migrate-emma-leads] Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        migrated,
        skipped,
        total: conversations.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[migrate-emma-leads] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
