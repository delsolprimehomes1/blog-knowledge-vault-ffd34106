import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Blocked domains - competitors and low-quality sources
const BLOCKED_DOMAINS = [
  'idealista.com', 'fotocasa.com', 'kyero.com', 'rightmove.co.uk',
  'properstar.com', 'thinkspain.com', 'aplaceinthesun.com', 'spainhouses.net',
  'spanishpropertyinsight.com', 'eyeonspain.com', 'spanishpropertychoice.com',
  'lucasfox.com', 'engel-voelkers.com', 'sothebysrealty.com', 'christiesrealestate.com',
  'inmobiliaria', 'realestate', 'property-for-sale', 'properties-for-sale',
];

function isBlockedDomain(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_DOMAINS.some(blocked => lowerUrl.includes(blocked));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { articleContent, articleTopic, articleLanguage } = await req.json();

    if (!articleContent || !articleTopic) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields: articleContent and articleTopic',
        citations: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    console.log(`[find-citations-fast] Processing: "${articleTopic}" (${articleLanguage})`);

    // Get language name for better prompting
    const languageNames: Record<string, string> = {
      en: 'English', de: 'German', nl: 'Dutch', fr: 'French', es: 'Spanish',
      pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian', fi: 'Finnish', no: 'Norwegian'
    };
    const langName = languageNames[articleLanguage] || articleLanguage;

    // Truncate content to avoid token limits (keep first ~4000 chars)
    const truncatedContent = articleContent.substring(0, 4000);

    // SINGLE Perplexity API call with comprehensive prompt
    const prompt = `Find 3-5 authoritative citations for this ${langName} article about "${articleTopic}".

ARTICLE CONTENT:
${truncatedContent}

CRITICAL REQUIREMENTS:
1. NEVER suggest real estate websites, property portals, or inmobiliarias
2. NEVER suggest competitor real estate agencies
3. ONLY suggest high-authority sources:
   - Government websites (.gov, .gob.es, .gov.uk)
   - Official statistics (INE, Eurostat, national statistics offices)
   - Legal/official sources (BOE, official gazettes)
   - Major international news outlets (Reuters, BBC, El País, etc.)
   - Tourism authorities (Spain.info, regional tourism boards)
   - Academic/research institutions
   - Banking/financial institutions (ECB, Bank of Spain)

4. Citations should support factual claims in the article
5. Prefer sources in ${langName} or English
6. Each citation must have a working, publicly accessible URL

Return a JSON array with 3-5 citations:
[
  {
    "url": "https://example.gov/page",
    "source": "Official Source Name",
    "quote": "A brief relevant quote or description (1-2 sentences)",
    "relevance": 8
  }
]

Only return the JSON array, no other text.`;

    console.log(`[find-citations-fast] Making Perplexity API call...`);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a citation research assistant. Return ONLY valid JSON arrays of citations. Never include real estate or property websites.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[find-citations-fast] Perplexity API error: ${response.status}`, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log(`[find-citations-fast] Raw response length: ${content.length}`);

    // Parse the JSON response
    let citations: any[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        citations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error(`[find-citations-fast] Failed to parse citations:`, parseError);
    }

    // Filter out any blocked domains that slipped through
    const validCitations = citations.filter((c: any) => {
      if (!c.url || typeof c.url !== 'string') return false;
      if (isBlockedDomain(c.url)) {
        console.log(`[find-citations-fast] Blocked: ${c.url}`);
        return false;
      }
      return true;
    });

    // Format citations for storage
    const formattedCitations = validCitations.map((c: any) => ({
      url: c.url,
      source: c.source || new URL(c.url).hostname,
      text: c.quote || c.text || `Source: ${c.source}`,
    }));

    const elapsed = Date.now() - startTime;
    console.log(`[find-citations-fast] Found ${formattedCitations.length} citations in ${elapsed}ms`);

    if (formattedCitations.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No valid citations found for this article',
        citations: [],
        diagnostics: {
          rawCitationsFound: citations.length,
          blockedCount: citations.length - validCitations.length,
          timeElapsed: `${elapsed}ms`
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      citations: formattedCitations,
      diagnostics: {
        citationsFound: formattedCitations.length,
        blockedCount: citations.length - validCitations.length,
        timeElapsed: `${elapsed}ms`
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[find-citations-fast] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Unknown error',
      citations: [],
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
