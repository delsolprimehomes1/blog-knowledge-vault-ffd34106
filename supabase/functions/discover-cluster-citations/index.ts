import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// COMPETITOR BLOCKING - Comprehensive list
// ============================================================================
const BLOCKED_DOMAINS = [
  // Major Spanish portals
  'idealista.com', 'fotocasa.com', 'kyero.com', 'pisos.com', 'habitaclia.com',
  'milanuncios.com', 'yaencontre.com', 'tucasa.com', 'enalquiler.com',
  
  // International portals
  'rightmove.co.uk', 'zoopla.co.uk', 'onthemarket.com', 'primelocation.com',
  'properstar.com', 'immowelt.de', 'immobilienscout24.de', 'funda.nl',
  'hemnet.se', 'boligsiden.dk', 'finn.no', 'etuovi.com', 'ingatlan.com',
  
  // UK-focused Spain portals
  'thinkspain.com', 'aplaceinthesun.com', 'spainhouses.net', 'eyeonspain.com',
  'spanishpropertyinsight.com', 'spanishpropertychoice.com',
  
  // Luxury agencies
  'lucasfox.com', 'engel-voelkers.com', 'sothebysrealty.com', 'christiesrealestate.com',
  'savills.com', 'knightfrank.com', 'drumelia.com', 'mpdunne.com',
  'pure-living-properties.com', 'nvoga.com',
];

const BLOCKED_KEYWORDS = [
  'realestate', 'real-estate', 'realtor', 'property', 'properties', 'homes',
  'villas', 'apartments', 'condos', 'listing', 'listings', 'forsale', 'for-sale',
  'inmobiliaria', 'inmueble', 'inmuebles', 'pisos', 'casas', 'viviendas',
  'makelaar', 'vastgoed', 'woningen', 'huizen', 'immobilien', 'makler',
];

// ============================================================================
// LANGUAGE-SPECIFIC DOMAIN PREFERENCES
// ============================================================================
const LANG_DOMAIN_PREFERENCES: Record<string, string[]> = {
  en: ['.gov', '.gov.uk', '.edu', 'ine.es', 'boe.es', 'reuters.com', 'bbc.com'],
  es: ['.gob.es', '.gov', 'ine.es', 'boe.es', 'elpais.com', 'elmundo.es'],
  de: ['.gov.de', 'destatis.de', 'dw.com', 'spiegel.de'],
  nl: ['.gov.nl', 'cbs.nl', 'nos.nl'],
  fr: ['.gouv.fr', 'insee.fr', 'lemonde.fr'],
  sv: ['.gov.se', 'scb.se', 'svt.se'],
  da: ['.gov.dk', 'dst.dk', 'dr.dk'],
  no: ['.gov.no', 'ssb.no', 'nrk.no'],
  fi: ['.gov.fi', 'stat.fi', 'yle.fi'],
  hu: ['.gov.hu', 'ksh.hu'],
  pl: ['.gov.pl', 'stat.gov.pl'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  } catch {
    return '';
  }
}

function isBlockedDomain(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  if (BLOCKED_DOMAINS.some(d => lowerUrl.includes(d))) return true;
  if (BLOCKED_KEYWORDS.some(k => lowerUrl.includes(k))) return true;
  return false;
}

async function checkApprovedDomains(supabase: any, domain: string, language: string): Promise<{ approved: boolean; tier?: string; trustScore?: number }> {
  try {
    const { data } = await supabase
      .from('approved_domains')
      .select('tier, trust_score, is_allowed, is_international, language')
      .eq('domain', domain)
      .eq('is_allowed', true)
      .maybeSingle();
    
    if (data) {
      // Check language compatibility
      if (data.is_international || data.language === language || !data.language) {
        return { approved: true, tier: data.tier, trustScore: data.trust_score };
      }
    }
    return { approved: false };
  } catch {
    return { approved: false };
  }
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 403;
  } catch {
    return false;
  }
}

// ============================================================================
// PERPLEXITY API CALL
// ============================================================================
async function findCitationsForArticle(
  perplexityKey: string,
  headline: string,
  content: string,
  language: string
): Promise<Array<{ url: string; source: string; context: string; relevance: number }>> {
  const languageNames: Record<string, string> = {
    en: 'English', de: 'German', nl: 'Dutch', fr: 'French', es: 'Spanish',
    pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian', fi: 'Finnish', no: 'Norwegian'
  };
  const langName = languageNames[language] || 'English';
  const domainPrefs = LANG_DOMAIN_PREFERENCES[language] || LANG_DOMAIN_PREFERENCES['en'];

  const prompt = `Find 4-6 authoritative citations for this ${langName} article about Costa del Sol real estate.

ARTICLE HEADLINE: "${headline}"

ARTICLE EXCERPT:
${content.substring(0, 3000)}

CRITICAL REQUIREMENTS:
1. NEVER include real estate websites, property portals, or inmobiliarias
2. NEVER include competitor real estate agencies (Kyero, Idealista, Fotocasa, etc.)
3. ONLY include high-authority sources:
   - Government websites (${domainPrefs.slice(0, 3).join(', ')})
   - Official statistics (INE, Eurostat, national statistics offices)
   - Major news outlets (Reuters, BBC, El País, Bloomberg, etc.)
   - Tourism authorities (Spain.info, regional tourism boards)
   - Banking/financial institutions (ECB, Bank of Spain)
   - Academic institutions

4. For each citation, identify the best sentence in the article where it could be inserted
5. Each URL must be publicly accessible and working

Return a JSON array with 4-6 citations:
[{
  "url": "https://example.gov/page",
  "source": "Official Source Name",
  "context": "The specific claim or sentence this citation supports",
  "relevance": 8
}]

Only return the JSON array, no other text.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a citation research assistant. Return ONLY valid JSON arrays of citations. NEVER include real estate websites.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const content_response = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content_response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Perplexity error:', e);
  }
  return [];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { cluster_id, max_articles } = await req.json();

    if (!cluster_id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing cluster_id'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[discover-cluster-citations] Starting for cluster: ${cluster_id}`);

    // Fetch articles in the cluster
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, language, external_citations')
      .eq('cluster_id', cluster_id)
      .order('language', { ascending: true });

    if (fetchError) throw fetchError;

    const articleLimit = max_articles || articles.length;
    const articlesToProcess = articles.slice(0, articleLimit);

    console.log(`[discover-cluster-citations] Processing ${articlesToProcess.length} articles`);

    const results: Array<{
      articleId: string;
      headline: string;
      language: string;
      existingCitations: number;
      discoveredCitations: Array<{ url: string; source: string; context: string; verified: boolean; approved: boolean }>;
      error?: string;
    }> = [];

    let totalDiscovered = 0;
    let totalVerified = 0;
    let totalApproved = 0;

    // Process articles in batches of 3
    for (let i = 0; i < articlesToProcess.length; i += 3) {
      const batch = articlesToProcess.slice(i, i + 3);
      
      const batchPromises = batch.map(async (article) => {
        const existingCitations = (article.external_citations as any[]) || [];
        
        try {
          // Find citations via Perplexity
          const rawCitations = await findCitationsForArticle(
            PERPLEXITY_API_KEY,
            article.headline,
            article.detailed_content,
            article.language
          );

          console.log(`[discover-cluster-citations] Found ${rawCitations.length} raw citations for: ${article.headline.substring(0, 50)}...`);

          // Validate each citation
          const validatedCitations: Array<{ url: string; source: string; context: string; verified: boolean; approved: boolean }> = [];

          for (const citation of rawCitations) {
            if (!citation.url) continue;

            // Check if blocked
            if (isBlockedDomain(citation.url)) {
              console.log(`[discover-cluster-citations] Blocked competitor: ${citation.url}`);
              continue;
            }

            // Check if already exists
            if (existingCitations.some((c: any) => c.url === citation.url)) {
              console.log(`[discover-cluster-citations] Already exists: ${citation.url}`);
              continue;
            }

            // Check approved domains
            const domain = extractDomain(citation.url);
            const approvalCheck = await checkApprovedDomains(supabase, domain, article.language);

            // Verify URL accessibility
            const verified = await verifyUrl(citation.url);

            validatedCitations.push({
              url: citation.url,
              source: citation.source,
              context: citation.context,
              verified,
              approved: approvalCheck.approved,
            });

            if (verified) totalVerified++;
            if (approvalCheck.approved) totalApproved++;
          }

          totalDiscovered += validatedCitations.length;

          return {
            articleId: article.id,
            headline: article.headline,
            language: article.language,
            existingCitations: existingCitations.length,
            discoveredCitations: validatedCitations,
          };
        } catch (e: any) {
          console.error(`[discover-cluster-citations] Error for article ${article.id}:`, e);
          return {
            articleId: article.id,
            headline: article.headline,
            language: article.language,
            existingCitations: existingCitations.length,
            discoveredCitations: [],
            error: e.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + 3 < articlesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[discover-cluster-citations] Complete. Found ${totalDiscovered} citations, ${totalVerified} verified, ${totalApproved} approved. Duration: ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      clusterId: cluster_id,
      articlesProcessed: results.length,
      totalDiscovered,
      totalVerified,
      totalApproved,
      duration,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[discover-cluster-citations] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Unknown error',
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
