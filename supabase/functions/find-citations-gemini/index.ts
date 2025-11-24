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
  
  // Fetch ALL approved domains from database
  console.log(`\n📡 Fetching approved domains from database...`);
  const { data: approvedDomains, error: domainsError } = await supabaseClient
    .from('approved_domains')
    .select('domain, tier, language, trust_score, is_international')
    .eq('is_allowed', true)
    .or(`language.eq.${language},language.eq.EU,language.eq.GLOBAL,is_international.eq.true`)
    .order('tier', { ascending: true })
    .order('trust_score', { ascending: false });

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
  
  const searchAttempts: any[] = [];
  let totalDomainsSearched = 0;
  
  // ⭐ Sequential chunk retry - stop on first success
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkLabel = `${chunk.tier.toUpperCase()}-${chunk.chunkNumber}`;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 CHUNK ${i + 1}/${chunks.length}: ${chunkLabel}`);
    console.log(`   Tier: ${chunk.tierName}`);
    console.log(`   Domains: ${chunk.domains.length}`);
    console.log(`   Total searched so far: ${totalDomainsSearched}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    totalDomainsSearched += chunk.domains.length;
    
    // Construct search query
    const searchQuery = `
Find an authoritative ${language} source from ONLY these approved domains that verifies this claim:

"${claim}"

Article context: ${articleTopic}

CRITICAL REQUIREMENTS:
1. Source MUST be from one of these ${chunk.domains.length} domains ONLY: ${chunk.domains.join(', ')}
2. Do NOT use any other domains, even if they seem relevant
3. Language: ${language}
4. Must contain specific data, statistics, or official information
5. For aggregator sites (idealista, fotocasa), only use /informes/ or /estadisticas/ paths

Preferred source types: ${chunk.tierName}

Response format (JSON only):
{
  "citation": {
    "url": "exact URL from approved domains only",
    "title": "page title",
    "domain": "domain.com",
    "relevance_score": 1-10,
    "quote": "relevant excerpt that supports the claim",
    "why_authoritative": "why this source is trustworthy"
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
              content: `You are a citation research assistant. You MUST only use sources from the provided approved domain list. Never suggest sources from other domains. Respond with valid JSON only.`
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
      
      // Check if it's a blocked competitor
      if (isBlockedCompetitor(citation.url, domain)) {
        console.log(`❌ Competitor blocked - ${domain}`);
        continue;
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
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // ❌ All chunks exhausted - no citation found
  console.log(`\n❌ ═══════════════════════════════════════════`);
  console.log(`   ALL ${chunks.length} CHUNKS EXHAUSTED`);
  console.log(`   Total domains searched: ${totalDomainsSearched}/${approvedDomains.length}`);
  console.log(`   No valid citation found`);
  console.log(`═══════════════════════════════════════════\n`);
  
  return null;
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

    const citations: any[] = [];
    const softMatches: any[] = [];
    const maxClaims = Math.min(claims.length, 5); // Limit to 5 citations
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
            // Decompose complex claims
            const subClaims = decomposeComplexClaim(claimData.claim);
            
            for (const subClaim of subClaims) {
              // ⭐ USE SMART BATCH RETRY SEARCH
              const citation = await findCitationWithTieredSearch(
                subClaim,
                articleLanguage,
                articleTopic,
                globalClaimIdx + 1,
                supabase // Pass Supabase client
              );

              if (citation) {
                // Check for duplicates
                const isDuplicate = citations.some(c => c.url === citation.url);
                if (isDuplicate) {
                  console.log(`⏭️ Skipping duplicate: ${citation.url}`);
                  continue;
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
                
                break; // Found citation for this claim
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
