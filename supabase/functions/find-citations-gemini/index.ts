import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // 🎯 TIER 1: Allow statistical/research pages even from property portals
    const isDataPath = ALLOWED_DATA_PATHS.some(path => pathname.includes(path));
    if (isDataPath) {
      console.log(`   ✅ TIER 1 ALLOWED: Statistical/research page detected: ${pathname}`);
      return false; // ALLOW statistical content
    }
    
    // Check blocked domains
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked.toLowerCase())) {
        console.warn(`   ❌ COMPETITOR BLOCKED: Domain contains "${blocked}"`);
        return true;
      }
    }
    
    // Check URL path for property keywords
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pathname.includes(pattern) || fullUrl.includes(pattern)) {
        console.warn(`   ❌ COMPETITOR BLOCKED: URL contains "${pattern}"`);
        return true;
      }
    }
    
    // Check hostname for real estate keywords
    for (const keyword of BLOCKED_DOMAIN_KEYWORDS) {
      if (hostname.includes(keyword)) {
        console.warn(`   ❌ COMPETITOR BLOCKED: Domain contains keyword "${keyword}"`);
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
// FIND CITATION FOR SPECIFIC CLAIM
// ============================================
async function findCitationForClaim(
  claim: string,
  context: string,
  language: string,
  headline: string,
  approvedDomains: string[]
): Promise<Citation | null> {
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const languageMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'de': 'German',
    'nl': 'Dutch',
    'fr': 'French',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'hu': 'Hungarian',
  };
  
  const preferredSources: Record<string, string> = {
    'en': 'Government (.gov), Education (.edu), Research institutions, Major news organizations',
    'es': 'Gobierno (.gob.es, ministerios), Educación (.edu.es), INE (ine.es), Banco de España, Grandes medios (El País, El Mundo)',
    'de': 'Regierung (.de), Bildungseinrichtungen, Forschungsinstitute, Große Medien',
    'nl': 'Overheid (.nl), Onderwijsinstellingen, Onderzoeksinstellingen, Grote media',
    'fr': 'Gouvernement (.gouv.fr), Éducation, Instituts de recherche, Grands médias',
  };
  
  const targetLang = languageMap[language] || 'English';
  const preferredSourceTypes = preferredSources[language] || preferredSources['en'];
  
  const prompt = `You are a research expert finding ONE authoritative citation for a SPECIFIC CLAIM.

**ARTICLE TITLE:** "${headline}"
**LANGUAGE REQUIRED:** ${targetLang}

**SPECIFIC CLAIM THAT NEEDS PROOF:**
"${claim}"

**SURROUNDING CONTEXT:**
${context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL REQUIREMENTS - READ CAREFULLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ Source MUST directly prove THIS EXACT CLAIM (not just the general topic)
2. ✅ Source MUST be in ${targetLang} language
3. ✅ Source MUST be authoritative: ${preferredSourceTypes}
4. ✅ URL MUST link to a SPECIFIC PAGE with this data (NOT homepage)

5. ❌ ABSOLUTELY NO real estate company websites
6. ❌ ABSOLUTELY NO property listing sites
7. ❌ ABSOLUTELY NO companies selling Costa del Sol property
8. ❌ ABSOLUTELY NO real estate agencies
9. ❌ ABSOLUTELY NO property portals (idealista, fotocasa, kyero, etc.)
10. ❌ ABSOLUTELY NO developer websites

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GOOD SOURCE EXAMPLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claim: "Property prices rose 15% in 2023"
✅ GOOD: ine.es/estadisticas/mercado-inmobiliario/andalucia-2023
   Reason: Official government statistics with exact data

✅ GOOD: bde.es/informes/vivienda/analisis-precios-2023.pdf
   Reason: Bank of Spain official report on housing prices

✅ GOOD: mitma.gob.es/vivienda/precios-estadisticas
   Reason: Ministry of Transport housing statistics

❌ BAD: marbella-property-experts.com/market-report
   Reason: REAL ESTATE COMPANY - BLOCKED

❌ BAD: idealista.com/precios/malaga
   Reason: PROPERTY PORTAL - BLOCKED

❌ BAD: spain-real-estate.com/prices
   Reason: PROPERTY SELLER - BLOCKED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 APPROVED DOMAINS (PRIORITIZE THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${approvedDomains.slice(0, 40).join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RETURN FORMAT (JSON ONLY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "sourceName": "Official Organization Name",
  "url": "https://exact-specific-page-url.com/data-page",
  "relevance": "Explains EXACTLY how this source proves the specific claim with specific data points",
  "authorityScore": 95,
  "specificityScore": 90
}

**Authority Scores:**
- Government: 95-100
- Education/Research: 90-95  
- Major News: 85-90
- Industry Associations: 80-85

**Specificity Score:** How directly it addresses THIS EXACT CLAIM (0-100)
- 90-100: Contains the exact statistic/fact from the claim
- 70-89: Directly relevant with supporting data
- Below 70: Too general (DO NOT SUGGEST)

⚠️ CRITICAL: Return ONLY the JSON object. No markdown. No code blocks. No explanations. Start with { and end with }`;

  try {
    console.log(`   📡 Calling OpenAI API...`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'user', content: prompt }
        ],
        // REMOVED response_format to allow more flexible JSON responses
        max_completion_tokens: 4000 // Increased from 2000 to prevent truncation
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Check for response truncation
    const finishReason = data.choices[0].finish_reason;
    if (finishReason === 'length') {
      console.warn(`   ⚠️ OpenAI response was truncated (finish_reason: length)`);
      console.warn(`   Claim may not have received complete citation analysis`);
    }
    
    const responseText = data.choices[0].message.content;
    
    console.log(`   ✅ OpenAI response received (${responseText.length} chars, finish_reason: ${finishReason})`);
    
    // Parse JSON from response
    let citation = null;
    
    try {
      citation = JSON.parse(responseText);
    } catch (e) {
      console.error(`   ❌ Failed to parse JSON response:`, e);
      console.log(`   Raw response: ${responseText.substring(0, 200)}`);
      
      // Check if error is due to truncation
      if (finishReason === 'length') {
        console.error(`   ⚠️ Parse failure likely caused by response truncation`);
      }
      
      return null;
    }
    
    if (!citation || !citation.url || !citation.sourceName) {
      console.warn(`   ❌ Invalid citation structure returned`);
      return null;
    }
    
    // CRITICAL: Check if it's a competitor
    if (isCompetitorUrl(citation.url)) {
      return null;
    }
    
    // Validate specificity
    if (!validateCitationSpecificity(citation, claim)) {
      return null;
    }
    
    // Check specificity score threshold
    if (citation.specificityScore && citation.specificityScore < 70) {
      console.warn(`   ❌ REJECTED: Specificity too low (${citation.specificityScore}% - need 70%+)`);
      return null;
    }
    
    console.log(`   ✅ Citation validated and accepted`);
    return citation;
    
  } catch (error) {
    // Check for rate limit errors and propagate them
    if (error instanceof Error && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))) {
      console.error(`   ⚠️ OpenAI API rate limited (429)`);
      throw new Error('RATE_LIMITED: OpenAI API rate limit reached');
    }
    
    console.error(`   ❌ Error finding citation:`, error);
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
    console.log('   CLAIM-SPECIFIC CITATION FINDER (OpenAI)');
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
    const maxClaims = Math.min(claims.length, 5); // Limit to 5 citations
    let competitorsBlocked = 0;

    console.log(`🎯 Processing ${maxClaims} claims...\n`);

    // Find citation for each claim
    for (let i = 0; i < maxClaims; i++) {
      const claimData = claims[i];

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 CLAIM ${i + 1}/${maxClaims}:`);
      console.log(`   "${claimData.claim}"\n`);

      try {
        const citation = await findCitationForClaim(
          claimData.claim,
          claimData.context,
          articleLanguage,
          articleTopic,
          approvedDomainsList
        );

        if (citation) {
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

            citations.push({
              ...citation,
              claimText: claimData.claim,
              sentenceIndex: claimData.sentenceIndex,
              diversityScore,
              usageCount,
            });
            
            console.log(`   ✅ ACCEPTED: Citation ${i + 1} added\n`);
          } catch (e) {
            console.warn(`   ⚠️ Invalid URL in citation: ${citation.url}`);
          }
        } else {
          competitorsBlocked++;
          console.log(`   ⚠️  REJECTED: No valid citation found (competitor or low specificity)\n`);
        }

      } catch (error) {
        console.error(`   ❌ ERROR processing claim ${i + 1}:`, error);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   Claims analyzed: ${maxClaims}`);
    console.log(`   Citations found: ${citations.length}`);
    console.log(`   Competitors blocked: ${competitorsBlocked}`);
    console.log(`   Success rate: ${((citations.length/maxClaims)*100).toFixed(1)}%`);
    console.log(`   Time elapsed: ${elapsed}s`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Sort by specificity score and authority
    citations.sort((a, b) => {
      const scoreA = (a.specificityScore || 0) + (a.authorityScore * 0.5);
      const scoreB = (b.specificityScore || 0) + (b.authorityScore * 0.5);
      return scoreB - scoreA;
    });

    if (citations.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No valid citations found. All sources were either competitors or not specific enough.',
          citations: [],
          claimsAnalyzed: maxClaims,
          competitorsBlocked,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        citations,
        totalFound: citations.length,
        verifiedCount: citations.length,
        claimsAnalyzed: maxClaims,
        competitorsBlocked,
        timeElapsed: elapsed,
        language: articleLanguage,
        model: 'openai/gpt-5-mini',
        message: `Found ${citations.length} high-quality, claim-specific citations (${competitorsBlocked} competitors blocked)`,
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
          userMessage: 'OpenAI API rate limit reached. Please wait a moment before trying again.',
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
