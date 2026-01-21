import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    console.log("[migrate-legacy-leads] Starting migration...");

    // 1. Fetch all legacy leads
    const { data: legacyLeads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch legacy leads: ${fetchError.message}`);
    }

    console.log(`[migrate-legacy-leads] Found ${legacyLeads?.length || 0} legacy leads`);

    if (!legacyLeads || legacyLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, migrated: 0, message: "No legacy leads to migrate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get existing CRM leads to avoid duplicates (by phone number)
    const { data: existingCrmLeads } = await supabase
      .from("crm_leads")
      .select("phone_number");

    const existingPhones = new Set(
      (existingCrmLeads || []).map((l: { phone_number: string }) => l.phone_number)
    );

    // 3. Transform and filter leads
    const leadsToMigrate = legacyLeads
      .filter((lead: any) => !existingPhones.has(lead.phone))
      .map((lead: any) => {
        // Split full_name into first_name and last_name
        const nameParts = (lead.full_name || "Unknown").trim().split(" ");
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "Lead";

        // Detect language from various sources
        let language = lead.language || "en";
        if (lead.page_url) {
          const urlMatch = lead.page_url.match(/\/(fr|fi|nl|de|es|sv|da|pl|hu)\//);
          if (urlMatch) language = urlMatch[1];
        }

        return {
          first_name: firstName,
          last_name: lastName,
          phone_number: lead.phone,
          email: lead.email || null,
          language: language.toLowerCase(),
          lead_source: "Landing Form",
          lead_source_detail: lead.lead_source_detail || "legacy_migration",
          page_url: lead.page_url || null,
          lead_status: "new",
          lead_priority: "medium",
          lead_segment: "Cold",
          initial_lead_score: 30,
          current_lead_score: 30,
          lead_claimed: false,
          created_at: lead.created_at,
        };
      });

    console.log(`[migrate-legacy-leads] ${leadsToMigrate.length} leads to migrate (after dedup)`);

    if (leadsToMigrate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, migrated: 0, message: "All leads already migrated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Insert into crm_leads
    const { data: inserted, error: insertError } = await supabase
      .from("crm_leads")
      .insert(leadsToMigrate)
      .select("id, first_name, last_name");

    if (insertError) {
      throw new Error(`Failed to insert leads: ${insertError.message}`);
    }

    console.log(`[migrate-legacy-leads] Successfully migrated ${inserted?.length || 0} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        migrated: inserted?.length || 0,
        leads: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[migrate-legacy-leads] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
