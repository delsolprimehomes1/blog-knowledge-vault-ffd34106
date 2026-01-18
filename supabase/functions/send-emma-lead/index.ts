import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/281Nzx90nVL8424QY4Af/webhook-trigger/24889977-0bac-4537-8fbd-c0a704af2533';

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
}

async function sendToGHL(payload: LeadPayload): Promise<{ success: boolean; error?: string }> {
  // Build flattened GHL payload with ALL 24 fields
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
    detected_language: payload.system_data?.detected_language || 'English',
    intake_complete: payload.system_data?.intake_complete || false,
    declined_selection: payload.system_data?.declined_selection || false,
    conversation_date: payload.system_data?.conversation_date || new Date().toISOString(),
    conversation_status: payload.system_data?.conversation_status || 'unknown',
    exit_point: payload.system_data?.exit_point || 'unknown'
  };

  console.log('📤 Flattened GHL payload (24 fields):', JSON.stringify(ghlPayload, null, 2));

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
    
    console.log('✅ GHL webhook sent successfully with 24 fields');
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
  payload: any,
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
      updated_at: new Date().toISOString()
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
    
    console.log('📤 Sending lead to GHL webhook...');
    console.log(`   Conversation ID: ${conversationId || 'N/A'}`);
    console.log(`   Name: ${payload.contact_info.first_name} ${payload.contact_info.last_name}`);
    console.log(`   Phone: ${payload.contact_info.country_prefix}${payload.contact_info.phone_number}`);
    console.log(`   Language: ${payload.system_data.detected_language}`);
    console.log(`   Intake Complete: ${payload.system_data.intake_complete}`);
    console.log(`   Declined: ${payload.system_data.declined_selection}`);

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
