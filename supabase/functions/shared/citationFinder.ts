// Advanced Citation Discovery with Perplexity AI
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// ===== TIER 1: STATISTICAL SOURCES ALLOWLIST =====
const ALLOWED_DATA_PATHS = [
  '/informe',
  '/report',
  '/estudio',
  '/study',
  '/estadistica',
  '/statistics',
  '/analisis',
  '/analysis',
  '/mercado',
  '/market',
  '/datos',
  '/data'
];

// ===== AGGRESSIVE KEYWORD BLOCKING =====
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

export interface CitationValidation {
  isValid: boolean;
  validationScore: number;
  explanation: string;
  keyFactsExtracted: string[];
  relevanceAnalysis: string;
  recommendations?: string;
}

export interface BetterCitation {
  url: string;
  sourceName: string;
  description: string;
  relevance: string;
  claimMatch?: string; // STRICT RELEVANCE: Explanation of how source supports specific claim
  authorityScore: number;
  language: string;
  suggestedContext: string;
  diversityScore?: number;
  usageCount?: number;
  finalScore?: number;
  validation?: CitationValidation;
  validationStatus?: 'pending' | 'validating' | 'validated' | 'failed';
  suggestedParagraph?: number;
  suggestedSentence?: number;
  placementConfidence?: number;
  placementReasoning?: string;
}

const languageConfig = {
  en: {
    name: 'English',
    domains: '.gov, .gov.uk, .edu, .ac.uk, official UK/US government sites',
    examples: 'HM Land Registry, GOV.UK, U.S. Department of Housing'
  },
  es: {
    name: 'Spanish',
    domains: '.gob.es, .es, Spanish government ministries',
    examples: 'Ministerio de Inclusión, BOE, Registradores de España'
  },
  de: {
    name: 'German',
    domains: '.de, .gov.de, German official sites',
    examples: 'German government departments, official registries'
  },
  nl: {
    name: 'Dutch',
    domains: '.nl, .overheid.nl, Dutch government sites',
    examples: 'Kadaster, Nederlandse overheid'
  },
  fr: {
    name: 'French',
    domains: '.gouv.fr, .fr, French government sites',
    examples: 'French ministries, official documentation'
  },
  pl: {
    name: 'Polish',
    domains: '.gov.pl, .pl, Polish government sites',
    examples: 'Polish government departments'
  },
  sv: {
    name: 'Swedish',
    domains: '.se, Swedish government sites',
    examples: 'Swedish authorities'
  },
  da: {
    name: 'Danish',
    domains: '.dk, Danish government sites',
    examples: 'Danish official sources'
  },
  hu: {
    name: 'Hungarian',
    domains: '.hu, Hungarian government sites',
    examples: 'Hungarian official sources'
  },
};

// ===== DOMAIN DIVERSITY ENFORCEMENT =====
async function getOverusedDomains(limit: number = 20): Promise<string[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses')
      .gte('total_uses', limit)
      .order('total_uses', { ascending: false });
      
    if (error) {
      console.error('Error fetching domain stats:', error);
      return [];
    }
    
    console.log(`🚫 Blocked ${data.length} overused domains (>${limit} uses)`);
    return data.map((d: any) => d.domain);
  } catch (error) {
    console.error('Failed to fetch overused domains:', error);
    return [];
  }
}

// ===== TIER 2: CROSS-LANGUAGE DOMAIN SUPPORT =====
async function getApprovedDomainsForLanguage(language: string): Promise<Array<{domain: string, category: string, language: string | null}>> {
  try {
    // Normalize language to lowercase for case-insensitive matching
    const normalizedLang = language.toLowerCase();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // TIER 2: Include international sources (is_international = true) alongside language-matched sources
    const { data, error } = await supabase
      .from('approved_domains')
      .select('domain, category, language, is_international')
      .eq('is_allowed', true)
      .or(`language.ilike.${normalizedLang},language.ilike.EU,language.ilike.GLOBAL,language.ilike.EU/GLOBAL,is_international.eq.true`);
      
    if (error) {
      console.error('Error fetching approved domains:', error);
      return [];
    }
    
    console.log(`✅ Loaded ${data.length} approved domains for ${language.toUpperCase()} (normalized: ${normalizedLang}, including international sources)`);
    return data.map((d: any) => ({ domain: d.domain, category: d.category || d.domain, language: d.language }));
  } catch (error) {
    console.error('Failed to fetch approved domains:', error);
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// ===== BULLETPROOF KEYWORD/PATTERN BLOCKING =====
function isBlockedByKeywordOrPattern(url: string, domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  // Check keyword blocking
  for (const keyword of BLOCKED_DOMAIN_KEYWORDS) {
    if (lowerDomain.includes(keyword) || lowerUrl.includes(keyword)) {
      console.log(`   🚫 Blocked by keyword "${keyword}": ${domain}`);
      return true;
    }
  }
  
  // Check property listing URL patterns
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
  
  return false;
}

// ===== SIMPLE AUTHORITY SCORING (No Usage Tracking) =====
interface DomainScore {
  domain: string;
  category: string;
  authorityScore: number;
}

/**
 * Calculate simple authority scores for approved domains
 * No usage tracking - rely on Gemini's natural diversity via Google Search
 * PHASE 1: Includes regional boosting for relevant language content
 */
function calculateSimpleAuthorityScores(
  approvedDomains: Array<{ domain: string; category: string; language: string | null }>,
  articleLanguage?: string
): Map<string, number> {
  const scores = new Map<string, number>();
  
  for (const { domain, category, language } of approvedDomains) {
    let score = 50; // Base score
    
    // Government domains: highest priority
    if (domain.includes('.gob.') || domain.includes('.gov') || domain.includes('ministerio')) {
      score = 100;
    }
    // Educational institutions
    else if (domain.includes('.edu') || domain.includes('university')) {
      score = 90;
    }
    // Official statistics bodies
    else if (domain.includes('ine.') || domain.includes('eurostat') || category.toLowerCase().includes('statistics')) {
      score = 95;
    }
    // EU institutions
    else if (domain.includes('europa.eu') || category.toLowerCase().includes('eu')) {
      score = 85;
    }
    // News organizations
    else if (category.toLowerCase().includes('news')) {
      score = 70;
    }

    // PHASE 1: Regional boost for Spanish articles
    if (articleLanguage === 'es') {
      // Boost Spanish government sources
      if (
        domain.includes('ine.es') ||
        domain.includes('boe.es') ||
        domain.includes('juntadeandalucia.es') ||
        domain.includes('andalucia.org') ||
        domain.includes('.gob.es')
      ) {
        score += 15; // Regional authority boost
        console.log(`[Regional Boost] ${domain}: +15 (Spanish government source)`);
      }
      // Boost Spanish academic/research
      else if (language === 'es' && (domain.includes('.edu.es') || domain.includes('universidad'))) {
        score += 10;
        console.log(`[Regional Boost] ${domain}: +10 (Spanish academic source)`);
      }
    }
    
    scores.set(domain, score);
  }
  
  return scores;
}

/**
 * Call Perplexity API for a specific batch of domains
 */
async function callPerplexityForBatch(
  batch: Array<{ domain: string; category: string; score: number }>,
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  currentCitations: string[],
  blockedDomains: string[],
  perplexityApiKey: string,
  targetContext?: string,
  focusArea?: string
): Promise<BetterCitation[]> {
  const config = languageConfig[articleLanguage as keyof typeof languageConfig] || languageConfig.es;
  
  const targetContextSection = targetContext 
    ? `\n**TARGET CONTEXT FOR CITATION (🎯 HIGH PRIORITY - EXACT MATCH REQUIRED):**
"${targetContext}"

🎯 **CRITICAL TOPICAL RELEVANCE REQUIREMENT:**
The citation MUST directly support THIS EXACT CLAIM/STATEMENT - not just the general article topic.
The source content must:
- Provide data, statistics, or information that DIRECTLY validates this specific claim
- Match the EXACT subject matter of this sentence/claim  
- Be contextually appropriate for where this claim appears in the article`
    : '';

  const focusContext = focusArea 
    ? `\n**Special Focus:** ${focusArea} - prioritize sources specific to this region/topic`
    : '';

  const currentCitationsText = currentCitations.length > 0
    ? `\n**Current Citations to AVOID duplicating:**\n${currentCitations.slice(0, 10).join('\n')}`
    : '';

  const blockedDomainsText = blockedDomains.length > 0
    ? `\n\n🚫 **CRITICAL: NEVER use these blocked domains (ZERO TOLERANCE):**\n${blockedDomains.map(d => `- ${d}`).join('\n')}\n\n❌ ABSOLUTE RULE: NEVER cite ANY company that sells, rents, or brokers real estate.
❌ Forbidden categories: real estate agencies, property portals, relocation services, property investment platforms, estate agents, brokerages, listing sites, property search sites.`
    : '';

  const prompt = `You are an expert research assistant finding authoritative external sources for a ${config.name} language article using Google Search.

**Article Topic:** "${articleTopic}"
**Language Required:** ${config.name}
**Full Article Content:**
${articleContent}
${targetContextSection}
${focusContext}
${currentCitationsText}
${blockedDomainsText}

**CRITICAL GUIDANCE FOR ${articleLanguage.toUpperCase()} ARTICLES:**
- Prioritize INTERNATIONAL sources in ${config.name} language
- For topics about specific regions: Find international analysis rather than local sources
- ❌ ZERO TOLERANCE: Real estate agency websites, property portals, real estate brokerages, listing sites, property search sites
- ✅ PREFER: Research institutions, statistical agencies, market analysis firms, academic studies, international organizations

**PREFERRED SOURCE TYPES (in order of priority):**
1. International statistical/economic agencies (EU, OECD, World Bank, Eurostat)
2. Academic research and university studies  
3. International business/financial publications (Bloomberg, Financial Times, Reuters)
4. Market research and analysis firms
5. Official international organizations (UN, IMF, etc.)

**❌ NEVER CITE (ZERO TOLERANCE):**
- Real estate agencies or brokerages
- Property listing portals or search sites
- Property investment platforms
- Relocation services focused on property
- Estate agents or property consultants
- ANY company that sells, rents, lists, or brokers real estate

**TARGET DOMAINS FOR THIS SEARCH (prioritize these ${batch.length} domains):**
${batch.map(d => `- ${d.domain} (${d.category}, authority: ${d.score})`).join('\n')}

**SEARCH INSTRUCTIONS:**
1. Focus ONLY on these ${batch.length} domains listed above
2. ${targetContext ? '🎯 PRIORITY: Find sources that EXACTLY match and support the specific target context provided above - NOT just the general topic' : 'Search for content that matches specific claims in the article'}
3. Find 2-4 high-quality citations from DIFFERENT domains in this list
4. Ensure all sources are in ${config.name} language
5. Each citation must match a SPECIFIC claim, statistic, or statement (not just general topic)
6. Include "claimMatch" field explaining EXACTLY how the source supports the specific claim

**CRITICAL REQUIREMENTS:**
1. ALL sources MUST be in ${config.name} language
2. Prioritize INTERNATIONAL sources over local/regional ones
3. Sources must be HIGH AUTHORITY (research, statistical, international organizations)
4. Content must DIRECTLY relate to SPECIFIC CLAIMS in the article (exact topical match required)
5. Sources must be currently accessible (HTTPS, active)
6. Avoid duplicating current citations listed above
7. Find diverse sources **FROM DIFFERENT DOMAINS**
8. **NEVER use blocked domains - only use domains from the target list**
9. **❌ ZERO TOLERANCE: NEVER cite ANY real estate agencies, brokerages, property portals, or listing sites**
10. **Each citation MUST include "claimMatch" explaining exact relevance to specific claim**

**Return ONLY valid JSON array in this EXACT format:**
[
  {
    "url": "https://example.com/...",
    "sourceName": "Official Source Name",
    "description": "Brief description of what this source contains (1-2 sentences)",
    "relevance": "Specific claim or statement in the article this source supports",
    "claimMatch": "REQUIRED: Explain EXACTLY how this source supports the SPECIFIC CLAIM (not just general topic)",
    "authorityScore": 9,
    "language": "${articleLanguage}",
    "suggestedContext": "Exact section or paragraph in the article where this citation should appear"
  }
]

Return only the JSON array, nothing else.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s per batch

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert research assistant finding authoritative ${config.name}-language INTERNATIONAL sources. 
CRITICAL RULES (ZERO TOLERANCE):
1. ${blockedDomains.length > 0 ? `NEVER use blocked domains: ${blockedDomains.join(', ')}` : 'Check blocked domain list'}
2. NEVER suggest ANY real estate agencies, brokerages, property portals, or listing sites
3. Citations must EXACTLY match the specific claim - not just the general topic
4. ALWAYS include "claimMatch" field explaining exact relevance
5. Focus ONLY on provided target domains
6. Return ONLY valid JSON arrays
7. Never duplicate citations`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const citationsText = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = citationsText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in batch response');
      return [];
    }

    const citations = JSON.parse(jsonMatch[0]) as BetterCitation[];
    return citations;
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Batch search timed out after 30 seconds');
      return [];
    }
    console.error('Batch search error:', error);
    return [];
  }
}

/**
 * Search citations in sequential batches with delays
 */
async function searchCitationsInBatches(
  approvedDomains: Array<{ domain: string; category: string; language: string | null }>,
  blockedDomains: string[],
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  currentCitations: string[],
  perplexityApiKey: string,
  targetContext?: string,
  focusArea?: string
): Promise<BetterCitation[]> {
  
  const BATCH_SIZE = 20;
  const MIN_CITATIONS_NEEDED = 3;
  const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds
  
  // Calculate authority scores and sort domains by score (highest first)
  const authorityScores = calculateSimpleAuthorityScores(approvedDomains);
  const sortedDomains = approvedDomains
    .map(d => ({
      domain: d.domain,
      category: d.category,
      score: authorityScores.get(d.domain) || 50
    }))
    .sort((a, b) => b.score - a.score);
  
  // Divide into batches
  const batches: Array<Array<{ domain: string; category: string; score: number }>> = [];
  for (let i = 0; i < sortedDomains.length; i += BATCH_SIZE) {
    batches.push(sortedDomains.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`🔍 Searching ${batches.length} batches of up to ${BATCH_SIZE} domains each`);
  console.log(`📊 Total approved domains: ${sortedDomains.length}`);
  
  const allCitations: BetterCitation[] = [];
  const allowedDomainSet = new Set(approvedDomains.map(d => d.domain));
  const blockedDomainSet = new Set(blockedDomains);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length}: Searching ${batch.length} domains`);
    console.log(`   Top domains: ${batch.slice(0, 5).map(d => d.domain).join(', ')}...`);
    
    // Call Perplexity for this batch
    const batchCitations = await callPerplexityForBatch(
      batch,
      articleTopic,
      articleLanguage,
      articleContent,
      currentCitations,
      blockedDomains,
      perplexityApiKey,
      targetContext,
      focusArea
    );
    
    // === BULLETPROOF FILTER AND VALIDATION ===
    const validCitations = batchCitations.filter(citation => {
      const domain = extractDomain(citation.url);
      
      // TIER 1: Allow statistical/research pages from any domain in approved list
      const urlPath = citation.url.toLowerCase();
      const isStatisticalPage = ALLOWED_DATA_PATHS.some(path => urlPath.includes(path));
      
      // Check if blocked by database
      if (blockedDomainSet.has(domain) && !isStatisticalPage) {
        console.warn(`   🚫 REJECTED database blocked domain: ${domain}`);
        return false;
      }
      
      // === BULLETPROOF KEYWORD/PATTERN BLOCKING ===
      if (isBlockedByKeywordOrPattern(citation.url, domain) && !isStatisticalPage) {
        console.warn(`   🚫 REJECTED by keyword/pattern blocking: ${domain}`);
        return false;
      }
      
      // Check if in approved list (statistical pages get a pass if from any known domain)
      if (!allowedDomainSet.has(domain) && !isStatisticalPage) {
        console.warn(`   ❌ REJECTED uncategorized domain: ${domain}`);
        return false;
      }
      
      // Log statistical page approval
      if (isStatisticalPage && blockedDomainSet.has(domain)) {
        console.log(`   ✅ ALLOWED statistical page from otherwise blocked domain: ${citation.url}`);
      }
      
      // Basic validation
      if (!citation.url || !citation.sourceName || !citation.url.startsWith('http')) {
        console.warn(`   ❌ REJECTED invalid citation structure: ${citation.url}`);
        return false;
      }
      
      // Check for duplicates
      if (currentCitations.includes(citation.url) || 
          allCitations.some(c => c.url === citation.url)) {
        console.warn(`   ⚠️ REJECTED duplicate: ${citation.url}`);
        return false;
      }
      
      // === STRICT RELEVANCE CHECK ===
      if (!citation.claimMatch || citation.claimMatch.length < 20) {
        console.warn(`   ⚠️ Weak relevance - missing claimMatch: ${domain}`);
        // Allow but flag for review
      }
      
      return true;
    });
    
    // Add authority scores
    const scoredCitations = validCitations.map(citation => {
      const domain = extractDomain(citation.url);
      const authorityScore = authorityScores.get(domain) || 50;
      
      return {
        ...citation,
        authorityScore: citation.authorityScore || authorityScore,
        finalScore: citation.authorityScore || authorityScore
      };
    });
    
    console.log(`   ✅ Found ${scoredCitations.length} valid citations in batch ${batchIndex + 1}`);
    if (scoredCitations.length > 0) {
      console.log(`   🎯 Domains: ${scoredCitations.map(c => extractDomain(c.url)).join(', ')}`);
    }
    
    allCitations.push(...scoredCitations);
    
    // If we found enough citations, stop searching
    if (allCitations.length >= MIN_CITATIONS_NEEDED) {
      console.log(`\n🎯 SUCCESS: Found ${allCitations.length} citations after ${batchIndex + 1} batches`);
      break;
    }
    
    // If more batches remain, wait before next search
    if (batchIndex < batches.length - 1) {
      console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  // Sort by authority score
  allCitations.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  
  console.log(`\n📊 Final results: ${allCitations.length} total citations`);
  if (allCitations.length > 0) {
    console.log(`🏆 Top 5 domains: ${allCitations.slice(0, 5).map(c => extractDomain(c.url)).join(', ')}`);
  }
  
  return allCitations;
}

/**
 * Find better, more authoritative citations for an article using batch search strategy
 */
export async function findBetterCitations(
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  currentCitations: string[],
  perplexityApiKey: string,
  targetContext?: string,
  focusArea?: string
): Promise<BetterCitation[]> {
  
  console.log('\n🚀 Starting batch citation search...');
  console.log(`📝 Article topic: ${articleTopic}`);
  console.log(`🌍 Language: ${articleLanguage}`);
  console.log(`📄 Article length: ${articleContent.length} characters`);
  
  // Get blocked domains: competitors (is_allowed=false) + overused domains
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: competitorDomains } = await supabase
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', false);
  
  const overusedDomains = await getOverusedDomains(20);
  const blockedDomains = [
    ...competitorDomains?.map(d => d.domain) || [],
    ...overusedDomains
  ];
  
  console.log(`🚫 Blocking ${blockedDomains.length} domains (${competitorDomains?.length || 0} competitors + ${overusedDomains.length} overused)`);
  
  const approvedDomains = await getApprovedDomainsForLanguage(articleLanguage);
  console.log(`✅ Loaded ${approvedDomains.length} approved domains for ${articleLanguage.toUpperCase()}`);
  
  // Use batch search strategy
  const citations = await searchCitationsInBatches(
    approvedDomains,
    blockedDomains,
    articleTopic,
    articleLanguage,
    articleContent,
    currentCitations,
    perplexityApiKey,
    targetContext,
    focusArea
  );
  
  // Validate government source presence
  const govCitations = citations.filter(c => 
    c.url.includes('.gov') || 
    c.url.includes('.gob.es') || 
    c.url.includes('.europa.eu') ||
    c.url.includes('.overheid.nl')
  );

  console.log(`\n🏛️  Found ${govCitations.length} government citations out of ${citations.length} total`);
  
  if (citations.length === 0) {
    console.warn('⚠️  No citations found after searching all batches');
  } else if (govCitations.length === 0) {
    console.warn('⚠️  No government sources found - consider manual review');
  }
  
  return citations.slice(0, 10);
}

/**
 * Verify that suggested citations are actually accessible
 */
export async function verifyCitations(citations: BetterCitation[]): Promise<BetterCitation[]> {
  console.log(`Verifying ${citations.length} citations...`);

  const verifiedCitations = await Promise.all(
    citations.map(async (citation) => {
      try {
        const response = await fetch(citation.url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CitationValidator/1.0)'
          },
          signal: AbortSignal.timeout(8000)
        });

        const isAccessible = response.ok || response.status === 403;
        
        return {
          ...citation,
          verified: isAccessible,
          statusCode: response.status,
        };
      } catch (error) {
        console.warn(`Failed to verify ${citation.url}:`, error);
        return {
          ...citation,
          verified: false,
          statusCode: null,
        };
      }
    })
  );

  // Sort: verified first, then by finalScore (authority + diversity)
  verifiedCitations.sort((a: any, b: any) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return (b.finalScore || b.authorityScore) - (a.finalScore || a.authorityScore);
  });

  const verifiedCount = verifiedCitations.filter((c: any) => c.verified).length;
  console.log(`✅ Verified ${verifiedCount}/${citations.length} citations (sorted by diversity + authority)`);

  return verifiedCitations;
}
