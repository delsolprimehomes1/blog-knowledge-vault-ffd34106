import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD for faster checks
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
          signal: AbortSignal.timeout(15000),
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

async function findBetterCitation(originalUrl: string, context: string): Promise<{
  replacementUrl: string;
  replacementSource: string;
  reason: string;
  confidenceScore: number;
} | null> {
  const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!perplexityKey) {
    console.log('⚠️ PERPLEXITY_API_KEY not set, skipping replacement suggestion');
    return null;
  }
  
  try {
    const prompt = `The following citation URL is broken or inaccessible: ${originalUrl}

Context where it was used: ${context}

Please find a reliable alternative source that covers the same topic. Provide:
1. A working URL to a credible source
2. The name of the source
3. Brief reason why this is a good replacement
4. Confidence score (0-100) that this replacement is relevant

Prefer: government sources (.gov), educational institutions (.edu), established news organizations, industry authorities.

Respond in JSON format:
{
  "url": "https://...",
  "source": "Source Name",
  "reason": "Brief explanation",
  "confidence": 85
}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a citation research assistant. Find high-quality replacement sources for broken citations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      console.error('Perplexity API error:', await response.text());
      return null;
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const suggestion = JSON.parse(jsonMatch[0]);
    
    return {
      replacementUrl: suggestion.url,
      replacementSource: suggestion.source,
      reason: suggestion.reason,
      confidenceScore: suggestion.confidence,
    };
    
  } catch (error) {
    console.error('Error finding replacement citation:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting citation health check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all unique citations from tracking table
    const { data: citations, error: fetchError } = await supabase
      .from('citation_usage_tracking')
      .select('citation_url, citation_source, anchor_text, article_id')
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    if (!citations || citations.length === 0) {
      console.log('No citations to check');
      return new Response(
        JSON.stringify({ success: true, checked: 0, message: 'No citations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Checking ${citations.length} citations...`);

    // Get unique URLs
    const uniqueUrls = [...new Set(citations.map(c => c.citation_url))];
    
    let healthyCount = 0;
    let brokenCount = 0;
    let redirectedCount = 0;
    let slowCount = 0;

    // Check each URL (with rate limiting)
    for (const url of uniqueUrls) {
      const healthResult = await checkCitationHealth(url);
      
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
      
      // Update external_citation_health table
      const { error: upsertError } = await supabase
        .from('external_citation_health')
        .upsert({
          url: healthResult.url,
          source_name: citations.find(c => c.citation_url === url)?.citation_source || 'Unknown',
          last_checked_at: new Date().toISOString(),
          status: healthResult.status,
          http_status_code: healthResult.httpStatusCode,
          response_time_ms: healthResult.responseTimeMs,
          redirect_url: healthResult.redirectUrl,
          page_title: healthResult.pageTitle,
          times_verified: newTimesVerified,
          times_failed: newTimesFailed,
        }, {
          onConflict: 'url'
        });

      if (upsertError) {
        console.error(`Error updating health for ${url}:`, upsertError);
      }

      // Track counts
      switch (healthResult.status) {
        case 'healthy': healthyCount++; break;
        case 'broken': 
        case 'unreachable': 
          brokenCount++; 
          
          // Find replacement suggestion for broken links
          const citationContext = citations.find(c => c.citation_url === url)?.anchor_text || '';
          const replacement = await findBetterCitation(url, citationContext);
          
          if (replacement) {
            console.log(`💡 Found replacement for ${url}`);
            
            await supabase.from('dead_link_replacements').upsert({
              original_url: url,
              original_source: citations.find(c => c.citation_url === url)?.citation_source || 'Unknown',
              replacement_url: replacement.replacementUrl,
              replacement_source: replacement.replacementSource,
              replacement_reason: replacement.reason,
              confidence_score: replacement.confidenceScore,
              suggested_by: 'automated-health-check',
              status: 'pending',
            }, {
              onConflict: 'original_url'
            });
          }
          break;
        case 'redirected': redirectedCount++; break;
        case 'slow': slowCount++; break;
      }

      // Rate limiting: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('✅ Citation health check complete');
    console.log(`   Healthy: ${healthyCount}`);
    console.log(`   Broken: ${brokenCount}`);
    console.log(`   Redirected: ${redirectedCount}`);
    console.log(`   Slow: ${slowCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: uniqueUrls.length,
        healthy: healthyCount,
        broken: brokenCount,
        redirected: redirectedCount,
        slow: slowCount,
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
