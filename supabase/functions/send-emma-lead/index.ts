import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/281Nzx90nVL8424QY4Af/webhook-trigger/4549e52b-32b2-4fc6-ab3c-8e7fe895433a';

interface LeadPayload {
  conversation_id?: string;
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
    property_type: string[];
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
  // NEW: Page context for complete tracking
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
}

async function sendToGHL(payload: LeadPayload): Promise<{ success: boolean; error?: string }> {
  // Build flattened GHL payload with ALL 34 fields
  const ghlPayload = {
    // Contact Information (4 fields)
    first_name: payload.contact_info?.first_name || '',
    last_name: payload.contact_info?.last_name || '',
    phone_number: payload.contact_info?.phone_number || '',
    country_prefix: payload.contact_info?.country_prefix || '',
    
    // Content Phase Q&A (7 fields)
    question_1: payload.content_phase?.question_1 || '',
    answer_1: payload.content_phase?.answer_1 || '',
    question_2: payload.content_phase?.question_2 || '',
    answer_2: payload.content_phase?.answer_2 || '',
    question_3: payload.content_phase?.question_3 || '',
    answer_3: payload.content_phase?.answer_3 || '',
    questions_answered: payload.content_phase?.questions_answered || 0,
    
    // Property Criteria (7 fields)
    location_preference: JSON.stringify(payload.property_criteria?.location_preference || []),
    sea_view_importance: payload.property_criteria?.sea_view_importance || '',
    budget_range: payload.property_criteria?.budget_range || '',
    bedrooms_desired: payload.property_criteria?.bedrooms_desired || '',
    property_type: JSON.stringify(payload.property_criteria?.property_type || []),
    property_purpose: payload.property_criteria?.property_purpose || '',
    timeframe: payload.property_criteria?.timeframe || '',
    
    // System Data (6 fields)
    detected_language: payload.system_data?.detected_language || 'EN',
    intake_complete: payload.system_data?.intake_complete || false,
    declined_selection: payload.system_data?.declined_selection || false,
    conversation_date: payload.system_data?.conversation_date || new Date().toISOString(),
    conversation_status: payload.system_data?.conversation_status || 'unknown',
    exit_point: payload.system_data?.exit_point || 'unknown',
    
    // Page Context (10 NEW fields)
    page_type: payload.page_context?.page_type || '',
    page_url: payload.page_context?.page_url || '',
    page_title: payload.page_context?.page_title || '',
    referrer: payload.page_context?.referrer || 'Direct',
    language: payload.page_context?.language || 'en',
    lead_source: payload.page_context?.lead_source || 'Emma Chatbot',
    lead_source_detail: payload.page_context?.lead_source_detail || '',
    lead_segment: payload.page_context?.lead_segment || '',
    initial_lead_score: payload.page_context?.initial_lead_score || 15,
    conversation_duration: payload.page_context?.conversation_duration || ''
  };

  console.log('📤 Flattened GHL payload (34 fields):', JSON.stringify(ghlPayload, null, 2));

  try {
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ghlPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GHL webhook failed:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    console.log('✅ GHL webhook sent successfully with 34 fields');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ GHL webhook error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function updateLeadWebhookStatus(
  supabase: any,
  conversationId: string,
  success: boolean,
  payload: LeadPayload,
  errorMessage?: string
) {
  if (!conversationId) {
    console.log('⚠️ No conversation_id provided, skipping lead tracking update');
    return;
  }

  try {
    // First, try to get existing record to increment attempts
    const { data: existing } = await supabase
      .from('emma_leads')
      .select('webhook_attempts')
      .eq('conversation_id', conversationId)
      .single();

    const currentAttempts = existing?.webhook_attempts || 0;

    const updateData: Record<string, any> = {
      webhook_attempts: currentAttempts + 1,
      webhook_payload: payload,
      updated_at: new Date().toISOString(),
      // NEW: Store page context in emma_leads table
      page_type: payload.page_context?.page_type || null,
      page_url: payload.page_context?.page_url || null,
      page_title: payload.page_context?.page_title || null,
      referrer: payload.page_context?.referrer || 'Direct',
      lead_source: payload.page_context?.lead_source || 'Emma Chatbot',
      lead_source_detail: payload.page_context?.lead_source_detail || null,
      lead_segment: payload.page_context?.lead_segment || null,
      initial_lead_score: payload.page_context?.initial_lead_score || 15,
      conversation_duration: payload.page_context?.conversation_duration || null
    };

    if (success) {
      updateData.webhook_sent = true;
      updateData.webhook_sent_at = new Date().toISOString();
      updateData.webhook_last_error = null;
    } else {
      updateData.webhook_last_error = errorMessage || 'Unknown error';
    }

    const { error } = await supabase
      .from('emma_leads')
      .update(updateData)
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('❌ Failed to update lead webhook status:', error);
    } else {
      console.log(`✅ Lead webhook status updated: ${conversationId}, success=${success}, attempts=${currentAttempts + 1}`);
    }
  } catch (error) {
    console.error('❌ Error updating lead webhook status:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Initialize Supabase client for tracking
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload: LeadPayload = await req.json();
    const conversationId = payload.conversation_id;
    
    console.log('📤 Sending lead to GHL webhook (UNIFIED - 34 fields)...');
    console.log(`   Conversation ID: ${conversationId || 'N/A'}`);
    console.log(`   Name: ${payload.contact_info.first_name} ${payload.contact_info.last_name}`);
    console.log(`   Phone: ${payload.contact_info.country_prefix}${payload.contact_info.phone_number}`);
    console.log(`   Language: ${payload.system_data.detected_language}`);
    console.log(`   Intake Complete: ${payload.system_data.intake_complete}`);
    console.log(`   Page Type: ${payload.page_context?.page_type || 'N/A'}`);
    console.log(`   Lead Source: ${payload.page_context?.lead_source || 'Emma Chatbot'}`);
    console.log(`   Lead Segment: ${payload.page_context?.lead_segment || 'N/A'}`);

    // First attempt
    let result = await sendToGHL(payload);
    
    // Retry once if failed
    if (!result.success) {
      console.log('⚠️ Webhook failed, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await sendToGHL(payload);
      
      if (!result.success) {
        console.error('❌ GHL webhook failed after retry');
        
        // Update lead tracking with failure
        await updateLeadWebhookStatus(supabase, conversationId || '', false, payload, result.error);
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error || 'Webhook failed after retry',
          will_retry: true
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ GHL webhook succeeded on retry');
    }

    // Update lead tracking with success
    await updateLeadWebhookStatus(supabase, conversationId || '', true, payload);

    // 🆕 REGISTER IN CRM FOR ROUND ROBIN ROUTING
    // This ensures Emma leads go through the same routing as form leads
    try {
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
        
        // Emma-specific fields
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

      console.log('📤 Registering Emma lead in CRM for round robin:', crmPayload.firstName, crmPayload.lastName);

      const crmResponse = await fetch(`${supabaseUrl}/functions/v1/register-crm-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(crmPayload),
      });

      if (crmResponse.ok) {
        const crmResult = await crmResponse.json();
        console.log('✅ Emma lead registered in CRM:', crmResult.lead_id || 'success');
      } else {
        const crmError = await crmResponse.text();
        console.error('⚠️ CRM registration failed (non-blocking):', crmError);
      }
    } catch (crmError) {
      // Non-blocking: Don't fail the GHL webhook if CRM registration fails
      console.error('⚠️ CRM registration error (non-blocking):', crmError);
    }

    return new Response(JSON.stringify({ success: true }), {
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
