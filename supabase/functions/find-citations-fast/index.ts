import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// COMPREHENSIVE COMPETITOR BLOCKING - 3 LAYERS
// ============================================================================

// Layer 1: Hardcoded competitor domains
const BLOCKED_DOMAINS = [
  // Major Spanish portals
  'idealista.com', 'fotocasa.com', 'kyero.com', 'pisos.com', 'habitaclia.com',
  'milanuncios.com', 'yaencontre.com', 'tucasa.com', 'enalquiler.com',
  
  // International portals
  'rightmove.co.uk', 'zoopla.co.uk', 'onthemarket.com', 'primelocation.com',
  'properstar.com', 'immowelt.de', 'immobilienscout24.de', 'funda.nl',
  'jaap.nl', 'pararius.nl', 'seloger.com', 'leboncoin.fr', 'hemnet.se',
  'boligsiden.dk', 'finn.no', 'etuovi.com', 'oikotie.fi', 'ingatlan.com',
  
  // UK-focused Spain portals
  'thinkspain.com', 'aplaceinthesun.com', 'spainhouses.net', 'eyeonspain.com',
  'spanishpropertyinsight.com', 'spanishpropertychoice.com', 'vitaloca.com',
  'costablancapropertyguide.com', 'costadelsol4u.com', 'absolutelyspain.com',
  
  // Luxury/international agencies
  'lucasfox.com', 'engel-voelkers.com', 'sothebysrealty.com', 'christiesrealestate.com',
  'savills.com', 'knightfrank.com', 'jll.com', 'cbre.com', 'cushmanwakefield.com',
  
  // Costa del Sol specific
  'drumelia.com', 'mpdunne.com', 'panorama.com', 'kristinadeck.com',
  'startgroup.es', 'pure-living-properties.com', 'lifepropertymarbella.com',
  'nvoga.com', 'housing-marbella.com', 'inmobiliaria-marbella.com',
  
  // Developer sites
  'taylor-wimpey.es', 'aedas.com', 'kronos-homes.com', 'metrovacesa.com',
  
  // Aggregators
  'spotahome.com', 'nestpick.com', 'housinganyhere.com', 'badi.com',
  
  // Malaga-specific competitors
  'movetomalagaspain.com', 'movetomalaga.com', 'propertyfindermalaga.com',
];

// Layer 2: Blocked keywords in domains/URLs
const BLOCKED_KEYWORDS = [
  // English
  'realestate', 'real-estate', 'realtor', 'property', 'properties', 'homes',
  'villas', 'apartments', 'condos', 'listing', 'listings', 'forsale', 'for-sale',
  'broker', 'brokerage', 'estate-agent', 'estateagent', 'lettings', 'rentals',
  
  // Spanish
  'inmobiliaria', 'inmueble', 'inmuebles', 'pisos', 'casas', 'viviendas',
  'alquiler', 'venta', 'comprar', 'alquilar', 'chalet', 'atico',
  
  // Dutch
  'makelaar', 'makelaars', 'vastgoed', 'woningen', 'huizen', 'woning',
  'huurwoning', 'koopwoning', 'appartementen',
  
  // German
  'immobilien', 'makler', 'wohnung', 'wohnungen', 'haus', 'hauser',
  'mietwohnung', 'eigentumswohnung',
  
  // French
  'immobilier', 'agence-immobiliere', 'appartement', 'maison', 'location',
  
  // General patterns
  'mls', 'propertyfor', 'housesfor', 'homesfor', 'villasfor',
];

// Layer 3: Blocked path patterns
const BLOCKED_PATH_PATTERNS = [
  '/property/', '/properties/', '/listing/', '/listings/',
  '/for-sale/', '/for-rent/', '/buy/', '/rent/',
  '/inmueble/', '/inmuebles/', '/vivienda/', '/viviendas/',
  '/woningen/', '/huizen/', '/wohnung/', '/wohnungen/',
];

// ============================================================================
// AUTHORITY DOMAINS - Always acceptable regardless of TLD
// ============================================================================
const AUTHORITY_DOMAINS = [
  // International organizations
  'who.int', 'un.org', 'oecd.org', 'imf.org', 'worldbank.org',
  'europa.eu', 'eurostat.ec.europa.eu', 'ec.europa.eu', 'eea.europa.eu',
  'weforum.org', 'wto.org', 'unesco.org', 'unicef.org',
  
  // Research & data
  'statista.com', 'ourworldindata.org', 'data.worldbank.org',
  
  // Major news (always acceptable)
  'reuters.com', 'bbc.com', 'bbc.co.uk', 'theguardian.com', 'nytimes.com',
  'washingtonpost.com', 'ft.com', 'economist.com', 'bloomberg.com',
  'forbes.com', 'cnn.com', 'politico.eu', 'euronews.com',
  
  // Spanish news
  'elpais.com', 'elmundo.es', 'abc.es', 'lavanguardia.com', 'expansion.com',
  
  // Tourism authorities
  'spain.info', 'andalucia.org', 'visitcostadelsol.com',
];

// Government TLD patterns
const GOVERNMENT_PATTERNS = [
  '.gov', '.gob', '.gouv', '.gov.uk', '.gov.es',
  'ine.es', 'insee.fr', 'destatis.de', 'scb.se', 'ssb.no', 'dst.dk',
  'ksh.hu', 'cbs.nl', 'stat.fi', 'boe.es', 'seg-social.es',
  'juntadeandalucia.es', 'malagaturismo.com',
];

// ============================================================================
// LANGUAGE-TLD MAPPING
// ============================================================================
const LANG_TO_ACCEPTABLE_TLDS: Record<string, string[]> = {
  'en': ['com', 'org', 'net', 'gov', 'edu', 'int', 'eu', 'uk', 'us', 'ie', 'au', 'nz', 'ca'],
  'de': ['de', 'at', 'ch', 'com', 'org', 'net', 'eu', 'int'],
  'nl': ['nl', 'be', 'com', 'org', 'net', 'eu', 'int'],
  'fr': ['fr', 'be', 'ch', 'ca', 'com', 'org', 'net', 'eu', 'int'],
  'sv': ['se', 'com', 'org', 'net', 'eu', 'int'],
  'da': ['dk', 'com', 'org', 'net', 'eu', 'int'],
  'no': ['no', 'com', 'org', 'net', 'eu', 'int'],
  'fi': ['fi', 'com', 'org', 'net', 'eu', 'int'],
  'hu': ['hu', 'com', 'org', 'net', 'eu', 'int'],
  'pl': ['pl', 'com', 'org', 'net', 'eu', 'int'],
  'es': ['es', 'com', 'org', 'net', 'eu', 'int'], // Spanish content can use .es
};

const UNIVERSAL_TLDS = ['com', 'org', 'net', 'int', 'eu', 'gov', 'edu'];

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

function extractTLD(url: string): string {
  const domain = extractDomain(url);
  const parts = domain.split('.');
  return parts[parts.length - 1] || '';
}

function isAuthorityDomain(domain: string): boolean {
  return AUTHORITY_DOMAINS.some(auth => 
    domain.includes(auth) || domain.endsWith(auth)
  );
}

function isGovernmentSite(domain: string): boolean {
  return GOVERNMENT_PATTERNS.some(pattern => 
    domain.includes(pattern) || domain.startsWith(pattern.replace('.', ''))
  );
}

function isBlockedByHardcodedList(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_DOMAINS.some(blocked => lowerUrl.includes(blocked));
}

function isBlockedByKeyword(url: string): { blocked: boolean; keyword?: string } {
  const lowerUrl = url.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerUrl.includes(keyword)) {
      return { blocked: true, keyword };
    }
  }
  return { blocked: false };
}

function isBlockedByPath(url: string): { blocked: boolean; pattern?: string } {
  const lowerUrl = url.toLowerCase();
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (lowerUrl.includes(pattern)) {
      return { blocked: true, pattern };
    }
  }
  return { blocked: false };
}

function isLanguageCompatible(url: string, articleLanguage: string): { compatible: boolean; reason?: string } {
  const domain = extractDomain(url);
  const tld = extractTLD(url);
  
  // Authority domains and government sites are always compatible
  if (isAuthorityDomain(domain) || isGovernmentSite(domain)) {
    return { compatible: true };
  }
  
  // Universal TLDs are always OK
  if (UNIVERSAL_TLDS.includes(tld)) {
    return { compatible: true };
  }
  
  // Check if TLD matches article language
  const acceptableTLDs = LANG_TO_ACCEPTABLE_TLDS[articleLanguage] || UNIVERSAL_TLDS;
  if (acceptableTLDs.includes(tld)) {
    return { compatible: true };
  }
  
  // Spanish TLD (.es) is acceptable for all articles about Spain
  if (tld === 'es') {
    return { compatible: true };
  }
  
  return { compatible: false, reason: `TLD .${tld} not compatible with language ${articleLanguage}` };
}

async function checkDatabaseBlacklist(supabase: any, domain: string): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const { data } = await supabase
      .from('blocked_domains')
      .select('domain, reason, category')
      .eq('domain', domain)
      .eq('is_blocked', true)
      .maybeSingle();
    
    if (data) {
      return { blocked: true, reason: `Database blacklist: ${data.reason} (${data.category})` };
    }
    return { blocked: false };
  } catch (e) {
    console.error('[find-citations-fast] Database check error:', e);
    return { blocked: false }; // Don't block on error
  }
}

async function verifyUrlAccessibility(url: string): Promise<{ accessible: boolean; status?: number; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CitationValidator/1.0; +https://delsolprimehomes.com)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 2xx and 3xx are OK, 403 often means paywall (acceptable), 405 means HEAD not allowed (try GET)
    if (response.ok || response.status === 403) {
      return { accessible: true, status: response.status };
    }
    
    // Try GET if HEAD returns 405
    if (response.status === 405) {
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CitationValidator/1.0)',
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (getResponse.ok || getResponse.status === 403) {
        return { accessible: true, status: getResponse.status };
      }
      return { accessible: false, status: getResponse.status, reason: `HTTP ${getResponse.status}` };
    }
    
    return { accessible: false, status: response.status, reason: `HTTP ${response.status}` };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { accessible: false, reason: 'Timeout (10s)' };
    }
    return { accessible: false, reason: error.message || 'Network error' };
  }
}

interface RejectionRecord {
  url: string;
  reason: string;
  layer: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const rejections: RejectionRecord[] = [];
  const rejectionStats: Record<string, number> = {};
  
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

    // Initialize Supabase client for database blacklist check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[find-citations-fast] Processing: "${articleTopic}" (${articleLanguage})`);

    const languageNames: Record<string, string> = {
      en: 'English', de: 'German', nl: 'Dutch', fr: 'French', es: 'Spanish',
      pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian', fi: 'Finnish', no: 'Norwegian'
    };
    const langName = languageNames[articleLanguage] || articleLanguage;
    const isNonEnglish = articleLanguage !== 'en';

    const truncatedContent = articleContent.substring(0, 4000);

    // Helper function to make Perplexity API call
    async function callPerplexity(prompt: string): Promise<any[]> {
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
              content: 'You are a citation research assistant. Return ONLY valid JSON arrays of citations. NEVER include real estate, property, or inmobiliaria websites under ANY circumstances.'
            },
            { role: 'user', content: prompt }
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
      console.log(`[find-citations-fast] Raw response: ${content.substring(0, 200)}...`);

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error(`[find-citations-fast] JSON parse error:`, e);
      }
      return [];
    }

    // ATTEMPT 1: Strict search - government/official sources
    const strictPrompt = `Find 3-5 authoritative citations for this ${langName} article about "${articleTopic}".

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
5. ${isNonEnglish ? 'Sources can be in English OR ' + langName : 'Prefer English sources'}
6. Each citation must have a working, publicly accessible URL

Return a JSON array with 3-5 citations:
[{"url": "https://example.gov/page", "source": "Official Source Name", "quote": "A brief relevant quote", "relevance": 8}]

Only return the JSON array, no other text.`;

    console.log(`[find-citations-fast] Attempt 1: Strict search...`);
    let rawCitations = await callPerplexity(strictPrompt);

    // ATTEMPT 2: Broader search if strict returned empty/few results
    if (rawCitations.length < 2) {
      console.log(`[find-citations-fast] Attempt 2: Broader search (only ${rawCitations.length} found)...`);
      
      const broadPrompt = `Find 3-5 credible citations for this article about "${articleTopic}" related to Spain/Costa del Sol.

ARTICLE EXCERPT:
${truncatedContent.substring(0, 2000)}

ACCEPTABLE SOURCES (broader criteria):
- Major news outlets (The Guardian, Forbes, CNN, El País, Le Monde, Der Spiegel)
- Travel and lifestyle publications (Condé Nast Traveler, Travel + Leisure, Lonely Planet)
- Expat community resources (Expatica, InterNations)
- Healthcare/retirement comparison sites (OECD health data, WHO)
- Financial publications (Bloomberg, Financial Times)
- Government and tourism sites from any country
- Academic and research institutions

DO NOT USE: Real estate websites, property portals, inmobiliarias, or property listing sites.

Return JSON array:
[{"url": "https://...", "source": "Source Name", "quote": "relevant quote", "relevance": 7}]

Only return the JSON array.`;

      const broadCitations = await callPerplexity(broadPrompt);
      rawCitations = [...rawCitations, ...broadCitations];
    }

    // ATTEMPT 3: Generic topic search if still empty
    if (rawCitations.length === 0) {
      console.log(`[find-citations-fast] Attempt 3: Generic topic search...`);
      
      const genericPrompt = `Find 2-3 credible English-language sources with statistics or facts about:
- Spain as a destination for expats/retirees
- Costa del Sol tourism or lifestyle
- Spanish property market trends (NOT listings)
- Healthcare in Spain for foreigners

Return JSON array:
[{"url": "https://...", "source": "Source Name", "quote": "relevant statistic or fact", "relevance": 6}]

Only return the JSON array.`;

      rawCitations = await callPerplexity(genericPrompt);
    }

    const rawCount = rawCitations.length;
    console.log(`[find-citations-fast] Raw citations from Perplexity: ${rawCount}`);

    // ========================================================================
    // TRIPLE-LAYER VALIDATION PIPELINE
    // ========================================================================
    const validatedCitations: any[] = [];
    
    for (const citation of rawCitations) {
      const url = citation?.url;
      
      // Layer 0: Basic URL validation
      if (!url || typeof url !== 'string') {
        const reason = 'Invalid or missing URL';
        rejections.push({ url: url || 'undefined', reason, layer: 'basic' });
        rejectionStats['invalid_url'] = (rejectionStats['invalid_url'] || 0) + 1;
        continue;
      }

      try {
        new URL(url); // Validate URL format
      } catch {
        rejections.push({ url, reason: 'Malformed URL', layer: 'basic' });
        rejectionStats['malformed_url'] = (rejectionStats['malformed_url'] || 0) + 1;
        continue;
      }

      const domain = extractDomain(url);
      
      // Layer 1A: Hardcoded blocklist
      if (isBlockedByHardcodedList(url)) {
        rejections.push({ url, reason: 'Hardcoded blocklist', layer: 'blocklist' });
        rejectionStats['hardcoded_blocklist'] = (rejectionStats['hardcoded_blocklist'] || 0) + 1;
        console.log(`[find-citations-fast] ❌ Blocked (hardcoded): ${url}`);
        continue;
      }

      // Layer 1B: Keyword blocking
      const keywordCheck = isBlockedByKeyword(url);
      if (keywordCheck.blocked) {
        rejections.push({ url, reason: `Competitor keyword: ${keywordCheck.keyword}`, layer: 'keyword' });
        rejectionStats['keyword_blocked'] = (rejectionStats['keyword_blocked'] || 0) + 1;
        console.log(`[find-citations-fast] ❌ Blocked (keyword "${keywordCheck.keyword}"): ${url}`);
        continue;
      }

      // Layer 1C: Path pattern blocking
      const pathCheck = isBlockedByPath(url);
      if (pathCheck.blocked) {
        rejections.push({ url, reason: `Blocked path pattern: ${pathCheck.pattern}`, layer: 'path' });
        rejectionStats['path_blocked'] = (rejectionStats['path_blocked'] || 0) + 1;
        console.log(`[find-citations-fast] ❌ Blocked (path "${pathCheck.pattern}"): ${url}`);
        continue;
      }

      // Layer 2: Database blacklist check
      const dbCheck = await checkDatabaseBlacklist(supabase, domain);
      if (dbCheck.blocked) {
        rejections.push({ url, reason: dbCheck.reason!, layer: 'database' });
        rejectionStats['database_blocklist'] = (rejectionStats['database_blocklist'] || 0) + 1;
        console.log(`[find-citations-fast] ❌ Blocked (database): ${url}`);
        continue;
      }

      // Layer 3: Language compatibility
      const langCheck = isLanguageCompatible(url, articleLanguage);
      if (!langCheck.compatible) {
        rejections.push({ url, reason: langCheck.reason!, layer: 'language' });
        rejectionStats['language_mismatch'] = (rejectionStats['language_mismatch'] || 0) + 1;
        console.log(`[find-citations-fast] ❌ Language mismatch: ${url} (${langCheck.reason})`);
        continue;
      }

      // Layer 4: URL accessibility check
      const accessCheck = await verifyUrlAccessibility(url);
      if (!accessCheck.accessible) {
        rejections.push({ url, reason: `Not accessible: ${accessCheck.reason}`, layer: 'accessibility' });
        rejectionStats['not_accessible'] = (rejectionStats['not_accessible'] || 0) + 1;
        console.log(`[find-citations-fast] ❌ Not accessible: ${url} (${accessCheck.reason})`);
        continue;
      }

      // All checks passed!
      console.log(`[find-citations-fast] ✅ Accepted: ${url}`);
      validatedCitations.push(citation);
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueCitations = validatedCitations.filter(c => {
      if (seenUrls.has(c.url)) return false;
      seenUrls.add(c.url);
      return true;
    }).slice(0, 5);

    // Format citations for storage
    const formattedCitations = uniqueCitations.map((c: any) => ({
      url: c.url,
      source: c.source || extractDomain(c.url),
      text: c.quote || c.text || `Source: ${c.source}`,
    }));

    const elapsed = Date.now() - startTime;
    console.log(`[find-citations-fast] Validation complete: ${formattedCitations.length} accepted, ${rejections.length} rejected in ${elapsed}ms`);

    // Build detailed diagnostics
    const diagnostics = {
      rawCitationsFound: rawCount,
      accepted: formattedCitations.length,
      rejected: rejections.length,
      rejectionReasons: rejectionStats,
      rejectedExamples: rejections.slice(0, 5).map(r => ({
        url: r.url.substring(0, 60) + (r.url.length > 60 ? '...' : ''),
        reason: r.reason,
        layer: r.layer
      })),
      timeElapsed: `${elapsed}ms`,
      language: articleLanguage,
    };

    if (formattedCitations.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No valid citations passed all validation checks',
        citations: [],
        diagnostics
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      citations: formattedCitations,
      diagnostics
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
