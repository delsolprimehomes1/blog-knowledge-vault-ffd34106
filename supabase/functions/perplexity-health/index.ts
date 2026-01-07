import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standardized headers for all Perplexity API calls
const PERPLEXITY_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'LovableCitationBot/1.0 (https://delsolprimehomes.com)',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    
    // Check if API key exists (never log the actual key)
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'PERPLEXITY_KEY_MISSING',
          userMessage: 'PERPLEXITY_API_KEY is not configured in environment secrets. Please add it in the Secrets management panel.',
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Make minimal Perplexity API request
    console.log('[perplexity-health] Testing API connection...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        ...PERPLEXITY_HEADERS,
        'Authorization': `Bearer ${perplexityApiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Respond with exactly: OK'
          },
          {
            role: 'user',
            content: 'Health check. Reply with: OK'
          }
        ],
        temperature: 0,
        max_tokens: 10,
      }),
    });

    const latencyMs = Date.now() - startTime;
    const upstreamStatus = response.status;
    const contentType = response.headers.get('content-type') || 'unknown';
    
    // Read response body
    const responseText = await response.text();
    const isHtml = contentType.includes('text/html') || responseText.trim().startsWith('<');
    
    // Sanitize response snippet (never include full response, could have tokens)
    const sanitizedSnippet = responseText.substring(0, 300).replace(/Bearer [^\s"]+/gi, 'Bearer [REDACTED]');

    console.log(`[perplexity-health] Status: ${upstreamStatus}, Content-Type: ${contentType}, IsHTML: ${isHtml}`);

    // Analyze response
    if (response.ok) {
      // Parse JSON response
      try {
        const data = JSON.parse(responseText);
        const content = data.choices?.[0]?.message?.content || '';
        
        return new Response(
          JSON.stringify({
            success: true,
            upstreamStatus,
            contentType,
            latencyMs,
            message: 'Perplexity API is working correctly',
            responsePreview: content.substring(0, 50),
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: 'PERPLEXITY_INVALID_JSON',
            upstreamStatus,
            contentType,
            latencyMs,
            userMessage: 'Perplexity returned success status but invalid JSON. This is unusual.',
            responseSnippet: sanitizedSnippet,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle error responses
    if (isHtml) {
      // WAF/Cloudflare challenge or protection layer
      // Special case: 401 with HTML often means the key is rejected at the gateway level
      if (upstreamStatus === 401) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: 'PERPLEXITY_AUTH_FAILED',
            upstreamStatus,
            contentType,
            latencyMs,
            userMessage: 'Perplexity rejected the API key at the gateway level (401 + HTML response). This usually means:\n\n1. The API key is invalid, expired, or incorrectly copied\n2. Your Perplexity account does not have API access enabled\n3. The key is not associated with an active API subscription/billing\n\n**Action:** Log into https://perplexity.ai/settings/api, verify API access is enabled, and generate a fresh key. Make sure you copy the FULL key.',
            responseSnippet: sanitizedSnippet,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'PERPLEXITY_WAF_BLOCK',
          upstreamStatus,
          contentType,
          latencyMs,
          userMessage: 'Perplexity is blocking requests with a security challenge (HTML response). This may be due to:\n1. IP-based rate limiting\n2. Missing or suspicious request headers\n3. Temporary Perplexity service protection\n\nTry again in a few minutes. If persistent, contact Perplexity support.',
          responseSnippet: sanitizedSnippet,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON error response
    let errorDetails = {};
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = { raw: sanitizedSnippet };
    }

    // Specific error codes
    if (upstreamStatus === 401) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'PERPLEXITY_AUTH_FAILED',
          upstreamStatus,
          contentType,
          latencyMs,
          userMessage: 'Perplexity rejected the API key (401 Unauthorized). Please verify:\n1. The API key is correct and complete\n2. Your Perplexity account has an active API subscription\n3. The key is associated with an API group with billing enabled\n\nGenerate a new key at https://perplexity.ai/settings/api',
          errorDetails,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (upstreamStatus === 402) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'PERPLEXITY_PAYMENT_REQUIRED',
          upstreamStatus,
          contentType,
          latencyMs,
          userMessage: 'Perplexity requires payment (402). Please add billing information or credits to your Perplexity API account.',
          errorDetails,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (upstreamStatus === 429) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'PERPLEXITY_RATE_LIMIT',
          upstreamStatus,
          contentType,
          latencyMs,
          userMessage: 'Perplexity rate limit exceeded (429). Wait a few minutes before trying again, or upgrade your API plan for higher limits.',
          errorDetails,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({
        success: false,
        error_code: 'PERPLEXITY_API_ERROR',
        upstreamStatus,
        contentType,
        latencyMs,
        userMessage: `Perplexity returned an error (HTTP ${upstreamStatus}). Check the error details for more information.`,
        errorDetails,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[perplexity-health] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error_code: 'PERPLEXITY_NETWORK_ERROR',
        latencyMs: Date.now() - startTime,
        userMessage: `Network error connecting to Perplexity: ${error instanceof Error ? error.message : 'Unknown error'}. Check your internet connection and try again.`,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
