import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow'
];

const BASE_URL = 'https://www.delsolprimehomes.com';
const API_KEY = Deno.env.get('INDEXNOW_API_KEY') || '8f3a2c1d4e5b6f7a8c9d0e1f2a3b4c5d';
const KEY_LOCATION = `${BASE_URL}/indexnow-key.txt`;

interface IndexNowRequest {
  urls?: string[];
  table?: string;
  slug?: string;
  action?: string;
}

interface IndexNowResult {
  endpoint: string;
  status: number;
  success: boolean;
  error?: string;
}

async function submitToIndexNow(
  urls: string[],
  apiKey: string
): Promise<IndexNowResult[]> {
  const results: IndexNowResult[] = [];
  
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const body = {
        host: 'www.delsolprimehomes.com',
        key: apiKey,
        keyLocation: KEY_LOCATION,
        urlList: urls
      };
      
      console.log(`Submitting ${urls.length} URLs to ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      results.push({
        endpoint,
        status: response.status,
        success: response.status === 200 || response.status === 202
      });
      
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`Error submitting to ${endpoint}:`, error);
      results.push({
        endpoint,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

function buildUrlsFromContent(table: string, slug: string): string[] {
  const urls: string[] = [];
  const languages = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
  
  // Build URL based on content type
  switch (table) {
    case 'blog_articles':
      // Primary URL (English as default)
      urls.push(`${BASE_URL}/en/blog/${slug}`);
      // Add language-prefixed versions
      languages.forEach(lang => {
        if (lang !== 'en') {
          urls.push(`${BASE_URL}/${lang}/blog/${slug}`);
        }
      });
      break;
    
    case 'qa_pages':
      urls.push(`${BASE_URL}/en/qa/${slug}`);
      languages.forEach(lang => {
        if (lang !== 'en') {
          urls.push(`${BASE_URL}/${lang}/qa/${slug}`);
        }
      });
      break;
    
    case 'location_pages':
      urls.push(`${BASE_URL}/en/locations/${slug}`);
      languages.forEach(lang => {
        if (lang !== 'en') {
          urls.push(`${BASE_URL}/${lang}/locations/${slug}`);
        }
      });
      break;
    
    case 'comparison_pages':
      urls.push(`${BASE_URL}/en/compare/${slug}`);
      languages.forEach(lang => {
        if (lang !== 'en') {
          urls.push(`${BASE_URL}/${lang}/compare/${slug}`);
        }
      });
      break;
    
    default:
      urls.push(`${BASE_URL}/${slug}`);
  }
  
  return urls;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the API key from env or fallback
    const apiKey = API_KEY;
    
    if (!apiKey) {
      console.warn('INDEXNOW_API_KEY not configured - skipping IndexNow submission');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'IndexNow API key not configured',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: IndexNowRequest = await req.json();
    let urlsToSubmit: string[] = [];

    // Handle direct URL submission
    if (body.urls && body.urls.length > 0) {
      urlsToSubmit = body.urls;
      console.log(`Received ${urlsToSubmit.length} URLs for direct submission`);
    }
    // Handle table/slug trigger (from database triggers)
    else if (body.table && body.slug) {
      urlsToSubmit = buildUrlsFromContent(body.table, body.slug);
      console.log(`Built ${urlsToSubmit.length} URLs from ${body.table}/${body.slug} (action: ${body.action || 'unknown'})`);
    }
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: urls OR (table + slug)' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Limit to 10,000 URLs per request (IndexNow limit)
    if (urlsToSubmit.length > 10000) {
      urlsToSubmit = urlsToSubmit.slice(0, 10000);
      console.warn('Truncated URL list to 10,000 (IndexNow limit)');
    }

    // Submit to IndexNow endpoints
    const results = await submitToIndexNow(urlsToSubmit, apiKey);
    
    const successCount = results.filter(r => r.success).length;
    const overallSuccess = successCount > 0;

    // Log results
    console.log(`IndexNow submission complete: ${successCount}/${results.length} endpoints successful`);
    results.forEach(r => {
      console.log(`  ${r.endpoint}: ${r.success ? '✓' : '✗'} (${r.status})${r.error ? ` - ${r.error}` : ''}`);
    });

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        message: overallSuccess 
          ? `Submitted ${urlsToSubmit.length} URLs to ${successCount} search engines`
          : 'Failed to submit to any search engine',
        urlCount: urlsToSubmit.length,
        results,
        submittedUrls: urlsToSubmit.slice(0, 10) // Return first 10 for reference
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('IndexNow error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
