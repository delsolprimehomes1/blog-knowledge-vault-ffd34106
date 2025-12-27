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

// Maximum chunks to search before giving up (prevents timeout)
// Each chunk = 20 domains, so 5 chunks = 100 domains searched
const MAX_CHUNKS_TO_SEARCH = 5;

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

// ═══════════════════════════════════════════════════════════════════
// COMPETITOR AGENCIES - ALWAYS BLOCKED (All Tiers)
// ═══════════════════════════════════════════════════════════════════
const COMPETITOR_AGENCIES = [
  // Marbella/Costa del Sol agencies (HIGH PRIORITY - direct competitors)
  'panoramamarbella.com',
  'panoramaproperties.com',
  'christopherclover.com',
  'drumelia.com',
  'landmar.com',
  'crystal-shore.com',
  'marbella-hills.com',
  'marbellaproperties.com',
  'costadelsolproperties.com',
  'inmobiliaria-marbella.com',
  'viva-estates.com',
  'inmogolf.com',
  'habitat-marbella.com',
  
  // International luxury agencies
  'engel-voelkers.com',
  'sothebysrealty.com',
  'knightfrank.com',
  'savills.com',
  'christiesrealestate.com',
  'lucasfox.com',
  'coldwellbanker.com',
  'century21.es',
  're-max.es',
  'remax.es',
  'berkshirehathaway.com',
  'compass.com',
  'kw.com',
  'kellerwilliams.com',
  
  // Spanish agency chains
  'gilmar.es',
  'promora.es',
  'solvia.es',
  'oi-realtor.com',
  'housers.com',
  
  // Property investment sites
  'propertyinvestment.com',
  'buyspanishproperty.com',
  'investinspain.com',
  'spanish-property-investment.com',
  
  // UK/International portals focused on listings
  'aplaceinthesun.com',
  'kyero.com',
  'thinkspain.com',
  'spanish-property.com',
  'propertyguides.com',
  'spainhouses.net',
  'spanishproperties.com',
  'spanishhomes.com',
  'spanish-property-centre.com',
  'primeinvest.es',
];

// ═══════════════════════════════════════════════════════════════════
// AGGRESSIVE KEYWORD BLOCKING - Block ANY domain containing these terms
// ═══════════════════════════════════════════════════════════════════
const BLOCKED_DOMAIN_KEYWORDS = [
  // English terms
  'property', 'properties', 'realestate', 'real-estate', 'estate-agent',
  'homes', 'villas', 'apartments', 'condos', 'realtor', 'broker',
  'listing', 'listings', 'forsale', 'for-sale',
  
  // Spanish terms
  'inmobiliaria', 'inmobiliarias', 'casas', 'pisos', 'viviendas',
  'alquiler', 'venta', 'comprar', 'vender',
  
  // Dutch/Belgian terms
  'makelaar', 'makelaardij', 'vastgoed', 'woning', 'huizen',
  
  // German terms
  'immobilien', 'makler',
  
  // French terms
  'immobilier', 'agence',
  
  // General real estate terms
  'immo', 'estate', 'housing',
];

// Research paths that are OK even from agencies (Savills/Knight Frank research divisions)
const RESEARCH_PATHS = [
  '/research/', '/market-report', '/market-analysis', '/insights/',
  '/news/', '/discover/', '/informes/', '/estadisticas/',
];

// ═══════════════════════════════════════════════════════════════════
// SMART BATCH RETRY STRATEGY
// Dynamically fetches ALL approved domains from database and chunks them
// ═══════════════════════════════════════════════════════════════════

// Tier mapping for database results
const TIER_NAMES: { [key: string]: string } = {
  'tier_1': 'Tier 1: Premium & Government',
  'tier_2': 'Tier 2: News & Research',
  'tier_3': 'Tier 3: Academic & International',
  'portal': 'Portals & General',
};

// Legacy patterns kept for backward compatibility but not actively used
const BLOCKED_URL_PATTERNS = [
  '/property/', '/properties/', '/real-estate/', '/realestate/',
  '/homes/', '/villas/', '/apartments/', '/for-sale/', '/forsale/',
  '/inmobiliaria/', '/comprar/', '/venta/', '/alquiler/', '/rent/',
  '/buy/', '/sell/', '/listing/', '/listings/', '/search/',
  '/property-for-sale/', '/homes-for-sale/', '/houses-for-sale/',
  '/venta-de-viviendas/', '/comprar-casa/', '/alquilar-piso/',
];

// ============================================
// EXTRACT DOMAIN FROM URL HELPER
// ============================================
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}


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
    // Multi-language patterns for: da, de, en, es, fi, fr, hu, nl, no, pl, sv
    const needsCitation = 
      // === UNIVERSAL NUMERIC PATTERNS (work for ALL languages) ===
      /\d+%/.test(sentence) ||                                    // Percentages
      /\d{4}/.test(sentence) ||                                   // Years
      /€\d+|£\d+|\$\d+|kr\s*\d+|zł\s*\d+|Ft\s*\d+/.test(sentence) || // Prices (EUR, GBP, USD, Nordic kr, Polish zł, Hungarian Ft)
      /\d+\s*(million|thousand|billion)/i.test(sentence) ||       // English numbers
      
      // === ENGLISH (en) ===
      /(according to|statistics show|data indicates|research shows)/i.test(sentence) ||
      /(government|study|research|report|survey|analysis)/i.test(sentence) ||
      /(increased|decreased|rose|fell|grew|declined|average|median)/i.test(sentence) ||
      /(requires|mandatory|obligatory)/i.test(sentence) ||
      
      // === SPANISH (es) ===
      /(según|estadísticas|datos|de acuerdo con)/i.test(sentence) ||
      /(gobierno|estudio|investigación|informe|encuesta)/i.test(sentence) ||
      /(subió|bajó|creció|disminuyó|promedio|media)/i.test(sentence) ||
      /(millón|mil|millones|necesita|obligatorio|requerido)/i.test(sentence) ||
      
      // === GERMAN (de) ===
      /(laut|gemäß|zufolge|nach Angaben)/i.test(sentence) ||
      /(Regierung|Studie|Forschung|Bericht|Umfrage)/i.test(sentence) ||
      /(gestiegen|gesunken|gewachsen|Durchschnitt|Mittelwert)/i.test(sentence) ||
      /(Millionen|Tausend|Milliarden|erfordert|Pflicht)/i.test(sentence) ||
      
      // === FRENCH (fr) ===
      /(selon|d'après|conformément à|les données montrent)/i.test(sentence) ||
      /(gouvernement|étude|recherche|rapport|enquête)/i.test(sentence) ||
      /(augmenté|diminué|moyenne|médiane)/i.test(sentence) ||
      /(millions|milliers|milliards|obligatoire|requis)/i.test(sentence) ||
      
      // === DUTCH (nl) ===
      /(volgens|uit onderzoek blijkt|gegevens tonen)/i.test(sentence) ||
      /(overheid|regering|onderzoek|studie|rapport)/i.test(sentence) ||
      /(gestegen|gedaald|gegroeid|gemiddelde|mediaan)/i.test(sentence) ||
      /(miljoen|duizend|miljard|verplicht|vereist)/i.test(sentence) ||
      
      // === DANISH (da) ===
      /(ifølge|i henhold til|data viser)/i.test(sentence) ||
      /(regering|undersøgelse|forskning|rapport)/i.test(sentence) ||
      /(steg|faldt|voksede|gennemsnit|median)/i.test(sentence) ||
      /(millioner|tusinde|milliarder|krævet|obligatorisk)/i.test(sentence) ||
      
      // === SWEDISH (sv) ===
      /(enligt|i enlighet med|data visar)/i.test(sentence) ||
      /(regering|studie|forskning|rapport|undersökning)/i.test(sentence) ||
      /(ökade|minskade|växte|genomsnitt|median)/i.test(sentence) ||
      /(miljoner|tusen|miljarder|krävs|obligatorisk)/i.test(sentence) ||
      
      // === NORWEGIAN (no) ===
      /(ifølge|i henhold til|data viser)/i.test(sentence) ||
      /(regjering|studie|forskning|rapport|undersøkelse)/i.test(sentence) ||
      /(økte|sank|vokste|gjennomsnitt|median)/i.test(sentence) ||
      /(millioner|tusen|milliarder|påkrevd|obligatorisk)/i.test(sentence) ||
      
      // === FINNISH (fi) ===
      /(mukaan|tutkimuksen mukaan|tiedot osoittavat)/i.test(sentence) ||
      /(hallitus|tutkimus|raportti|selvitys)/i.test(sentence) ||
      /(kasvoi|laski|keskiarvo|mediaani)/i.test(sentence) ||
      /(miljoonaa|tuhatta|miljardia|vaaditaan|pakollinen)/i.test(sentence) ||
      
      // === POLISH (pl) ===
      /(według|zgodnie z|dane pokazują)/i.test(sentence) ||
      /(rząd|badanie|raport|analiza)/i.test(sentence) ||
      /(wzrosła|spadła|średnia|mediana)/i.test(sentence) ||
      /(milion|tysiąc|miliard|wymagany|obowiązkowy)/i.test(sentence) ||
      
      // === HUNGARIAN (hu) ===
      /(szerint|az adatok azt mutatják|kutatások alapján)/i.test(sentence) ||
      /(kormány|tanulmány|kutatás|jelentés)/i.test(sentence) ||
      /(nőtt|csökkent|átlag|medián)/i.test(sentence) ||
      /(millió|ezer|milliárd|szükséges|kötelező)/i.test(sentence);
    
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
// EXTRACT KEYWORDS FOR RELEVANCE CHECKING
// ============================================
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'y', 'o', 'que',
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !commonWords.has(w));
  
  return [...new Set(words)];
}

// ============================================
// BULLETPROOF COMPETITOR BLOCKING FUNCTION
// ============================================
function isBlockedCompetitorBulletproof(
  url: string, 
  domain: string,
  databaseBlacklist: Set<string>
): boolean {
  // 1. Check hardcoded competitor agencies
  if (COMPETITOR_AGENCIES.some(competitor => domain.includes(competitor))) {
    console.log(`   🚫 Blocked by hardcoded list: ${domain}`);
    return true;
  }
  
  // 2. Check database blacklist
  if (databaseBlacklist.has(domain)) {
    console.log(`   🚫 Blocked by database blacklist: ${domain}`);
    return true;
  }
  
  // 3. Check keyword blocking (aggressive)
  const lowerDomain = domain.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  for (const keyword of BLOCKED_DOMAIN_KEYWORDS) {
    if (lowerDomain.includes(keyword) || lowerUrl.includes(keyword)) {
      console.log(`   🚫 Blocked by keyword "${keyword}": ${domain}`);
      return true;
    }
  }
  
  // 4. Check for property listing URL patterns
  const listingPatterns = [
    '/property/', '/properties/', '/listing/', '/listings/',
    '/for-sale/', '/forsale/', '/comprar/', '/venta/', '/alquiler/',
    '/buy/', '/sell/', '/rent/', '/search/',
  ];
  
  for (const pattern of listingPatterns) {
    if (lowerUrl.includes(pattern)) {
      console.log(`   🚫 Blocked by listing URL pattern "${pattern}": ${url}`);
      return true;
    }
  }
  
  // Allow research paths even from otherwise blocked domains
  const isResearchPath = RESEARCH_PATHS.some(path => lowerUrl.includes(path));
  if (isResearchPath) {
    console.log(`   ✅ Allowed research path: ${url}`);
    return false;
  }
  
  return false;
}

// ============================================
// ACTIVE COMPETITOR VERIFICATION WITH PERPLEXITY
// ============================================
async function verifyNotCompetitor(
  url: string,
  domain: string
): Promise<{isCompetitor: boolean, businessType: string, confidence: number}> {
  
  const prompt = `Analyze this website domain: ${domain}

Is this company/website involved in ANY of the following businesses?
- Selling or renting real estate/properties
- Real estate brokerage or agency services
- Property listing portals or platforms
- Property investment advisory
- Relocation services focused on property sales/rentals
- Estate agent services
- Property consulting or brokerage

ANSWER ONLY with JSON in this exact format:
{
  "isRealEstateCompany": true or false,
  "businessType": "brief description of what the company actually does",
  "confidence": 1-10 (how confident are you in this assessment)
}

Return ONLY the JSON, nothing else.`;

  try {
    const response = await fetch(PERPLEXITY_BASE_URL, {
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
            content: 'You are a business analysis assistant. Respond only with valid JSON. Be accurate and objective in determining if a company is involved in real estate sales/brokerage.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Competitor verification API error: ${response.status}`);
      return { isCompetitor: false, businessType: 'verification_failed', confidence: 0 };
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ No JSON found in competitor verification response');
      return { isCompetitor: false, businessType: 'parse_error', confidence: 0 };
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      isCompetitor: result.isRealEstateCompany === true,
      businessType: result.businessType || 'unknown',
      confidence: result.confidence || 0
    };
    
  } catch (error) {
    console.error('❌ Competitor verification error:', error);
    return { isCompetitor: false, businessType: 'error', confidence: 0 };
  }
}

// ============================================
// AUTO-ADD TO BLACKLIST
// ============================================
async function addToBlacklist(domain: string, reason: string, supabaseClient: any): Promise<void> {
  try {
    // Check if domain already exists
    const { data: existing } = await supabaseClient
      .from('approved_domains')
      .select('id')
      .eq('domain', domain)
      .single();
    
    if (existing) {
      await supabaseClient
        .from('approved_domains')
        .update({ 
          is_allowed: false,
          notes: `Auto-blocked: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('domain', domain);
      
      console.log(`✅ Updated ${domain} to blacklist (is_allowed=false)`);
    } else {
      await supabaseClient
        .from('approved_domains')
        .insert({
          domain,
          category: 'Auto-detected Competitor',
          trust_score: 0,
          tier: 'tier_3',
          is_allowed: false,
          notes: `Auto-blocked by Perplexity verification: ${reason}`,
        });
      
      console.log(`✅ Added ${domain} to blacklist database`);
    }
    
    await supabaseClient
      .from('citation_cleanup_audit_log')
      .insert({
        scan_type: 'competitor_verification',
        competitor_domain: domain,
        action_taken: 'auto_blacklisted',
        match_type: 'perplexity_verification',
        field_name: reason,
      });
      
  } catch (error) {
    console.error('❌ Failed to add to blacklist:', error);
  }
}

// ============================================
// SMART BATCH RETRY SEARCH - Dynamic 20-Domain Chunks
// ============================================
async function findCitationWithTieredSearch(
  claim: string,
  language: string,
  articleTopic: string,
  attemptNumber: number = 1,
  supabaseClient: any
): Promise<any> {
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 SMART BATCH RETRY - Attempt ${attemptNumber}`);
  console.log(`📄 Claim: "${claim.substring(0, 100)}..."`);
  console.log(`${'='.repeat(60)}`);
  
  // Fetch ALL approved domains from database (allowed = true)
  console.log(`\n📡 Fetching approved domains from database...`);
  const { data: approvedDomains, error: domainsError } = await supabaseClient
    .from('approved_domains')
    .select('domain, tier, language, trust_score, is_international')
    .eq('is_allowed', true)
    .or(`language.eq.${language},language.eq.eu,language.eq.global,language.eq.all,language.is.null,is_international.eq.true`)
    .order('tier', { ascending: true })
    .order('trust_score', { ascending: false });

  if (domainsError || !approvedDomains) {
    console.error('❌ Failed to fetch approved domains:', domainsError);
    return null;
  }

  console.log(`✅ Loaded ${approvedDomains.length} approved domains for ${language}`);
  
  // Fetch database blacklist (is_allowed = false)
  console.log(`\n🚫 Fetching database blacklist...`);
  const { data: blacklistedDomains, error: blacklistError } = await supabaseClient
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', false);
  
  const databaseBlacklist = new Set<string>(
    (blacklistedDomains || []).map((d: any) => d.domain)
  );
  
  console.log(`✅ Loaded ${databaseBlacklist.size} blacklisted domains from database`);

  if (domainsError || !approvedDomains) {
    console.error('❌ Failed to fetch approved domains:', domainsError);
    return null;
  }

  console.log(`✅ Loaded ${approvedDomains.length} approved domains for ${language}`);
  
  // Group domains by tier
  const domainsByTier: { [key: string]: string[] } = {};
  approvedDomains.forEach((d: any) => {
    const tier = d.tier || 'portal';
    if (!domainsByTier[tier]) domainsByTier[tier] = [];
    domainsByTier[tier].push(d.domain);
  });
  
  // Create 20-domain chunks maintaining tier priority
  interface Chunk {
    tier: string;
    tierName: string;
    chunkNumber: number;
    domains: string[];
  }
  
  const chunks: Chunk[] = [];
  const tierOrder = ['tier_1', 'tier_2', 'tier_3', 'portal'];
  
  for (const tier of tierOrder) {
    const domains = domainsByTier[tier];
    if (!domains || domains.length === 0) continue;
    
    // Split into 20-domain chunks
    for (let i = 0; i < domains.length; i += 20) {
      chunks.push({
        tier,
        tierName: TIER_NAMES[tier] || tier,
        chunkNumber: Math.floor(i / 20) + 1,
        domains: domains.slice(i, i + 20)
      });
    }
  }
  
  console.log(`\n📦 Created ${chunks.length} chunks of 20 domains from ${Object.keys(domainsByTier).length} tiers`);
  console.log(`   Tiers: ${Object.entries(domainsByTier).map(([t, d]) => `${t}(${d.length})`).join(', ')}`);
  console.log(`   🛡️ Will search max ${MAX_CHUNKS_TO_SEARCH} chunks (${MAX_CHUNKS_TO_SEARCH * 20} domains) to prevent timeout`);
  
  const searchAttempts: any[] = [];
  let totalDomainsSearched = 0;
  const maxChunks = Math.min(chunks.length, MAX_CHUNKS_TO_SEARCH);
  
  // ⭐ Sequential chunk retry - stop on first success or max chunks reached
  for (let i = 0; i < maxChunks; i++) {
    const chunk = chunks[i];
    const chunkLabel = `${chunk.tier.toUpperCase()}-${chunk.chunkNumber}`;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 CHUNK ${i + 1}/${maxChunks}: ${chunkLabel}`);
    console.log(`   Tier: ${chunk.tierName}`);
    console.log(`   Domains: ${chunk.domains.length}`);
    console.log(`   Total searched so far: ${totalDomainsSearched}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    totalDomainsSearched += chunk.domains.length;
    
    // Construct STRICT RELEVANCE search query
    const searchQuery = `
Find an authoritative ${language} source from ONLY these approved domains that verifies THIS SPECIFIC CLAIM:

"${claim}"

Article context: ${articleTopic}

🎯 **CRITICAL TOPICAL RELEVANCE REQUIREMENT:**
The citation MUST directly support THIS EXACT CLAIM - not just the general article topic.
The source content must:
- Provide data, statistics, or information that DIRECTLY validates this specific claim
- Match the EXACT subject matter of this sentence/claim
- Be placed where this claim appears in the article

CRITICAL REQUIREMENTS:
1. Source MUST be from one of these ${chunk.domains.length} domains ONLY: ${chunk.domains.join(', ')}
2. Do NOT use any other domains, even if they seem relevant
3. Language: ${language}
4. Must contain specific data, statistics, or official information that MATCHES this claim
5. For aggregator sites (idealista, fotocasa), only use /informes/ or /estadisticas/ paths
6. ❌ NEVER cite ANY company that sells, rents, or brokers real estate
7. ❌ NEVER cite real estate agencies, property portals, relocation services, property investment platforms
8. ❌ NEVER cite estate agents, brokerages, or listing sites

Preferred source types: ${chunk.tierName}

Response format (JSON only):
{
  "citation": {
    "url": "exact URL from approved domains only",
    "title": "page title",
    "domain": "domain.com",
    "relevance_score": 1-10,
    "quote": "relevant excerpt that supports the claim",
    "why_authoritative": "why this source is trustworthy",
    "claimMatch": "REQUIRED: Explain exactly how this source supports THIS SPECIFIC CLAIM (not just the general topic)"
  }
}

If NO suitable source exists, return:
{
  "citation": null,
  "reason": "No source found in this chunk"
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
            content: `You are a citation research assistant. 
CRITICAL RULES:
1. ONLY use sources from the provided approved domain list
2. NEVER suggest real estate agencies, brokerages, property portals, or listing sites
3. Citations must EXACTLY match the specific claim - not just the general topic
4. Always include "claimMatch" field explaining how the source supports the EXACT claim
5. Respond with valid JSON only`
          },
            {
              role: 'user',
              content: searchQuery
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
          return_citations: true,
          search_recency_filter: "month",
          search_domain_filter: chunk.domains
        })
      });

      if (!response.ok) {
        console.error(`❌ Chunk ${chunkLabel} API error: ${response.status}`);
        searchAttempts.push({
          chunk: chunkLabel,
          tier: chunk.tier,
          domains: chunk.domains.length,
          found: false,
          reason: `API error ${response.status}`
        });
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse response
      let citationData;
      try {
        citationData = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          citationData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          console.warn(`⚠️ Chunk ${chunkLabel} JSON parse failed`);
          searchAttempts.push({
            chunk: chunkLabel,
            tier: chunk.tier,
            domains: chunk.domains.length,
            found: false,
            reason: 'JSON parse error'
          });
          continue;
        }
      }
      
      // Record attempt
      searchAttempts.push({
        chunk: chunkLabel,
        tier: chunk.tier,
        tierName: chunk.tierName,
        domains: chunk.domains.length,
        found: citationData?.citation ? true : false,
        reason: citationData?.reason
      });
      
      // Check if citation found
      if (!citationData?.citation || !citationData.citation.url) {
        console.log(`⚠️ No citation in chunk ${chunkLabel}`);
        console.log(`   Reason: ${citationData?.reason || 'Unknown'}`);
        console.log(`   Continuing to next chunk...`);
        continue;
      }
      
      const citation = citationData.citation;
      const domain = new URL(citation.url).hostname.replace('www.', '');
      
      // Verify domain is from this chunk
      const isFromThisChunk = chunk.domains.some(d => 
        domain.includes(d) || d.includes(domain)
      );
      
      if (!isFromThisChunk) {
        console.log(`⚠️ Citation from unapproved domain: ${domain}`);
        console.log(`   Expected domains from chunk, got: ${domain}`);
        continue;
      }
      
      // === BULLETPROOF COMPETITOR BLOCKING ===
      if (isBlockedCompetitorBulletproof(citation.url, domain, databaseBlacklist)) {
        console.log(`❌ COMPETITOR BLOCKED (bulletproof check): ${domain}`);
        console.log(`   URL: ${citation.url}`);
        continue;
      }
      
      // === STRICT RELEVANCE ENFORCEMENT: REJECT WEAK MATCHES ===
      if (!citation.claimMatch || citation.claimMatch.length < 30) {
        console.log(`❌ REJECTED - weak relevance (missing/short claimMatch): ${domain}`);
        console.log(`   claimMatch: ${citation.claimMatch || 'MISSING'}`);
        searchAttempts.push({
          chunk: chunkLabel,
          success: false,
          reason: 'Weak claimMatch'
        });
        continue;
      }
      
      // Check claimMatch actually references claim keywords
      const claimKeywords = extractKeywords(claim);
      const matchesKeywords = claimKeywords.some(kw => 
        citation.claimMatch.toLowerCase().includes(kw.toLowerCase())
      );
      
      if (!matchesKeywords && claimKeywords.length > 0) {
        console.log(`❌ REJECTED - claimMatch doesn't reference claim keywords: ${domain}`);
        searchAttempts.push({
          chunk: chunkLabel,
          success: false,
          reason: 'claimMatch not relevant to claim'
        });
        continue;
      }
      
      // Reject low relevance scores
      if (citation.relevance_score && citation.relevance_score < 7) {
        console.log(`❌ REJECTED - relevance score too low (${citation.relevance_score}): ${domain}`);
        searchAttempts.push({
          chunk: chunkLabel,
          success: false,
          reason: `Low relevance score: ${citation.relevance_score}`
        });
        continue;
      }
      
      // === ACTIVE COMPETITOR VERIFICATION (for non-tier-1 domains) ===
      const domainInfo = approvedDomains.find((d: any) => d.domain === domain);
      const domainTier = domainInfo?.tier;
      const shouldVerify = domainTier !== 'tier_1' && citation.relevance_score < 9;
      
      if (shouldVerify) {
        console.log(`   🔍 Verifying competitor status for: ${domain}...`);
        const verification = await verifyNotCompetitor(citation.url, domain);
        
        if (verification.isCompetitor && verification.confidence >= 7) {
          console.log(`   🚫 COMPETITOR DETECTED: ${domain}`);
          console.log(`      Business: ${verification.businessType}`);
          console.log(`      Confidence: ${verification.confidence}/10`);
          
          await addToBlacklist(domain, verification.businessType, supabaseClient);
          
          searchAttempts.push({
            chunk: chunkLabel,
            success: false,
            reason: 'Competitor detected by verification'
          });
          continue;
        }
        
        console.log(`   ✅ Verified safe: ${domain} (${verification.businessType})`);
      }
      
      // 🎉 SUCCESS! Found a valid citation
      console.log(`\n✅ ═══════════════════════════════════════════`);
      console.log(`   SUCCESS IN CHUNK ${chunkLabel}!`);
      console.log(`   Domain: ${domain}`);
      console.log(`   Title: ${citation.title}`);
      console.log(`   Relevance: ${citation.relevance_score}/10`);
      console.log(`   Searched ${i + 1}/${chunks.length} chunks (${totalDomainsSearched} domains)`);
      console.log(`   Stopped early - citation found!`);
      console.log(`═══════════════════════════════════════════\n`);
      
      // Calculate authority score
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
        batchTier: getTierNumber(chunk.tier),
        batchName: chunk.tierName,
        chunkLabel: chunkLabel,
        chunksSearched: i + 1,
        totalChunks: chunks.length,
        domainsSearched: totalDomainsSearched,
        needsManualReview: citation.relevance_score < 7,
        searchAttempts: searchAttempts,
        diversityScore: 100,
        usageCount: 0,
      };
      
    } catch (error) {
      console.error(`❌ Chunk ${chunkLabel} error:`, error);
      searchAttempts.push({
        chunk: chunkLabel,
        tier: chunk.tier,
        domains: chunk.domains.length,
        found: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Small delay between chunks to avoid rate limiting
    if (i < maxChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // ❌ Max chunks searched - no citation found
  const wasLimited = chunks.length > MAX_CHUNKS_TO_SEARCH;
  console.log(`\n❌ ═══════════════════════════════════════════`);
  console.log(`   ${wasLimited ? `REACHED MAX CHUNK LIMIT (${MAX_CHUNKS_TO_SEARCH}/${chunks.length})` : `ALL ${chunks.length} CHUNKS EXHAUSTED`}`);
  console.log(`   Total domains searched: ${totalDomainsSearched}/${approvedDomains.length}`);
  console.log(`   No valid citation found in searched chunks`);
  if (wasLimited) {
    console.log(`   ℹ️ Stopped early to prevent timeout - ${chunks.length - MAX_CHUNKS_TO_SEARCH} chunks not searched`);
  }
  console.log(`═══════════════════════════════════════════\n`);
  
  return null;
}

// ============================================
// FALLBACK: Open Web Search with Competitor Blocking
// ============================================
async function findCitationWithOpenWebFallback(
  claim: string,
  language: string,
  articleTopic: string,
  claimIndex: number,
  supabase: any
): Promise<Citation | null> {
  console.log(`\n🌐 ═══════════════════════════════════════════`);
  console.log(`   OPEN WEB FALLBACK SEARCH`);
  console.log(`   Claim ${claimIndex}: "${claim.substring(0, 80)}..."`);
  console.log(`═══════════════════════════════════════════\n`);

  try {
    // Fetch blacklisted domains from database
    const { data: blacklistedDomains } = await supabase
      .from('approved_domains')
      .select('domain')
      .eq('is_allowed', false);

    // Combine database blacklist with hardcoded competitor list
    const databaseBlacklist = blacklistedDomains?.map((d: { domain: string }) => d.domain) || [];
    const allBlockedDomains = [...new Set([...COMPETITOR_AGENCIES, ...databaseBlacklist])];
    
    console.log(`🛑 Total blocked domains: ${allBlockedDomains.length}`);
    console.log(`   • Hardcoded competitors: ${COMPETITOR_AGENCIES.length}`);
    console.log(`   • Database blacklist: ${databaseBlacklist.length}\n`);

    // Construct strict exclusion prompt
    const excludedDomainsStr = allBlockedDomains.join(', ');
    
    const prompt = `You are a citation research expert. Find ONE authoritative ${language} source that verifies this claim about "${articleTopic}":

"${claim}"

🛑 CRITICAL EXCLUSION RULES:
You MUST NEVER cite ANY of these ${allBlockedDomains.length} blocked domains:
${excludedDomainsStr}

Additionally, you MUST NEVER use:
- Real estate agency websites (inmobiliarias)
- Property listing portals (idealista, fotocasa, etc.)
- Real estate investment platforms
- Relocation/expat property services
- Any site with "property", "inmobiliaria", "realestate", "vivienda" in domain

✅ ONLY cite these types of sources:
- Government websites (.gov, .gob.es)
- Official statistics bureaus (INE, Eurostat)
- Central banks and financial regulators
- News outlets (major newspapers, TV networks)
- Research institutions and universities
- Established encyclopedias (Wikipedia is OK for general facts)
- Official tourism/geography authorities

Return ONE citation in this exact JSON format:
{
  "url": "full URL with https://",
  "source": "official source name",
  "text": "brief quote or statement that verifies the claim",
  "specificity": 85
}`;

    const perplexityResponse = await fetch(PERPLEXITY_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a citation finder. Return ONLY valid JSON with one citation. Never use blocked domains.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`❌ Perplexity API error: ${perplexityResponse.status} ${errorText}`);
      return null;
    }

    const data = await perplexityResponse.json();
    const rawContent = data.choices[0].message.content;
    
    console.log(`📥 Raw Perplexity response (first 300 chars):\n${rawContent.substring(0, 300)}...\n`);

    // Parse JSON response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      return null;
    }

    const citation = JSON.parse(jsonMatch[0]);

    // Validate citation structure
    if (!citation.url || !citation.source || !citation.text) {
      console.error('❌ Invalid citation structure');
      return null;
    }

    // CRITICAL: Double-check domain is not blocked
    const url = new URL(citation.url);
    const domain = url.hostname.replace('www.', '');
    
    if (isBlockedCompetitor(citation.url, domain)) {
      console.log(`🛑 FALLBACK BLOCKED: ${domain} is a competitor - Perplexity violated exclusion rules!`);
      return null;
    }

    // Additional keyword blocking for safety
    const domainLower = domain.toLowerCase();
    const blockedKeywords = ['property', 'inmobiliaria', 'realestate', 'vivienda', 'listing', 'piso', 'casa-', 'homes'];
    if (blockedKeywords.some(kw => domainLower.includes(kw))) {
      console.log(`🛑 FALLBACK BLOCKED: ${domain} contains blocked keyword`);
      return null;
    }

    console.log(`✅ Open web citation found: ${domain}`);
    console.log(`   Source: ${citation.source}`);
    console.log(`   Specificity: ${citation.specificity || 80}\n`);

    return {
      url: citation.url,
      sourceName: citation.source,
      description: citation.text,
      relevance: 'High - Open web search',
      authorityScore: 75, // Open web sources get medium authority
      specificityScore: citation.specificity || 80,
      batchTier: 5, // Special tier for open web
      needsManualReview: false,
      isFromOpenWeb: true, // Flag for UI
      diversityScore: 100,
      usageCount: 0,
    } as any; // Use 'as any' since we're adding extra properties beyond Citation interface

  } catch (error) {
    console.error(`❌ Open web fallback error:`, error);
    return null;
  }
}

// Helper: Convert tier string to number for compatibility
function getTierNumber(tier: string): number {
  const tierMap: { [key: string]: number } = {
    'premium': 1,
    'government': 1,
    'research': 2,
    'news': 3,
    'academic': 4,
    'portal': 4
  };
  return tierMap[tier] || 4;
}

// ============================================
// HELPER: Filter Domains by Language
// ============================================
function filterDomainsByLanguage(domains: string[], language: string): string[] {
  // Don't filter government sources - they're always relevant
  const governmentTLDs = ['.gov', '.gob', '.org', '.eu', '.int'];
  
  return domains.filter(domain => {
    // Always include government/official sources
    if (governmentTLDs.some(tld => domain.includes(tld))) {
      return true;
    }
    
    // Language-specific filtering
    switch (language) {
      case 'es':
        return domain.includes('.es') || domain.includes('spanish') || 
               domain.includes('spain') || !domain.includes('.');
      case 'en':
        return domain.includes('.uk') || domain.includes('.com') || 
               domain.includes('.org') || !domain.includes('.es');
      case 'de':
        return domain.includes('.de') || !domain.includes('.es');
      case 'fr':
        return domain.includes('.fr') || !domain.includes('.es');
      case 'nl':
        return domain.includes('.nl') || !domain.includes('.es');
      default:
        return true; // Include all for other languages
    }
  });
}

// Removed - no longer needed with dynamic database fetching

// ============================================
// HELPER: Check if Domain is Blocked Competitor
// ============================================
function isBlockedCompetitor(url: string, domain: string): boolean {
  const urlLower = url.toLowerCase();
  const domainLower = domain.toLowerCase();
  
  // Check against blocked list
  const isBlocked = COMPETITOR_AGENCIES.some(competitor => 
    domainLower.includes(competitor) || competitor.includes(domainLower)
  );
  
  if (!isBlocked) return false;
  
  // Check for research path exceptions (Savills, Knight Frank research OK)
  const hasResearchPath = RESEARCH_PATHS.some(path => 
    urlLower.includes(path)
  );
  
  if (hasResearchPath && (domainLower.includes('savills') || 
                          domainLower.includes('knightfrank'))) {
    console.log(`✅ Exception: Research path from ${domain}`);
    return false; // Allow research divisions
  }
  
  return true; // Blocked
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
      .or(`language.eq.${articleLanguage},language.eq.eu,language.eq.global,language.eq.all,language.is.null,is_international.eq.true`)
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

    const citations: any[] = [];
    const softMatches: any[] = [];
    const maxClaims = Math.min(claims.length, 3); // Limit to 3 citations to prevent timeout
    let competitorsBlocked = 0;
    let specificityRejections = 0;
    let jsonParseFailures = 0;
    
    const batchStats: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };

    console.log(`🎯 Processing ${maxClaims} claims with parallel tiered batch search (3 at a time)...\n`);

    // Process claims in parallel batches of 3 for speed optimization
    const PARALLEL_LIMIT = 3;
    const claimBatches: Claim[][] = [];
    
    for (let i = 0; i < maxClaims; i += PARALLEL_LIMIT) {
      claimBatches.push(claims.slice(i, Math.min(i + PARALLEL_LIMIT, maxClaims)));
    }
    
    console.log(`📦 Split ${maxClaims} claims into ${claimBatches.length} parallel batch(es)\n`);

    // Process each batch of claims in parallel
    for (let batchIdx = 0; batchIdx < claimBatches.length; batchIdx++) {
      const batch = claimBatches[batchIdx];
      console.log(`\n🚀 PARALLEL BATCH ${batchIdx + 1}/${claimBatches.length}: Processing ${batch.length} claim(s) simultaneously`);
      
      // Process claims in this batch simultaneously
      const results = await Promise.allSettled(
        batch.map(async (claimData, idx) => {
          const globalClaimIdx = batchIdx * PARALLEL_LIMIT + idx;
          
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📌 CLAIM ${globalClaimIdx + 1}/${maxClaims}:`);
          console.log(`   "${claimData.claim}"\n`);
          
          try {
            // Search directly without sub-claim decomposition to save time
            let citation = await findCitationWithTieredSearch(
              claimData.claim,
              articleLanguage,
              articleTopic,
              globalClaimIdx + 1,
              supabase // Pass Supabase client
            );

            // NEW: If no citation from approved domains, try open web fallback
            if (!citation) {
              console.log(`🌐 Trying open web fallback for claim ${globalClaimIdx + 1}...`);
              citation = await findCitationWithOpenWebFallback(
                claimData.claim,
                articleLanguage,
                articleTopic,
                globalClaimIdx + 1,
                supabase
              );
            }

            if (citation) {
              // Check for duplicates
              const isDuplicate = citations.some(c => c.url === citation.url);
              if (isDuplicate) {
                console.log(`⏭️ Skipping duplicate: ${citation.url}`);
                return { success: false };
              }
              
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
                
                return { success: true, citation: citationWithMeta, batchTier: citation.batchTier, needsReview: citation.needsManualReview };
              } catch (e) {
                console.warn(`   ⚠️ Invalid URL in citation: ${citation.url}`);
              }
            }
            
            console.log(`   ⚠️ No citation found after searching all batches\n`);
            return { success: false };
            
          } catch (error) {
            if (error instanceof Error && error.message.includes('Invalid citation structure')) {
              jsonParseFailures++;
            }
            console.error(`   ❌ ERROR processing claim ${globalClaimIdx + 1}:`, error);
            return { success: false, error };
          }
        })
      );
      
      // Process results from parallel batch
      results.forEach((result, idx) => {
        const globalClaimIdx = batchIdx * PARALLEL_LIMIT + idx;
        
        if (result.status === 'fulfilled' && result.value.success) {
          const { citation, batchTier, needsReview } = result.value;
          
          // Track batch statistics
          if (batchTier) {
            batchStats[batchTier] = (batchStats[batchTier] || 0) + 1;
          }
          
          // Soft match detection - high authority but lower specificity
          if (needsReview) {
            softMatches.push(citation);
            console.log(`   ⚠️ SOFT MATCH: Needs manual review (Claim ${globalClaimIdx + 1})\n`);
          } else {
            citations.push(citation);
            console.log(`   ✅ ACCEPTED: Citation ${globalClaimIdx + 1} from Batch ${batchTier}\n`);
          }
        }
      });
      
      // Small delay between parallel batches (not between individual claims)
      if (batchIdx < claimBatches.length - 1) {
        console.log(`⏸️ Waiting 1s before next parallel batch...\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));
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
        model: 'Perplexity Sonar-Pro (Tiered Batch Search)',
        message: `Found ${citations.length} citation(s) across ${Object.values(batchStats).filter(v => v > 0).length} priority tier(s)`,
        diagnostics: {
          claimsAnalyzed: maxClaims,
          citationsFound: citations.length,
          softMatches: softMatches.length,
          competitorsBlocked,
          timeElapsed: `${elapsed}s`,
          successRate: `${((citations.length/maxClaims)*100).toFixed(1)}%`,
          apiUsed: 'Perplexity Sonar-Pro (Tiered Batch Search)',
          
          // ⭐ BATCH STATISTICS
          batchPerformance: {
            tier1_government: batchStats[1] || 0,
            tier2_aggregators: batchStats[2] || 0,
            tier3_news: batchStats[3] || 0,
            tier4_international: batchStats[4] || 0,
          },
          
          averageBatchTier: citations.length > 0
            ? (citations.reduce((sum: number, c: any) => sum + (c.batchTier || 4), 0) / citations.length).toFixed(1)
            : 'N/A',
          
          citationQuality: {
            highestAuthority: citations.filter(c => c.batchTier === 1).length,
            mediumAuthority: citations.filter(c => c.batchTier === 2 || c.batchTier === 3).length,
            lowerAuthority: citations.filter(c => c.batchTier === 4).length,
          },
          
          softMatchDetails: softMatches.length > 0 ? softMatches.map(s => ({
            url: s.url,
            domain: new URL(s.url).hostname.replace('www.', ''),
            relevanceScore: s.specificityScore,
            batchTier: s.batchTier,
            reason: 'Needs manual review - lower specificity'
          })) : []
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
