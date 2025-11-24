import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// PERPLEXITY API CONFIGURATION
// ============================================
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/chat/completions';

if (!PERPLEXITY_API_KEY) {
  console.warn('⚠️ PERPLEXITY_API_KEY not found - citation search will fail');
}

// ============================================
// TIER 1: ALLOWED STATISTICAL/RESEARCH PATHS
// ============================================
// Allow data/research pages even from property portals
const ALLOWED_DATA_PATHS = [
  '/informes/', '/estudios/', '/estadisticas/', '/estadistica/',
  '/market-report/', '/research/', '/statistics/', '/data/',
  '/analisis/', '/informe/', '/estudio/', '/investigacion/',
  '/report/', '/reports/', '/study/', '/studies/', '/analysis/'
];

// ============================================
// COMPREHENSIVE COMPETITOR BLOCKLIST
// ============================================
const BLOCKED_DOMAINS = [
  // International Property Portals
  'zillow.com', 'realtor.com', 'trulia.com', 'redfin.com',
  'rightmove.co.uk', 'zoopla.co.uk', 'onthemarket.com', 'primelocation.com',
  'propertyfinder.com', 'propertypal.com', 'daft.ie', 'myhome.ie',
  
  // Spanish Property Portals
  'idealista.com', 'fotocasa.es', 'pisos.com', 'habitaclia.com',
  'kyero.com', 'thinkspain.com', 'aplaceinthesun.com', 'casas.com',
  'spanishpropertyinsight.com', 'propertyspain.co.uk', 'spainhouses.net',
  'spanish-property-centre.com', 'viva-estates.com', 'spanishhomes.com',
  
  // Costa del Sol Specific Real Estate
  'costadelsolproperties.com', 'marbellaproperties.com',
  'marbella-realestate.com', 'costa-del-sol-properties.com',
  'mijas-property.com', 'fuengirola-property.com',
  'estepona-properties.com', 'benalmadena-property.com',
  'nerja-property.com', 'torrox-property.com',
  'marbella.es', 'costadelsol.com', 'marbellaeast.com',
  'nuevaandalucia.com', 'goldenmileproperty.com',
  'puerto-banus.com', 'sotogrande-property.com',
  
  // Real Estate Agencies (Spain/International)
  'solvilla.com', 'viva-estates.com', 'panorama-estates.com',
  'inmobilia.com', 'garu-garu.com', 'terra-meridiana.com',
  'gilmar.es', 'housers.com', 'engel-voelkers.com',
  'lucasfox.com', 'coldwellbanker.com', 'century21.com',
  'remax.com', 're-max.com', 'sothebysrealty.com',
  'knightfrank.com', 'savills.com', 'christiesrealestate.com',
  'berkshirehathaway.com', 'kw.com', 'kellerwilliams.com',
  
  // Property Investment Sites
  'propertyinvestment.com', 'investproperty.com', 'buyspanishproperty.com',
  'investinspain.com', 'spanish-property-investment.com',
  'international-property-investment.com',
  
  // Property Listing Aggregators
  'mitula.com', 'trovit.com', 'nestoria.com', 'realtor.com',
  'homes.com', 'point2homes.com', 'homefinder.com',
  
  // Developer Websites (Generic patterns will catch most)
  'taylor-wimpey.es', 'metrovacesa.com', 'aedas-homes.com',
  'neinor.com', 'habitat-inmobiliaria.com',
];

const BLOCKED_URL_PATTERNS = [
  '/property/', '/properties/', '/real-estate/', '/realestate/',
  '/homes/', '/villas/', '/apartments/', '/for-sale/', '/forsale/',
  '/inmobiliaria/', '/comprar/', '/venta/', '/alquiler/', '/rent/',
  '/buy/', '/sell/', '/listing/', '/listings/', '/search/',
  '/property-for-sale/', '/homes-for-sale/', '/houses-for-sale/',
  '/venta-de-viviendas/', '/comprar-casa/', '/alquilar-piso/',
];

const BLOCKED_DOMAIN_KEYWORDS = [
  'property', 'properties', 'realestate', 'real-estate',
  'inmobiliaria', 'inmobiliarias', 'homes', 'villas',
  'apartments', 'casas', 'pisos', 'viviendas',
];

interface Citation {
  url: string;
  sourceName: string;
  description?: string;
  relevance: string;
  authorityScore: number;
  specificityScore: number;
  suggestedContext?: string;
  claimText?: string;
  sentenceIndex?: number;
  diversityScore?: number;
  usageCount?: number;
}

interface Claim {
  claim: string;
  context: string;
  sentenceIndex: number;
}

// ============================================
// EXTRACT SPECIFIC CLAIMS FROM ARTICLE
// ============================================
function extractClaimsNeedingCitations(content: string): Claim[] {
  console.log('📝 Extracting claims needing citations...');
  
  const claims: Claim[] = [];
  
  // Remove HTML tags
  const cleanContent = content.replace(/<[^>]+>/g, '').trim();
  
  // Split into sentences (handle multiple languages)
  const sentences = cleanContent
    .split(/[.!?]+\s+/)
    .filter(s => s.trim().length > 20);
  
  sentences.forEach((sentence, index) => {
    // Identify factual claims that need citations
    const needsCitation = 
      /\d+%/.test(sentence) || // Percentages
      /\d{4}/.test(sentence) || // Years
      /€\d+|£\d+|\$\d+/.test(sentence) || // Prices/amounts
      /\d+\s*(million|thousand|billion|millón|mil|millones)/i.test(sentence) || // Statistics
      /(increased|decreased|rose|fell|grew|declined|subió|bajó|creció|disminuyó)/i.test(sentence) || // Change verbs
      /(according to|statistics show|data indicates|según|estadísticas|datos)/i.test(sentence) || // Citation phrases
      /(government|study|research|report|gobierno|estudio|investigación|informe)/i.test(sentence) || // Authority mentions
      /(requires|mandatory|obligatory|necesita|obligatorio|requerido)/i.test(sentence) || // Requirements
      /(average|median|mean|promedio|media)/i.test(sentence); // Statistical terms
    
    if (needsCitation) {
      // Get 3-sentence context window
      const contextStart = Math.max(0, index - 1);
      const contextEnd = Math.min(sentences.length, index + 2);
      const contextSentences = sentences.slice(contextStart, contextEnd);
      const context = contextSentences.join('. ') + '.';
      
      claims.push({
        claim: sentence.trim(),
        context,
        sentenceIndex: index
      });
      
      console.log(`   ✓ Claim ${claims.length}: "${sentence.substring(0, 80)}..."`);
    }
  });
  
  console.log(`📊 Found ${claims.length} claims needing citations\n`);
  return claims;
}

// ============================================
// CHECK IF URL IS A COMPETITOR (TIER 1 ENHANCED)
// ============================================
function isCompetitorUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // 🎯 TIER 1: Enhanced semantic detection of market reports/statistics
    // Check for statistical/research path patterns
    const isDataPath = ALLOWED_DATA_PATHS.some(path => pathname.includes(path));
    
    // Check for semantic markers of market reports (even without specific paths)
    const marketReportPatterns = [
      /informe[-_]?mercado/i,
      /market[-_]?report/i,
      /informe[-_]?precios/i,
      /price[-_]?report/i,
      /market[-_]?analysis/i,
      /analisis[-_]?mercado/i,
      /estadisticas[-_]?inmobiliarias/i,
      /real[-_]?estate[-_]?statistics/i,
      /housing[-_]?market/i,
      /mercado[-_]?inmobiliario/i,
      /property[-_]?trends/i,
      /tendencias[-_]?inmobiliarias/i,
    ];
    
    const hasMarketReportIndicators = marketReportPatterns.some(pattern => 
      pattern.test(fullUrl)
    );
    
    // Check if URL is in news/analysis section (common for market reports)
    const isNewsOrAnalysisSection = 
      pathname.includes('/news/') ||
      pathname.includes('/noticias/') ||
      pathname.includes('/inmobiliario/') ||
      pathname.includes('/analisis/') ||
      pathname.includes('/analysis/') ||
      pathname.includes('/research/') ||
      pathname.includes('/investigacion/');
    
    // Allow if it's a statistical page OR has market report indicators + is in news/analysis
    if (isDataPath || (hasMarketReportIndicators && isNewsOrAnalysisSection)) {
      console.log(`   ✅ TIER 1 ALLOWED: Market report/statistical page detected: ${url}`);
      console.log(`      - Data path match: ${isDataPath}`);
      console.log(`      - Market report indicators: ${hasMarketReportIndicators}`);
      console.log(`      - News/analysis section: ${isNewsOrAnalysisSection}`);
      return false; // ALLOW statistical content
    }
    
    // Check blocked domains (but market reports already allowed above)
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked.toLowerCase())) {
        console.warn(`   ❌ COMPETITOR BLOCKED: Domain "${blocked}" (${url})`);
        return true;
      }
    }
    
    // Check URL path for property listing keywords
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pathname.includes(pattern) || fullUrl.includes(pattern)) {
        console.warn(`   ❌ COMPETITOR BLOCKED: Pattern "${pattern}" in URL`);
        return true;
      }
    }
    
    // Check hostname for real estate keywords
    for (const keyword of BLOCKED_DOMAIN_KEYWORDS) {
      if (hostname.includes(keyword)) {
        console.warn(`   ❌ COMPETITOR BLOCKED: Keyword "${keyword}" in domain`);
        return true;
      }
    }
    
    return false;
    
  } catch (e) {
    console.warn(`   ⚠️ Invalid URL format: ${url}`);
    return true; // Block invalid URLs
  }
}

// ============================================
// VALIDATE CITATION SPECIFICITY (TIER 3 ENHANCED)
// ============================================
function validateCitationSpecificity(citation: any, claim: string): boolean {
  console.log(`   🔍 Validating specificity for: ${citation.sourceName}`);
  
  // Extract keywords from claim
  const claimKeywords = claim
    .toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const relevanceText = citation.relevance.toLowerCase();
  const urlLower = citation.url.toLowerCase();
  
  // Count keyword matches in relevance and URL
  const relevanceMatches = claimKeywords.filter(keyword => 
    relevanceText.includes(keyword)
  );
  const urlMatches = claimKeywords.filter(keyword => 
    urlLower.includes(keyword)
  );
  
  const relevanceMatchPercent = claimKeywords.length > 0 
    ? (relevanceMatches.length / claimKeywords.length) * 100 
    : 0;
  
  // 🎯 TIER 3: Multi-tier validation with fallback scoring
  
  // Tier 1: Perfect match (URL + description contain keywords)
  if (urlMatches.length >= 2 && relevanceMatches.length >= 2) {
    console.log(`   ✅ TIER 3.1 PASSED: Perfect match (${urlMatches.length} URL keywords, ${relevanceMatches.length} relevance keywords)`);
    return true;
  }
  
  // Tier 2: Strong relevance (high scores + some keywords)
  if (citation.authorityScore >= 90 && 
      citation.specificityScore >= 80 &&
      (urlMatches.length >= 1 || relevanceMatches.length >= 2)) {
    console.log(`   ✅ TIER 3.2 PASSED: Strong relevance (Authority: ${citation.authorityScore}, Specificity: ${citation.specificityScore})`);
    return true;
  }
  
  // Tier 3: Fallback for high-authority sources (government/statistical)
  if (citation.authorityScore >= 95) {
    console.log(`   ⚠️ TIER 3.3 PASSED: High-authority source despite low specificity match (Authority: ${citation.authorityScore})`);
    return true;
  }
  
  // Traditional validation for lower authority sources
  if (relevanceMatchPercent < 40) {
    console.warn(`   ❌ FAILED: Relevance doesn't mention claim keywords (${relevanceMatchPercent.toFixed(1)}% match, need 40%+)`);
    return false;
  }
  
  // URL specificity check
  try {
    const url = new URL(citation.url);
    const path = url.pathname;
    
    const isHomepage = 
      path === '/' ||
      path === '/index.html' ||
      path === '/index.php' ||
      path === '/home' ||
      path.match(/^\/(en|es|de|nl|fr|pl|sv|da|hu)\/?$/);
    
    if (isHomepage) {
      console.warn(`   ❌ FAILED: URL is homepage (not specific): ${citation.url}`);
      return false;
    }
    
    // Check for statistical/research path (from TIER 1)
    const isDataPath = ALLOWED_DATA_PATHS.some(p => path.includes(p));
    
    const hasSpecificPath = 
      isDataPath ||
      path.length > 15 ||
      path.includes('data') ||
      path.includes('statistics') ||
      path.includes('estadisticas') ||
      path.includes('report') ||
      path.includes('informe') ||
      path.includes('research') ||
      path.includes('investigacion') ||
      path.includes('article') ||
      path.includes('articulo') ||
      /\d{4}/.test(path);
    
    if (!hasSpecificPath) {
      console.warn(`   ❌ FAILED: URL path too generic: ${path}`);
      return false;
    }
    
  } catch (e) {
    console.warn(`   ❌ FAILED: Invalid URL: ${citation.url}`);
    return false;
  }
  
  // Check for evidence language
  const evidenceKeywords = [
    'data', 'statistics', 'report', 'study', 'research',
    'datos', 'estadísticas', 'informe', 'estudio', 'investigación',
    'shows', 'indicates', 'reveals', 'states', 'confirms',
    'muestra', 'indica', 'revela', 'afirma', 'confirma',
    'government', 'official', 'gobierno', 'oficial',
    'according to', 'según'
  ];
  
  const hasEvidenceLanguage = evidenceKeywords.some(keyword => 
    relevanceText.includes(keyword)
  ) || /\d+%|\d+\s*(million|thousand|millón|mil)/.test(relevanceText);
  
  if (!hasEvidenceLanguage) {
    console.warn(`   ❌ FAILED: Relevance doesn't indicate specific data/evidence`);
    return false;
  }
  
  console.log(`   ✅ PASSED: Citation is specific and relevant (${relevanceMatchPercent.toFixed(1)}% keyword match)`);
  return true;
}

// ============================================
// CLAIM DECOMPOSITION HELPER
// ============================================
function decomposeComplexClaim(claim: string): string[] {
  // Check if claim has multiple elements
  const hasMultipleElements = 
    (claim.match(/,/g) || []).length >= 2 ||
    (claim.match(/ and /gi) || []).length >= 2 ||
    claim.split(' ').length > 20;
  
  if (!hasMultipleElements) {
    return [claim];
  }
  
  // Split by commas and "and"
  const elements = claim
    .split(/,\s*(?:and\s+)?|\s+and\s+/i)
    .map(part => part.trim())
    .filter(part => part.length > 15); // Ignore very short fragments
  
  if (elements.length > 1) {
    console.log(`🔍 Decomposed complex claim into ${elements.length} sub-claims`);
    return elements;
  }
  
  return [claim];
}

// ============================================
// FIND CITATION WITH PERPLEXITY (REAL-TIME WEB SEARCH)
// ============================================
async function findCitationWithPerplexity(
  claim: string,
  language: string,
  approvedDomains: string[],
  articleTopic: string
): Promise<Citation | null> {
  
  console.log(`🔍 Perplexity search for: "${claim.substring(0, 100)}..."`);
  
  // Filter domains by language
  const languageDomains = approvedDomains.filter(domain => {
    if (language === 'es') return domain.includes('.es') || domain.includes('.gob.es');
    if (language === 'en') return domain.includes('.gov') || domain.includes('.uk') || domain.includes('.ie');
    if (language === 'de') return domain.includes('.de');
    if (language === 'fr') return domain.includes('.fr') || domain.includes('.gouv.fr');
    if (language === 'nl') return domain.includes('.nl');
    if (language === 'pl') return domain.includes('.pl');
    if (language === 'sv') return domain.includes('.se');
    if (language === 'da') return domain.includes('.dk');
    if (language === 'hu') return domain.includes('.hu');
    return domain.includes('.com') || domain.includes('.org'); // International
  }).slice(0, 20);

  const searchQuery = `
Find an authoritative ${language} source that verifies this claim about Costa del Sol real estate:

"${claim}"

Article context: ${articleTopic}

Requirements:
1. Must be from official government, statistical bureau, or reputable news sources
2. Prefer these domains: ${languageDomains.join(', ')}
3. Must contain specific data, statistics, or official information
4. Language: ${language}
5. Focus on: real estate market, property law, taxation, lifestyle in Spain

Return ONLY valid JSON in this exact format:
{
  "citation": {
    "url": "exact URL of the source",
    "title": "page title",
    "domain": "domain.com",
    "relevance_score": 8,
    "quote": "relevant excerpt that supports the claim",
    "why_authoritative": "brief explanation of why this source is trustworthy"
  }
}

If no suitable source exists, return:
{
  "citation": null,
  "reason": "explanation why no source found"
}
`.trim();

  try {
    const response = await fetch(PERPLEXITY_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a citation research assistant for Costa del Sol real estate content.
            You MUST respond with valid JSON only. Never use conversational language.
            Search the web in real-time to find authoritative sources.
            Prioritize government sources (.gov, .gob.es), statistical bureaus (ine.es, ons.gov.uk), and reputable news outlets.`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        return_citations: true,
        search_recency_filter: "month"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Perplexity API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const perplexityCitations = data.citations || [];
    
    console.log(`📚 Perplexity returned ${perplexityCitations.length} citations`);

    // Parse JSON response with forgiving parser
    let citationData;
    try {
      citationData = JSON.parse(content);
    } catch (parseError) {
      console.warn('⚠️ JSON parse failed, trying forgiving parser...');
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          citationData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch (e) {
          console.error('❌ Could not extract JSON from response');
          return null;
        }
      } else {
        console.error('❌ No JSON found in response');
        return null;
      }
    }

    if (!citationData?.citation || !citationData.citation.url) {
      console.log(`⚠️ No citation found. Reason: ${citationData?.reason || 'Unknown'}`);
      return null;
    }

    const citation = citationData.citation;
    const domain = new URL(citation.url).hostname.replace('www.', '');
    
    // Validate domain
    const isApproved = approvedDomains.some(approved => 
      domain.includes(approved) || approved.includes(domain)
    );
    
    // Allow statistical/research paths even if domain not pre-approved
    const statisticalPaths = [
      '/informes/', '/estadisticas/', '/market-report', '/datos/',
      '/statistics/', '/research/', '/estudios/', '/analisis-mercado',
      '/price-index', '/market-analysis', '/inmobiliario'
    ];
    
    const hasStatisticalPath = statisticalPaths.some(path => 
      citation.url.toLowerCase().includes(path)
    );

    if (!isApproved && !hasStatisticalPath) {
      // Check if competitor
      if (isCompetitorUrl(citation.url)) {
        console.log(`❌ COMPETITOR BLOCKED: ${domain}`);
        return null;
      }
      console.log(`⚠️ Domain ${domain} not in approved list but not a competitor`);
    }

    if (hasStatisticalPath) {
      console.log(`✅ ALLOWED: Statistical/research page from ${domain}`);
    }

    // Calculate authority score (1-10)
    let authorityScore = citation.relevance_score || 7;
    if (domain.includes('.gov') || domain.includes('.gob')) authorityScore = Math.max(authorityScore, 9);
    if (domain.includes('ine.es') || domain.includes('bde.es')) authorityScore = 10;

    return {
      url: citation.url,
      sourceName: citation.title || 'Untitled Source',
      description: citation.quote || '',
      relevance: citation.why_authoritative || 'Authoritative source',
      authorityScore: authorityScore,
      specificityScore: citation.relevance_score * 10 || 70,
      diversityScore: 100,
      usageCount: 0,
    };

  } catch (error) {
    console.error('❌ Perplexity search error:', error);
    return null;
  }
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { 
      articleTopic,
      articleLanguage = 'es',
      articleContent,
      currentCitations = [],
    } = await req.json();

    if (!articleTopic || !articleContent) {
      throw new Error('Article topic and content are required');
    }

    console.log('\n🔍 ═══════════════════════════════════════════');
    console.log('   PERPLEXITY-POWERED CITATION FINDER');
    console.log('═══════════════════════════════════════════\n');
    console.log(`📄 Article: "${articleTopic}"`);
    console.log(`🌍 Language: ${articleLanguage}\n`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🎯 TIER 2: Get approved domains for this language + international sources
    const { data: approvedDomains, error: domainsError } = await supabase
      .from('approved_domains')
      .select('domain, category, trust_score, tier, is_international')
      .eq('is_allowed', true)
      .or(`language.eq.${articleLanguage},language.eq.EU,language.eq.GLOBAL,is_international.eq.true`)
      .order('trust_score', { ascending: false });

    if (domainsError) {
      console.error('Error fetching approved domains:', domainsError);
    }

    const approvedDomainsList = approvedDomains?.map(d => d.domain) || [];
    console.log(`📋 Loaded ${approvedDomainsList.length} approved domains for ${articleLanguage}\n`);

    // Get domain usage stats
    const { data: usageStats } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses');

    const usageMap = new Map(usageStats?.map(s => [s.domain, s.total_uses]) || []);

    // Extract claims needing citations
    const claims = extractClaimsNeedingCitations(articleContent);

    if (claims.length === 0) {
      console.log('ℹ️  No claims requiring citations found\n');
      return new Response(
        JSON.stringify({
          success: true,
          citations: [],
          message: 'No specific claims requiring citations found',
          totalFound: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const citations: Citation[] = [];
    const softMatches: Citation[] = []; // TIER 3: Soft matches for manual review
    const maxClaims = Math.min(claims.length, 5); // Limit to 5 citations
    let competitorsBlocked = 0;
    let specificityRejections = 0;
    let jsonParseFailures = 0;

    console.log(`🎯 Processing ${maxClaims} claims...\n`);

    // Find citation for each claim with decomposition
    for (let i = 0; i < maxClaims; i++) {
      const claimData = claims[i];

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 CLAIM ${i + 1}/${maxClaims}:`);
      console.log(`   "${claimData.claim}"\n`);

      try {
        // Decompose complex claims
        const subClaims = decomposeComplexClaim(claimData.claim);
        
        let citationFound = false;
        for (const subClaim of subClaims) {
          const citation = await findCitationWithPerplexity(
            subClaim,
            articleLanguage,
            approvedDomainsList,
            articleTopic
          );

          if (citation) {
            // Check for duplicates
            const isDuplicate = citations.some(c => c.url === citation.url);
            if (isDuplicate) {
              console.log(`⏭️ Skipping duplicate: ${citation.url}`);
              continue;
            }
            
            citationFound = true;
          // Extract domain for diversity scoring
          try {
            const url = new URL(citation.url);
            const domain = url.hostname.replace('www.', '');
            const usageCount = usageMap.get(domain) || 0;
            
            let diversityScore = 100;
            if (usageCount >= 20) diversityScore = 0;
            else if (usageCount >= 15) diversityScore = 30;
            else if (usageCount >= 10) diversityScore = 60;
            else if (usageCount >= 5) diversityScore = 80;

            const citationWithMeta = {
              ...citation,
              claimText: claimData.claim,
              sentenceIndex: claimData.sentenceIndex,
              diversityScore,
              usageCount,
            };
            
            // TIER 3: Soft match detection - high authority but maybe lower specificity
            if (citation.authorityScore >= 90 && citation.specificityScore < 70) {
              softMatches.push(citationWithMeta);
              console.log(`   ⚠️ SOFT MATCH: High-authority source but lower specificity (needs manual review)\n`);
            } else {
              citations.push(citationWithMeta);
              console.log(`   ✅ ACCEPTED: Citation ${i + 1} added\n`);
            }
          } catch (e) {
            console.warn(`   ⚠️ Invalid URL in citation: ${citation.url}`);
          }
          
          break; // Found citation for this claim, move to next
        }
        }
        
        if (!citationFound) {
          competitorsBlocked++;
          console.log(`   ⚠️ No citation found for claim ${i + 1}\n`);
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid citation structure')) {
          jsonParseFailures++;
        }
        console.error(`   ❌ ERROR processing claim ${i + 1}:`, error);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   Claims analyzed: ${maxClaims}`);
    console.log(`   Perfect matches: ${citations.length}`);
    console.log(`   Soft matches: ${softMatches.length}`);
    console.log(`   Competitors blocked: ${competitorsBlocked}`);
    console.log(`   JSON parse failures: ${jsonParseFailures}`);
    console.log(`   Success rate: ${((citations.length/maxClaims)*100).toFixed(1)}%`);
    console.log(`   Time elapsed: ${elapsed}s`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Sort both perfect and soft matches by quality
    citations.sort((a, b) => {
      const scoreA = (a.specificityScore || 0) + (a.authorityScore * 0.5);
      const scoreB = (b.specificityScore || 0) + (b.authorityScore * 0.5);
      return scoreB - scoreA;
    });
    
    softMatches.sort((a, b) => b.authorityScore - a.authorityScore);

    // TIER 3: If no perfect matches but have soft matches, return them with special flag
    if (citations.length === 0 && softMatches.length > 0) {
      console.log(`\n⚠️ SOFT MATCH MODE: Returning high-authority sources that need manual review\n`);
      
      return new Response(
        JSON.stringify({
          success: true,
          isSoftMatch: true,
          message: `Found ${softMatches.length} high-authority source(s) that are broadly relevant but may need manual verification for exact claim matching.`,
          citations: softMatches.map(c => ({
            ...c,
            needsManualReview: true,
            reviewReason: 'High-authority source but lower specificity for this exact claim'
          })),
          totalFound: softMatches.length,
          verifiedCount: 0,
          claimsAnalyzed: maxClaims,
          competitorsBlocked,
          timeElapsed: elapsed,
          language: articleLanguage,
          model: 'Perplexity Sonar-Pro',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build detailed failure message
    if (citations.length === 0 && softMatches.length === 0) {
      let failureReasons: string[] = [];
      if (competitorsBlocked > 0) failureReasons.push(`${competitorsBlocked} competitor source(s) blocked`);
      if (jsonParseFailures > 0) failureReasons.push(`${jsonParseFailures} AI response parsing error(s)`);
      if (specificityRejections > 0) failureReasons.push(`${specificityRejections} source(s) too generic`);
      
      const failureMessage = failureReasons.length > 0
        ? `No valid citations found: ${failureReasons.join(', ')}`
        : 'No valid citations found. The claim may be too specific or require sources not in our approved domain list.';
      
      return new Response(
        JSON.stringify({
          success: false,
          message: failureMessage,
          citations: [],
          claimsAnalyzed: maxClaims,
          competitorsBlocked,
          jsonParseFailures,
          specificityRejections,
          diagnostics: {
            reason: 'no_matches_found',
            suggestions: [
              competitorsBlocked > 0 ? 'Most relevant sources were competitor websites' : null,
              jsonParseFailures > 0 ? 'AI had trouble generating valid citation structures' : null,
              specificityRejections > 0 ? 'Found sources were too generic for this specific claim' : null,
              'Consider broadening the claim or manually adding a citation',
            ].filter(Boolean),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        citations,
        softMatches: softMatches.length > 0 ? softMatches.map(c => ({
          ...c,
          needsManualReview: true,
          reviewReason: 'High-authority but lower specificity'
        })) : undefined,
        totalFound: citations.length,
        verifiedCount: citations.length,
        claimsAnalyzed: maxClaims,
        competitorsBlocked,
        jsonParseFailures,
        specificityRejections,
        timeElapsed: elapsed,
        language: articleLanguage,
        model: 'Perplexity Sonar-Pro',
        message: `Found ${citations.length} perfect match(es)${softMatches.length > 0 ? ` + ${softMatches.length} soft match(es) for review` : ''} (${competitorsBlocked} competitors blocked)`,
        diagnostics: {
          claimsAnalyzed: maxClaims,
          citationsFound: citations.length,
          softMatches: softMatches.length,
          competitorsBlocked,
          timeElapsed: `${elapsed}s`,
          successRate: `${((citations.length/maxClaims)*100).toFixed(1)}%`,
          apiUsed: 'Perplexity Sonar-Pro',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('\n❌ CITATION FINDER FAILED:', error);

    // Handle rate limit specifically
    if (error instanceof Error && (error.message.includes('RATE_LIMITED') || error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RATE_LIMITED',
          userMessage: 'Perplexity API rate limit reached. Please wait a moment before trying again.',
          citations: [],
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        citations: [],
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
