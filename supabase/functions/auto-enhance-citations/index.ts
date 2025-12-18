import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// PERPLEXITY API CONFIGURATION
// ============================================
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/chat/completions';
const MAX_CHUNKS_TO_SEARCH = 5; // Search up to 100 domains (5 chunks × 20 domains)

// ═══════════════════════════════════════════════════════════════════
// COMPETITOR AGENCIES - ALWAYS BLOCKED
// ═══════════════════════════════════════════════════════════════════
const COMPETITOR_AGENCIES = [
  'panoramamarbella.com', 'panoramaproperties.com', 'christopherclover.com',
  'drumelia.com', 'landmar.com', 'crystal-shore.com', 'marbella-hills.com',
  'marbellaproperties.com', 'costadelsolproperties.com', 'inmobiliaria-marbella.com',
  'viva-estates.com', 'inmogolf.com', 'habitat-marbella.com',
  'engel-voelkers.com', 'sothebysrealty.com', 'knightfrank.com', 'savills.com',
  'christiesrealestate.com', 'lucasfox.com', 'coldwellbanker.com', 'century21.es',
  're-max.es', 'remax.es', 'berkshirehathaway.com', 'compass.com', 'kw.com',
  'kellerwilliams.com', 'gilmar.es', 'promora.es', 'solvia.es', 'oi-realtor.com',
  'housers.com', 'propertyinvestment.com', 'buyspanishproperty.com',
  'investinspain.com', 'spanish-property-investment.com', 'aplaceinthesun.com',
  'kyero.com', 'thinkspain.com', 'spanish-property.com', 'propertyguides.com',
  'spainhouses.net', 'spanishproperties.com', 'spanishhomes.com',
  'spanish-property-centre.com', 'primeinvest.es',
];

const BLOCKED_DOMAIN_KEYWORDS = [
  'property', 'properties', 'realestate', 'real-estate', 'estate-agent',
  'homes', 'villas', 'apartments', 'condos', 'realtor', 'broker',
  'listing', 'listings', 'forsale', 'for-sale',
  'inmobiliaria', 'inmobiliarias', 'casas', 'pisos', 'viviendas',
  'alquiler', 'venta', 'comprar', 'vender',
  'makelaar', 'makelaardij', 'vastgoed', 'woning', 'huizen',
  'immobilien', 'makler', 'immobilier', 'agence', 'immo', 'estate', 'housing',
];

const RESEARCH_PATHS = [
  '/research/', '/market-report', '/market-analysis', '/insights/',
  '/news/', '/discover/', '/informes/', '/estadisticas/',
];

const TIER_NAMES: { [key: string]: string } = {
  'tier_1': 'Tier 1: Premium & Government',
  'tier_2': 'Tier 2: News & Research',
  'tier_3': 'Tier 3: Academic & International',
  'portal': 'Portals & General',
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

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

function extractClaimsNeedingCitations(content: string): { claim: string; context: string; sentenceIndex: number }[] {
  console.log('📝 Extracting claims needing citations...');
  
  const claims: { claim: string; context: string; sentenceIndex: number }[] = [];
  const cleanContent = content.replace(/<[^>]+>/g, '').trim();
  const sentences = cleanContent.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);
  
  sentences.forEach((sentence, index) => {
    const needsCitation = 
      /\d+%/.test(sentence) ||
      /\d{4}/.test(sentence) ||
      /€\d+|£\d+|\$\d+/.test(sentence) ||
      /\d+\s*(million|thousand|billion|millón|mil|millones)/i.test(sentence) ||
      /(increased|decreased|rose|fell|grew|declined|subió|bajó|creció|disminuyó)/i.test(sentence) ||
      /(according to|statistics show|data indicates|según|estadísticas|datos)/i.test(sentence) ||
      /(government|study|research|report|gobierno|estudio|investigación|informe)/i.test(sentence) ||
      /(requires|mandatory|obligatory|necesita|obligatorio|requerido)/i.test(sentence) ||
      /(average|median|mean|promedio|media)/i.test(sentence);
    
    if (needsCitation) {
      const contextStart = Math.max(0, index - 1);
      const contextEnd = Math.min(sentences.length, index + 2);
      const contextSentences = sentences.slice(contextStart, contextEnd);
      const context = contextSentences.join('. ') + '.';
      
      claims.push({
        claim: sentence.trim(),
        context,
        sentenceIndex: index
      });
    }
  });
  
  console.log(`📊 Found ${claims.length} claims needing citations\n`);
  return claims;
}

function isBlockedCompetitorBulletproof(
  url: string, 
  domain: string,
  databaseBlacklist: Set<string>
): boolean {
  if (COMPETITOR_AGENCIES.some(competitor => domain.includes(competitor))) {
    console.log(`   🚫 Blocked by hardcoded list: ${domain}`);
    return true;
  }
  
  if (databaseBlacklist.has(domain)) {
    console.log(`   🚫 Blocked by database blacklist: ${domain}`);
    return true;
  }
  
  const lowerDomain = domain.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  for (const keyword of BLOCKED_DOMAIN_KEYWORDS) {
    if (lowerDomain.includes(keyword) || lowerUrl.includes(keyword)) {
      console.log(`   🚫 Blocked by keyword "${keyword}": ${domain}`);
      return true;
    }
  }
  
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
  
  const isResearchPath = RESEARCH_PATHS.some(path => lowerUrl.includes(path));
  if (isResearchPath) {
    console.log(`   ✅ Allowed research path: ${url}`);
    return false;
  }
  
  return false;
}

async function verifyNotCompetitor(
  url: string,
  domain: string,
  perplexityApiKey: string
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
        'Authorization': `Bearer ${perplexityApiKey}`,
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

async function addToBlacklist(domain: string, reason: string, supabaseClient: any): Promise<void> {
  try {
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
// TIERED BATCH SEARCH - Dynamic 20-Domain Chunks
// ============================================
async function findCitationWithTieredSearch(
  claim: string,
  language: string,
  articleTopic: string,
  supabaseClient: any,
  perplexityApiKey: string
): Promise<any> {
  
  console.log(`\n🔍 TIERED BATCH SEARCH`);
  console.log(`📄 Claim: "${claim.substring(0, 100)}..."`);
  
  // Fetch ALL approved domains
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
  
  // Fetch database blacklist
  const { data: blacklistedDomains } = await supabaseClient
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', false);
  
  const databaseBlacklist = new Set<string>(
    (blacklistedDomains || []).map((d: any) => d.domain)
  );
  
  console.log(`✅ Loaded ${databaseBlacklist.size} blacklisted domains`);

  // Group domains by tier
  const domainsByTier: { [key: string]: string[] } = {};
  approvedDomains.forEach((d: any) => {
    const tier = d.tier || 'portal';
    if (!domainsByTier[tier]) domainsByTier[tier] = [];
    domainsByTier[tier].push(d.domain);
  });
  
  // Create 20-domain chunks maintaining tier priority
  const chunks: any[] = [];
  const tierOrder = ['tier_1', 'tier_2', 'tier_3', 'portal'];
  
  for (const tier of tierOrder) {
    const domains = domainsByTier[tier];
    if (!domains || domains.length === 0) continue;
    
    for (let i = 0; i < domains.length; i += 20) {
      chunks.push({
        tier,
        tierName: TIER_NAMES[tier] || tier,
        chunkNumber: Math.floor(i / 20) + 1,
        domains: domains.slice(i, i + 20)
      });
    }
  }
  
  console.log(`📦 Created ${chunks.length} chunks (max ${MAX_CHUNKS_TO_SEARCH} will be searched)`);
  
  let totalDomainsSearched = 0;
  const maxChunks = Math.min(chunks.length, MAX_CHUNKS_TO_SEARCH);
  
  // Sequential chunk search
  for (let i = 0; i < maxChunks; i++) {
    const chunk = chunks[i];
    const chunkLabel = `${chunk.tier.toUpperCase()}-${chunk.chunkNumber}`;
    
    console.log(`\n🔍 CHUNK ${i + 1}/${maxChunks}: ${chunkLabel}`);
    console.log(`   Domains: ${chunk.domains.length}`);
    
    totalDomainsSearched += chunk.domains.length;
    
    const searchQuery = `
Find an authoritative ${language} source from ONLY these approved domains that verifies THIS SPECIFIC CLAIM:

"${claim}"

Article context: ${articleTopic}

🎯 **CRITICAL TOPICAL RELEVANCE REQUIREMENT:**
The citation MUST directly support THIS EXACT CLAIM - not just the general article topic.

CRITICAL REQUIREMENTS:
1. Source MUST be from one of these ${chunk.domains.length} domains ONLY: ${chunk.domains.join(', ')}
2. Do NOT use any other domains
3. Language: ${language}
4. Must contain specific data, statistics, or official information that MATCHES this claim
5. ❌ NEVER cite ANY company that sells, rents, or brokers real estate

Response format (JSON only):
{
  "citation": {
    "url": "exact URL from approved domains only",
    "title": "page title",
    "domain": "domain.com",
    "relevance_score": 1-10,
    "quote": "relevant excerpt that supports the claim",
    "why_authoritative": "why this source is trustworthy",
    "claimMatch": "REQUIRED: Explain exactly how this source supports THIS SPECIFIC CLAIM"
  }
}

If NO suitable source exists, return:
{
  "citation": null,
  "reason": "No source found in this chunk"
}`.trim();

    try {
      const response = await fetch(PERPLEXITY_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a citation research assistant. ONLY use sources from the provided approved domain list. NEVER suggest real estate agencies or property portals. Always include "claimMatch" field. Respond with valid JSON only'
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
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
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
          continue;
        }
      }
      
      if (!citationData?.citation || !citationData.citation.url) {
        console.log(`⚠️ No citation in chunk ${chunkLabel}`);
        continue;
      }
      
      const citation = citationData.citation;
      const domain = new URL(citation.url).hostname.replace('www.', '');
      
      // Verify domain is from this chunk
      const isFromThisChunk = chunk.domains.some((d: string) => 
        domain.includes(d) || d.includes(domain)
      );
      
      if (!isFromThisChunk) {
        console.log(`⚠️ Citation from unapproved domain: ${domain}`);
        continue;
      }
      
      // Bulletproof competitor blocking
      if (isBlockedCompetitorBulletproof(citation.url, domain, databaseBlacklist)) {
        console.log(`❌ COMPETITOR BLOCKED: ${domain}`);
        continue;
      }
      
      // Strict relevance enforcement
      if (!citation.claimMatch || citation.claimMatch.length < 30) {
        console.log(`❌ REJECTED - weak relevance (missing/short claimMatch): ${domain}`);
        continue;
      }
      
      const claimKeywords = extractKeywords(claim);
      const matchesKeywords = claimKeywords.some(kw => 
        citation.claimMatch.toLowerCase().includes(kw.toLowerCase())
      );
      
      if (!matchesKeywords && claimKeywords.length > 0) {
        console.log(`❌ REJECTED - claimMatch doesn't reference claim keywords: ${domain}`);
        continue;
      }
      
      if (citation.relevance_score && citation.relevance_score < 7) {
        console.log(`❌ REJECTED - relevance score too low (${citation.relevance_score}): ${domain}`);
        continue;
      }
      
      // Active competitor verification for non-tier-1
      const domainInfo = approvedDomains.find((d: any) => d.domain === domain);
      const domainTier = domainInfo?.tier;
      const shouldVerify = domainTier !== 'tier_1' && citation.relevance_score < 9;
      
      if (shouldVerify) {
        console.log(`   🔍 Verifying competitor status for: ${domain}...`);
        const verification = await verifyNotCompetitor(citation.url, domain, perplexityApiKey);
        
        if (verification.isCompetitor && verification.confidence >= 7) {
          console.log(`   🚫 COMPETITOR DETECTED: ${domain}`);
          await addToBlacklist(domain, verification.businessType, supabaseClient);
          continue;
        }
        
        console.log(`   ✅ Verified safe: ${domain}`);
      }
      
      // SUCCESS!
      console.log(`\n✅ SUCCESS IN CHUNK ${chunkLabel}!`);
      console.log(`   Domain: ${domain}`);
      console.log(`   Relevance: ${citation.relevance_score}/10`);
      
      let authorityScore = citation.relevance_score || 7;
      if (domain.includes('.gov') || domain.includes('.gob')) authorityScore = Math.max(authorityScore, 9);
      
      return {
        url: citation.url,
        source: citation.title || 'Untitled Source',
        text: citation.quote || citation.claimMatch || '',
        relevanceScore: citation.relevance_score * 10 || 70,
        authorityScore,
        domain,
        chunkLabel
      };
      
    } catch (error) {
      console.error(`❌ Chunk ${chunkLabel} error:`, error);
    }
    
    if (i < maxChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log(`\n❌ No valid citation found in ${maxChunks} chunks (${totalDomainsSearched} domains)`);
  return null;
}

// ============================================
// OPEN WEB FALLBACK
// ============================================
async function findCitationWithOpenWebFallback(
  claim: string,
  language: string,
  articleTopic: string,
  supabase: any,
  perplexityApiKey: string
): Promise<any> {
  console.log(`\n🌐 OPEN WEB FALLBACK SEARCH`);
  console.log(`   Claim: "${claim.substring(0, 80)}..."`);

  try {
    const { data: blacklistedDomains } = await supabase
      .from('approved_domains')
      .select('domain')
      .eq('is_allowed', false);

    const databaseBlacklist = blacklistedDomains?.map((d: { domain: string }) => d.domain) || [];
    const allBlockedDomains = [...new Set([...COMPETITOR_AGENCIES, ...databaseBlacklist])];
    
    console.log(`🛑 Total blocked domains: ${allBlockedDomains.length}`);

    const excludedDomainsStr = allBlockedDomains.join(', ');
    
    const prompt = `Find ONE authoritative ${language} source that verifies this claim about "${articleTopic}":

"${claim}"

🛑 CRITICAL EXCLUSION RULES:
You MUST NEVER cite ANY of these ${allBlockedDomains.length} blocked domains:
${excludedDomainsStr}

Additionally, you MUST NEVER use:
- Real estate agency websites
- Property listing portals
- Real estate investment platforms
- Any site with "property", "inmobiliaria", "realestate", "vivienda" in domain

✅ ONLY cite these types of sources:
- Government websites (.gov, .gob.es)
- Official statistics bureaus (INE, Eurostat)
- Central banks and financial regulators
- News outlets (major newspapers, TV networks)
- Research institutions and universities

Return ONE citation in this exact JSON format:
{
  "url": "full URL with https://",
  "source": "official source name",
  "text": "brief quote or statement that verifies the claim",
  "specificity": 85
}`;

    const response = await fetch(PERPLEXITY_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
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

    if (!response.ok) {
      console.error(`❌ Perplexity API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      return null;
    }

    const citation = JSON.parse(jsonMatch[0]);

    if (!citation.url || !citation.source || !citation.text) {
      console.error('❌ Invalid citation structure');
      return null;
    }

    const url = new URL(citation.url);
    const domain = url.hostname.replace('www.', '');
    
    // Double-check domain is not blocked
    const databaseBlacklistSet = new Set<string>(databaseBlacklist);
    if (isBlockedCompetitorBulletproof(citation.url, domain, databaseBlacklistSet)) {
      console.log(`🛑 FALLBACK BLOCKED: ${domain} is a competitor`);
      return null;
    }

    console.log(`✅ Open web citation found: ${domain}`);

    return {
      url: citation.url,
      source: citation.source,
      text: citation.text,
      relevanceScore: citation.specificity || 80,
      authorityScore: 75,
      domain,
      isFromOpenWeb: true
    };

  } catch (error) {
    console.error(`❌ Open web fallback error:`, error);
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

  try {
    const {
      mode = 'fix_broken',
      auto_apply = true,
      use_approved_domains_only = true,
      diversity_threshold = 20,
      max_citations_per_article = 5,
      limit = 10,
      max_articles = 5
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🚀 Starting intelligent citation enhancement (limit: ${limit}, max_articles: ${max_articles})...`);

    // Get domain usage stats
    const { data: usageStats } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses');

    const usageMap = new Map(usageStats?.map(s => [s.domain, s.total_uses]) || []);

    // Find articles with broken citations
    const { data: brokenCitations, error: brokenError } = await supabase
      .from('external_citation_health')
      .select('url, status')
      .in('status', ['dead', 'broken', 'redirect_broken'])
      .limit(limit);

    if (brokenError) throw brokenError;

    console.log(`🔍 Found ${brokenCitations?.length || 0} broken citations`);

    // Find articles using those citations
    const brokenUrls = brokenCitations?.map(c => c.url) || [];
    const articlesMap = new Map();

    for (const url of brokenUrls) {
      const { data: articles } = await supabase.rpc('find_articles_with_citation', {
        citation_url: url,
        published_only: false
      });

      articles?.forEach((article: any) => {
        if (!articlesMap.has(article.id)) {
          articlesMap.set(article.id, article);
        }
      });
    }

    const articlesToFix = Array.from(articlesMap.values()).slice(0, max_articles);
    console.log(`📝 Processing ${articlesToFix.length} articles (max: ${max_articles})`);

    let totalCitationsAdded = 0;
    let articlesUpdated = 0;
    const domainsUsed = new Set<string>();

    // Process each article
    for (const article of articlesToFix) {
      try {
        console.log(`\n📄 Processing: ${article.headline}`);

        const externalCitations = Array.isArray(article.external_citations) 
          ? article.external_citations 
          : [];
        
        const brokenInArticle = externalCitations.filter((c: any) => 
          brokenUrls.includes(c.url)
        );

        console.log(`  ❌ ${brokenInArticle.length} broken citations to replace`);

        // Extract claims from article
        const claims = extractClaimsNeedingCitations(article.detailed_content);
        const claimsToProcess = claims.slice(0, Math.min(max_citations_per_article, 3));

        console.log(`  📋 Processing ${claimsToProcess.length} claims`);

        const newCitations = [];

        for (const claimData of claimsToProcess) {
          // Try tiered batch search first
          let citation = await findCitationWithTieredSearch(
            claimData.claim,
            article.language,
            article.headline,
            supabase,
            perplexityApiKey
          );

          // If tiered search fails, try open web fallback
          if (!citation) {
            console.log(`  🌐 Trying open web fallback...`);
            citation = await findCitationWithOpenWebFallback(
              claimData.claim,
              article.language,
              article.headline,
              supabase,
              perplexityApiKey
            );
          }

          if (citation) {
            // Check usage limit
            const currentUsage = usageMap.get(citation.domain) || 0;
            if (currentUsage >= diversity_threshold) {
              console.log(`  ⚠️ Domain ${citation.domain} exceeds diversity threshold (${currentUsage})`);
              continue;
            }

            newCitations.push({
              url: citation.url,
              source: citation.source,
              text: citation.text,
              number: newCitations.length + 1
            });

            domainsUsed.add(citation.domain);

            // Increment domain usage
            await supabase.rpc('increment_domain_usage', {
              p_domain: citation.domain,
              p_article_id: article.id
            });

            usageMap.set(citation.domain, (usageMap.get(citation.domain) || 0) + 1);

            console.log(`  ✅ Added citation: ${citation.source} (${citation.domain})`);
          }
        }

        if (newCitations.length === 0) {
          console.log(`  ⚠️ No valid citations found, skipping article`);
          continue;
        }

        // Create revision backup
        const { error: revisionError } = await supabase
          .from('article_revisions')
          .insert({
            article_id: article.id,
            revision_type: 'auto_citation_enhancement',
            previous_content: article.detailed_content,
            previous_citations: article.external_citations,
            change_reason: 'Intelligent auto-citation with tiered batch search',
            can_rollback: true
          });

        if (revisionError) {
          console.error(`  ❌ Failed to create revision: ${revisionError.message}`);
          continue;
        }

        // Merge with existing citations
        const keptCitations = externalCitations.filter((c: any) => 
          !brokenUrls.includes(c.url)
        );
        const allCitations = [...keptCitations, ...newCitations];

        // Update article
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            external_citations: allCitations,
            has_dead_citations: false,
            last_citation_check_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`  ❌ Failed to update article: ${updateError.message}`);
          continue;
        }

        totalCitationsAdded += newCitations.length;
        articlesUpdated++;
        console.log(`  ✅ Updated article with ${newCitations.length} new citations`);

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (articleError) {
        console.error(`  ❌ Error processing article:`, articleError);
        continue;
      }
    }

    console.log(`\n🎉 Enhancement complete!`);
    console.log(`  Articles updated: ${articlesUpdated}`);
    console.log(`  Citations added: ${totalCitationsAdded}`);
    console.log(`  Unique domains used: ${domainsUsed.size}`);

    return new Response(
      JSON.stringify({
        success: true,
        articlesUpdated,
        citationsAdded: totalCitationsAdded,
        domainsUsed: domainsUsed.size,
        domainsUsedList: Array.from(domainsUsed)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in auto-enhance-citations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
