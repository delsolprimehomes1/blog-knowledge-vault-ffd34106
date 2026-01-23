import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadPayload {
  contact_info: {
    first_name: string;
    last_name: string;
    phone_number: string;
    country_prefix: string;
  };
  content_phase: {
    question_1: string;
    answer_1: string;
    question_2: string;
    answer_2: string;
    question_3: string;
    answer_3: string;
    questions_answered: number;
  };
  property_criteria: {
    location_preference: string[];
    sea_view_importance: string;
    budget_range: string;
    bedrooms_desired: string;
    property_type: string | string[];
    property_purpose: string;
    timeframe: string;
  };
  system_data: {
    detected_language: string;
    intake_complete: boolean;
    declined_selection: boolean;
    conversation_date: string;
    conversation_status: string;
    exit_point: string;
  };
  page_context?: {
    page_type: string;
    page_url: string;
    page_title: string;
    referrer: string;
    language: string;
    lead_source: string;
    lead_source_detail: string;
    lead_segment: string;
    initial_lead_score: number;
    conversation_duration: string;
  };
  conversation_id?: string;
}

// Update emma_leads table for conversation history tracking
async function updateLeadRecord(
  supabase: any,
  conversationId: string,
  payload: LeadPayload
): Promise<void> {
  const pageContext = payload.page_context;
  
  const updateData: Record<string, any> = {
    first_name: payload.contact_info.first_name,
    last_name: payload.contact_info.last_name,
    phone_number: payload.contact_info.phone_number,
    country_prefix: payload.contact_info.country_prefix,
    question_1: payload.content_phase.question_1,
    answer_1: payload.content_phase.answer_1,
    question_2: payload.content_phase.question_2,
    answer_2: payload.content_phase.answer_2,
    question_3: payload.content_phase.question_3,
    answer_3: payload.content_phase.answer_3,
    questions_answered: payload.content_phase.questions_answered,
    location_preference: payload.property_criteria.location_preference,
    sea_view_importance: payload.property_criteria.sea_view_importance,
    budget_range: payload.property_criteria.budget_range,
    bedrooms_desired: payload.property_criteria.bedrooms_desired,
    property_type: Array.isArray(payload.property_criteria.property_type)
      ? payload.property_criteria.property_type
      : [payload.property_criteria.property_type].filter(Boolean),
    property_purpose: payload.property_criteria.property_purpose,
    timeframe: payload.property_criteria.timeframe,
    detected_language: payload.system_data.detected_language,
    intake_complete: payload.system_data.intake_complete,
    declined_selection: payload.system_data.declined_selection,
    conversation_date: payload.system_data.conversation_date,
    conversation_status: payload.system_data.conversation_status,
    exit_point: payload.system_data.exit_point,
    updated_at: new Date().toISOString(),
    // Page context fields
    page_type: pageContext?.page_type || null,
    page_url: pageContext?.page_url || null,
    page_title: pageContext?.page_title || null,
    referrer: pageContext?.referrer || 'Direct',
    lead_source: pageContext?.lead_source || 'Emma Chatbot',
    lead_source_detail: pageContext?.lead_source_detail || null,
    lead_segment: pageContext?.lead_segment || null,
    initial_lead_score: pageContext?.initial_lead_score || 15,
    conversation_duration: pageContext?.conversation_duration || null,
  };

  // Update existing record
  const { error: updateError } = await supabase
    .from('emma_leads')
    .update(updateData)
    .eq('conversation_id', conversationId);

  if (updateError) {
    console.log('Update failed, trying insert:', updateError.message);
    // If update fails (no existing record), insert new
    const { error: insertError } = await supabase
      .from('emma_leads')
      .insert({
        conversation_id: conversationId,
        ...updateData,
      });
    
    if (insertError) {
      console.error('Insert also failed:', insertError.message);
    }
  }
}

// Register lead in CRM for round robin routing
async function registerInCRM(
  supabaseUrl: string,
  supabaseKey: string,
  payload: LeadPayload
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const crmPayload = {
    // Contact info
    firstName: payload.contact_info.first_name,
    lastName: payload.contact_info.last_name,
    phone: payload.contact_info.phone_number,
    countryPrefix: payload.contact_info.country_prefix,
    
    // Source tracking
    leadSource: 'Emma Chatbot',
    leadSourceDetail: payload.page_context?.lead_source_detail || `Emma - ${payload.system_data.exit_point || 'conversation'}`,
    pageUrl: payload.page_context?.page_url || '',
    pageType: payload.page_context?.page_type || '',
    pageTitle: payload.page_context?.page_title || '',
    referrer: payload.page_context?.referrer || 'Direct',
    language: (payload.page_context?.language || payload.system_data.detected_language || 'en').toLowerCase().substring(0, 2),
    
    // Emma-specific conversation data
    questionsAnswered: payload.content_phase?.questions_answered || 0,
    qaPairs: [
      { question: payload.content_phase?.question_1 || '', answer: payload.content_phase?.answer_1 || '' },
      { question: payload.content_phase?.question_2 || '', answer: payload.content_phase?.answer_2 || '' },
      { question: payload.content_phase?.question_3 || '', answer: payload.content_phase?.answer_3 || '' },
    ].filter(qa => qa.question && qa.answer),
    intakeComplete: payload.system_data?.intake_complete || false,
    exitPoint: payload.system_data?.exit_point || 'unknown',
    conversationDuration: payload.page_context?.conversation_duration || '',
    
    // Property criteria
    locationPreference: payload.property_criteria?.location_preference || [],
    seaViewImportance: payload.property_criteria?.sea_view_importance || '',
    budgetRange: payload.property_criteria?.budget_range || '',
    bedroomsDesired: payload.property_criteria?.bedrooms_desired || '',
    propertyType: Array.isArray(payload.property_criteria?.property_type) 
      ? payload.property_criteria.property_type.join(', ') 
      : (payload.property_criteria?.property_type || ''),
    propertyPurpose: payload.property_criteria?.property_purpose || '',
    timeframe: payload.property_criteria?.timeframe || '',
  };

  console.log('📤 Registering Emma lead in CRM:', crmPayload.firstName, crmPayload.lastName);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/register-crm-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(crmPayload),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Emma lead registered in CRM:', result.lead_id || 'success');
      return { success: true, leadId: result.lead_id };
    } else {
      const errorText = await response.text();
      console.error('❌ CRM registration failed:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ CRM registration error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload: LeadPayload = await req.json();
    const conversationId = payload.conversation_id || `emma_${Date.now()}`;

    console.log('📨 EMMA LEAD RECEIVED:', {
      name: `${payload.contact_info.first_name} ${payload.contact_info.last_name}`,
      phone: payload.contact_info.phone_number,
      language: payload.system_data.detected_language,
      intake_complete: payload.system_data.intake_complete,
      exit_point: payload.system_data.exit_point,
    });

    // Step 1: Update emma_leads table for conversation history
    await updateLeadRecord(supabase, conversationId, payload);
    console.log('✅ Emma lead conversation saved to emma_leads table');

    // Step 2: Register in CRM for round robin routing (same as form leads)
    // Only if we have a phone number - required for agent contact
    let crmResult: { success: boolean; leadId?: string; error?: string } = { 
      success: false, 
      error: 'No phone number provided' 
    };
    
    if (payload.contact_info.phone_number?.trim()) {
      crmResult = await registerInCRM(supabaseUrl, supabaseKey, payload);
      
      if (!crmResult.success) {
        console.error('⚠️ CRM registration failed, but conversation is saved');
      }
    } else {
      console.log('⚠️ Skipping CRM registration - no phone number provided. Lead saved to emma_leads only.');
    }

    return new Response(JSON.stringify({ 
      success: true,
      conversation_saved: true,
      crm_registered: crmResult.success,
      lead_id: crmResult.leadId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Send Emma Lead error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
