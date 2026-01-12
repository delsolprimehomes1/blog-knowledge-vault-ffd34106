import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/281Nzx90nVL8424QY4Af/webhook-trigger/9d43a68c-fd67-4371-8ebb-81cbb47df3e6';
const MAX_RETRY_ATTEMPTS = 5;

interface EmmaLead {
  id: string;
  conversation_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  country_prefix: string | null;
  question_1: string | null;
  answer_1: string | null;
  question_2: string | null;
  answer_2: string | null;
  question_3: string | null;
  answer_3: string | null;
  questions_answered: number;
  location_preference: string[] | null;
  sea_view_importance: string | null;
  budget_range: string | null;
  bedrooms_desired: string | null;
  property_type: string[] | null;
  property_purpose: string | null;
  timeframe: string | null;
  detected_language: string;
  intake_complete: boolean;
  declined_selection: boolean;
  conversation_date: string;
  conversation_status: string;
  exit_point: string;
  webhook_sent: boolean;
  webhook_attempts: number;
  webhook_last_error: string | null;
}

async function sendLeadToGHL(lead: EmmaLead): Promise<{ success: boolean; error?: string }> {
  const ghlPayload = {
    // Contact Information (4 fields)
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    phone_number: lead.phone_number || '',
    country_prefix: lead.country_prefix || '',
    
    // Content Phase Q&A (7 fields)
    question_1: lead.question_1 || '',
    answer_1: lead.answer_1 || '',
    question_2: lead.question_2 || '',
    answer_2: lead.answer_2 || '',
    question_3: lead.question_3 || '',
    answer_3: lead.answer_3 || '',
    questions_answered: lead.questions_answered || 0,
    
    // Property Criteria (7 fields)
    location_preference: JSON.stringify(lead.location_preference || []),
    sea_view_importance: lead.sea_view_importance || '',
    budget_range: lead.budget_range || '',
    bedrooms_desired: lead.bedrooms_desired || '',
    property_type: JSON.stringify(lead.property_type || []),
    property_purpose: lead.property_purpose || '',
    timeframe: lead.timeframe || '',
    
    // System Data (6 fields)
    detected_language: lead.detected_language || 'EN',
    intake_complete: lead.intake_complete || false,
    declined_selection: lead.declined_selection || false,
    conversation_date: lead.conversation_date || new Date().toISOString(),
    conversation_status: lead.conversation_status || 'unknown',
    exit_point: lead.exit_point || 'unknown'
  };

  try {
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ghlPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 RETRY WEBHOOKS: Starting retry job...');

    // Find leads that need webhook retry
    const { data: pendingLeads, error: fetchError } = await supabase
      .from('emma_leads')
      .select('*')
      .eq('webhook_sent', false)
      .lt('webhook_attempts', MAX_RETRY_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching pending leads:', fetchError);
      throw fetchError;
    }

    if (!pendingLeads || pendingLeads.length === 0) {
      console.log('✅ RETRY WEBHOOKS: No pending webhooks to retry');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending webhooks',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 RETRY WEBHOOKS: Found ${pendingLeads.length} leads to retry`);

    let successCount = 0;
    let failCount = 0;

    for (const lead of pendingLeads as EmmaLead[]) {
      console.log(`🔄 Retrying webhook for: ${lead.first_name} ${lead.last_name} (${lead.conversation_id})`);
      console.log(`   Attempt: ${lead.webhook_attempts + 1}/${MAX_RETRY_ATTEMPTS}`);

      const result = await sendLeadToGHL(lead);

      const updateData: Record<string, any> = {
        webhook_attempts: lead.webhook_attempts + 1,
        updated_at: new Date().toISOString()
      };

      if (result.success) {
        updateData.webhook_sent = true;
        updateData.webhook_sent_at = new Date().toISOString();
        updateData.webhook_last_error = null;
        successCount++;
        console.log(`✅ Webhook succeeded for ${lead.conversation_id}`);
      } else {
        updateData.webhook_last_error = result.error;
        failCount++;
        console.log(`❌ Webhook failed for ${lead.conversation_id}: ${result.error}`);
      }

      await supabase
        .from('emma_leads')
        .update(updateData)
        .eq('id', lead.id);

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`📊 RETRY WEBHOOKS: Complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      processed: pendingLeads.length,
      succeeded: successCount,
      failed: failCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Retry Emma Webhooks error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
