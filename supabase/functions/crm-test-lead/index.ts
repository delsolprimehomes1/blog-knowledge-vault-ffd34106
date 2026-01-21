import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestLeadRequest {
  source: "form" | "emma";
  language: string;
  budgetRange?: string;
  timeframe?: string;
  locationPreference?: string[];
  questionsAnswered?: number;
  intakeComplete?: boolean;
  skipNotifications?: boolean;
}

interface TestResult {
  success: boolean;
  leadId?: string;
  score?: number;
  segment?: string;
  priority?: string;
  claimWindowExpires?: string;
  agentsNotified?: number;
  notificationIds?: string[];
  errors?: string[];
  duration?: number;
}

// Test data generators
function generateTestFirstName(): string {
  const names = ["John", "Maria", "Hans", "Sophie", "Pierre", "Anna", "Lars", "Emma", "Marco", "Nina"];
  return names[Math.floor(Math.random() * names.length)];
}

function generateTestLastName(): string {
  const names = ["Smith", "Garcia", "Mueller", "Dubois", "Andersson", "Virtanen", "Kowalski", "Nagy", "Jensen", "van Berg"];
  return names[Math.floor(Math.random() * names.length)];
}

function generateTestPhone(): string {
  return `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function generateTestEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.test${Date.now()}@example.com`;
}

function generateEmmaQAPairs(questionsAnswered: number): Array<{ question: string; answer: string }> {
  const allQAs = [
    { question: "What type of property are you looking for?", answer: "Villa with pool and sea views" },
    { question: "What's your preferred location?", answer: "Marbella or Estepona area" },
    { question: "What's your budget range?", answer: "Between €800,000 and €1.5 million" },
    { question: "How many bedrooms do you need?", answer: "At least 4 bedrooms" },
    { question: "Is this for primary residence or investment?", answer: "Holiday home with rental potential" },
    { question: "When are you looking to purchase?", answer: "Within the next 6 months" },
  ];
  return allQAs.slice(0, Math.min(questionsAnswered, allQAs.length));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: TestLeadRequest = await req.json();
    const {
      source = "form",
      language = "en",
      budgetRange = "€500K-€1M",
      timeframe = "within_1_year",
      locationPreference = ["Marbella"],
      questionsAnswered = 4,
      intakeComplete = true,
      skipNotifications = false,
    } = request;

    console.log(`[crm-test-lead] Creating test ${source} lead in ${language}`);

    const firstName = generateTestFirstName();
    const lastName = generateTestLastName();
    const phone = generateTestPhone();
    const email = generateTestEmail(firstName, lastName);

    // Build payload based on source type
    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      phone,
      email,
      countryPrefix: "+34",
      language,
      leadSource: source === "emma" ? "Emma Chatbot" : "Landing Form",
      leadSourceDetail: source === "emma" 
        ? `emma_chat_${language}_test_${Date.now()}`
        : `form_landing_${language}_test_${Date.now()}`,
      pageUrl: `https://delsolprimehomes.com/${language}/landing`,
      pageType: "landing",
      pageTitle: `Costa del Sol Properties - ${language.toUpperCase()}`,
      referrer: "https://google.com",
      budgetRange,
      timeframe,
      locationPreference,
      propertyType: ["villa", "apartment"],
      propertyPurpose: "holiday_home",
      bedroomsDesired: "3+",
      seaViewImportance: "preferred",
    };

    // Add Emma-specific fields
    if (source === "emma") {
      payload.questionsAnswered = questionsAnswered;
      payload.qaPairs = generateEmmaQAPairs(questionsAnswered);
      payload.intakeComplete = intakeComplete;
      payload.conversationDuration = `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 59)}s`;
      if (!intakeComplete) {
        payload.exitPoint = "budget_question";
      }
    } else {
      // Form-specific fields
      payload.propertyRef = `DSP-TEST-${Math.floor(Math.random() * 10000)}`;
      payload.message = "This is a test lead generated for verification purposes.";
      payload.cityName = locationPreference[0] || "Marbella";
    }

    // Call register-crm-lead edge function
    const registerResponse = await fetch(`${supabaseUrl}/functions/v1/register-crm-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      throw new Error(`register-crm-lead failed: ${errorText}`);
    }

    const registerResult = await registerResponse.json();
    console.log("[crm-test-lead] Lead registered:", registerResult);

    if (!registerResult.success || !registerResult.leadId) {
      throw new Error("Lead registration did not return success or leadId");
    }

    // Fetch the created lead to verify all fields
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", registerResult.leadId)
      .single();

    if (leadError) {
      errors.push(`Failed to fetch created lead: ${leadError.message}`);
    }

    // Verify lead fields
    const verificationErrors: string[] = [];
    if (lead) {
      if (lead.language !== language) verificationErrors.push(`Language mismatch: expected ${language}, got ${lead.language}`);
      if (!lead.claim_window_expires_at) verificationErrors.push("claim_window_expires_at not set");
      if (lead.lead_claimed !== false) verificationErrors.push("lead_claimed should be false");
      if (!lead.lead_segment) verificationErrors.push("lead_segment not calculated");
      if (!lead.current_lead_score) verificationErrors.push("current_lead_score not calculated");
      
      if (source === "emma") {
        if (!lead.qa_pairs || lead.qa_pairs.length === 0) verificationErrors.push("qa_pairs not stored for Emma lead");
        if (lead.intake_complete !== intakeComplete) verificationErrors.push(`intake_complete mismatch`);
      }

      // Check claim window is in the future
      if (lead.claim_window_expires_at) {
        const expiresAt = new Date(lead.claim_window_expires_at);
        if (expiresAt <= new Date()) {
          verificationErrors.push("claim_window_expires_at is not in the future");
        }
      }
    }

    errors.push(...verificationErrors);

    // Fetch notifications created
    const { data: notifications, error: notifError } = await supabase
      .from("crm_notifications")
      .select("id, agent_id, notification_type")
      .eq("lead_id", registerResult.leadId);

    if (notifError) {
      errors.push(`Failed to fetch notifications: ${notifError.message}`);
    }

    const duration = Date.now() - startTime;

    const result: TestResult = {
      success: errors.length === 0,
      leadId: registerResult.leadId,
      score: lead?.current_lead_score || registerResult.score,
      segment: lead?.lead_segment || registerResult.segment,
      priority: lead?.lead_priority,
      claimWindowExpires: lead?.claim_window_expires_at,
      agentsNotified: notifications?.length || registerResult.broadcastTo || 0,
      notificationIds: notifications?.map((n: { id: string }) => n.id) || [],
      errors: errors.length > 0 ? errors : undefined,
      duration,
    };

    console.log("[crm-test-lead] Test result:", result);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 207, // 207 = Multi-Status (partial success)
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[crm-test-lead] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: [errorMessage],
        duration: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
