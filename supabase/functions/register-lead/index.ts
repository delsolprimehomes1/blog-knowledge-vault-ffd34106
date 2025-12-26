import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROXY_BASE_URL = 'http://188.34.164.137:3000';

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message?: string;
  propertyRef?: string;
  source?: string;
}

// Basic email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body: LeadData = await req.json();
    console.log('Registering lead:', { ...body, email: body.email?.substring(0, 3) + '***' });

    // Validate required fields
    if (!body.firstName?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'First name is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!body.lastName?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Last name is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!body.email?.trim() || !isValidEmail(body.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid email is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build lead payload
    const leadPayload = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || '',
      message: body.message?.trim() || '',
      propertyRef: body.propertyRef?.trim() || '',
      source: body.source?.trim() || 'Website Contact Form'
    };

    console.log('Sending to API:', `${PROXY_BASE_URL}/register-lead`);

    const response = await fetch(`${PROXY_BASE_URL}/register-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadPayload)
    });

    const responseText = await response.text();
    console.log('API response status:', response.status);
    console.log('API response:', responseText.substring(0, 200));

    let apiResult;
    try {
      apiResult = JSON.parse(responseText);
    } catch {
      apiResult = { message: responseText };
    }

    if (!response.ok) {
      console.error('Lead registration failed:', apiResult);
      return new Response(JSON.stringify({
        success: false,
        error: apiResult.message || apiResult.error || 'Failed to register lead'
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Lead registered successfully');
    return new Response(JSON.stringify({
      success: true,
      message: 'Lead registered successfully',
      data: apiResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error registering lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to register lead';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
