import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/281Nzx90nVL8424QY4Af/webhook-trigger/b0cb6ef6-244c-4f31-9bf6-a153e246caf1';

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
  };
}

async function sendToGHL(payload: LeadPayload): Promise<boolean> {
  try {
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GHL webhook failed:', response.status, errorText);
      return false;
    }
    
    console.log('✅ GHL webhook sent successfully');
    return true;
  } catch (error) {
    console.error('❌ GHL webhook error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: LeadPayload = await req.json();
    
    console.log('📤 Sending lead to GHL webhook...');
    console.log(`   Name: ${payload.contact_info.first_name} ${payload.contact_info.last_name}`);
    console.log(`   Phone: ${payload.contact_info.country_prefix}${payload.contact_info.phone_number}`);
    console.log(`   Language: ${payload.system_data.detected_language}`);
    console.log(`   Intake Complete: ${payload.system_data.intake_complete}`);
    console.log(`   Declined: ${payload.system_data.declined_selection}`);

    // First attempt
    let success = await sendToGHL(payload);
    
    // Retry once if failed
    if (!success) {
      console.log('⚠️ Webhook failed, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      success = await sendToGHL(payload);
      
      if (!success) {
        console.error('❌ GHL webhook failed after retry');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Webhook failed after retry' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ GHL webhook succeeded on retry');
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
