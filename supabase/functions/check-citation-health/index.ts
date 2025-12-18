import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 25; // Process 25 URLs per run to avoid timeout
const DELAY_MS = 200; // 200ms between requests

interface CitationHealthResult {
  url: string;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable';
  httpStatusCode: number | null;
  responseTimeMs: number;
  redirectUrl: string | null;
  pageTitle: string | null;
  error: string | null;
}

async function checkCitationHealth(url: string): Promise<CitationHealthResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per URL
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DelSolPrimeBot/1.0; +https://www.delsolprimehomes.com)'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    
    // If HEAD fails, try GET (some servers don't support HEAD)
    let pageTitle: string | null = null;
    if (response.status === 405 || response.status === 403) {
      try {
        const getResponse = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DelSolPrimeBot/1.0; +https://www.delsolprimehomes.com)'
          }
        });
        
        if (getResponse.ok) {
          const html = await getResponse.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          pageTitle = titleMatch ? titleMatch[1].trim() : null;
        }
      } catch (e) {
        console.log('GET request failed after HEAD:', e);
      }
    }
    
    const finalUrl = response.url;
    const isRedirected = finalUrl !== url;
    
    let status: CitationHealthResult['status'];
    if (response.status >= 200 && response.status < 300) {
      if (responseTimeMs > 5000) {
        status = 'slow';
      } else if (isRedirected) {
        status = 'redirected';
      } else {
        status = 'healthy';
      }
    } else if (response.status >= 400) {
      status = 'broken';
    } else {
      status = 'unreachable';
    }
    
    return {
      url,
      status,
      httpStatusCode: response.status,
      responseTimeMs,
      redirectUrl: isRedirected ? finalUrl : null,
      pageTitle,
      error: null,
    };
    
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error(`Error checking ${url}:`, error);
    
    return {
      url,
      status: 'unreachable',
      httpStatusCode: null,
      responseTimeMs,
      redirectUrl: null,
      pageTitle: null,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting citation health check (batch mode)...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, check how many unchecked citations exist
    const { count: uncheckedCount } = await supabase
      .from('external_citation_health')
      .select('*', { count: 'exact', head: true })
      .is('status', null);

    console.log(`📊 Total unchecked citations: ${uncheckedCount || 0}`);

    // Fetch batch of unchecked citations from external_citation_health table
    const { data: citations, error: fetchError } = await supabase
      .from('external_citation_health')
      .select('url, source_name')
      .is('status', null)
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!citations || citations.length === 0) {
      console.log('✅ No unchecked citations remaining');
      return new Response(
        JSON.stringify({ 
          success: true, 
          checked: 0, 
          remaining: 0,
          message: 'All citations have been checked' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Processing batch of ${citations.length} citations...`);

    let healthyCount = 0;
    let brokenCount = 0;
    let redirectedCount = 0;
    let slowCount = 0;
    let unreachableCount = 0;

    // Check each URL in the batch
    for (const citation of citations) {
      const healthResult = await checkCitationHealth(citation.url);
      
      // Fetch existing record to get current counter values
      const { data: existingHealth } = await supabase
        .from('external_citation_health')
        .select('times_verified, times_failed')
        .eq('url', healthResult.url)
        .maybeSingle();

      // Calculate new counter values
      const isSuccessful = healthResult.status === 'healthy' || healthResult.status === 'redirected';
      const isFailed = healthResult.status === 'broken' || healthResult.status === 'unreachable';
      
      const newTimesVerified = (existingHealth?.times_verified || 0) + (isSuccessful ? 1 : 0);
      const newTimesFailed = (existingHealth?.times_failed || 0) + (isFailed ? 1 : 0);
      
      // Update the record with health status
      const { error: updateError } = await supabase
        .from('external_citation_health')
        .update({
          last_checked_at: new Date().toISOString(),
          status: healthResult.status,
          http_status_code: healthResult.httpStatusCode,
          response_time_ms: healthResult.responseTimeMs,
          redirect_url: healthResult.redirectUrl,
          page_title: healthResult.pageTitle,
          times_verified: newTimesVerified,
          times_failed: newTimesFailed,
          updated_at: new Date().toISOString(),
        })
        .eq('url', healthResult.url);

      if (updateError) {
        console.error(`Error updating health for ${citation.url}:`, updateError);
      } else {
        console.log(`✓ ${healthResult.status}: ${citation.url}`);
      }

      // Track counts
      switch (healthResult.status) {
        case 'healthy': healthyCount++; break;
        case 'broken': brokenCount++; break;
        case 'unreachable': unreachableCount++; break;
        case 'redirected': redirectedCount++; break;
        case 'slow': slowCount++; break;
      }

      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    const remainingUnchecked = (uncheckedCount || 0) - citations.length;

    console.log('✅ Batch health check complete');
    console.log(`   Checked: ${citations.length}`);
    console.log(`   Healthy: ${healthyCount}`);
    console.log(`   Broken: ${brokenCount}`);
    console.log(`   Unreachable: ${unreachableCount}`);
    console.log(`   Redirected: ${redirectedCount}`);
    console.log(`   Slow: ${slowCount}`);
    console.log(`   Remaining unchecked: ${remainingUnchecked}`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: citations.length,
        healthy: healthyCount,
        broken: brokenCount,
        unreachable: unreachableCount,
        redirected: redirectedCount,
        slow: slowCount,
        remaining: remainingUnchecked,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Citation health check failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
