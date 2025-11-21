// Advanced Citation Discovery with Perplexity AI
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export interface BetterCitation {
  url: string;
  sourceName: string;
  description: string;
  relevance: string;
  authorityScore: number;
  language: string;
  suggestedContext: string;
  diversityScore?: number;
  usageCount?: number;
  finalScore?: number;
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

// ===== STRICT LANGUAGE MATCHING =====
async function getApprovedDomainsForLanguage(language: string): Promise<Array<{domain: string, category: string, language: string | null}>> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('approved_domains')
      .select('domain, category, language')
      .eq('is_allowed', true)
      .or(`language.eq.${language},language.eq.EU,language.eq.GLOBAL,language.eq.EU/GLOBAL`);
      
    if (error) {
      console.error('Error fetching approved domains:', error);
      return [];
    }
    
    console.log(`✅ Loaded ${data.length} approved domains for language: ${language.toUpperCase()}`);
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

// ===== SIMPLE AUTHORITY SCORING (No Usage Tracking) =====
interface DomainScore {
  domain: string;
  category: string;
  authorityScore: number;
}

/**
 * Calculate simple authority scores for approved domains
 * No usage tracking - rely on Gemini's natural diversity via Google Search
 */
function calculateSimpleAuthorityScores(
  approvedDomains: Array<{ domain: string; category: string; language: string | null }>
): Map<string, number> {
  const scores = new Map<string, number>();
  
  for (const { domain, category } of approvedDomains) {
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
    
    scores.set(domain, score);
  }
  
  return scores;
}

/**
 * Find better, more authoritative citations for an article
 */
export async function findBetterCitations(
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  currentCitations: string[],
  perplexityApiKey: string,
  focusArea?: string // e.g., "Costa del Sol real estate"
): Promise<BetterCitation[]> {
  
  const config = languageConfig[articleLanguage as keyof typeof languageConfig] || languageConfig.es;
  
  // ✅ Get blocked domains: competitors (is_allowed=false) + overused domains
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
  
  // ✅ Calculate simple authority scores (no usage tracking)
  const authorityScores = calculateSimpleAuthorityScores(approvedDomains);
  const highPriorityDomains = approvedDomains
    .map(d => ({
      domain: d.domain,
      category: d.category,
      score: authorityScores.get(d.domain) || 50
    }))
    .filter(d => d.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  console.log(`🎯 Prioritizing ${highPriorityDomains.length} high-authority domains`);

  const focusContext = focusArea 
    ? `\n**Special Focus:** ${focusArea} - prioritize sources specific to this region/topic`
    : '';

  const currentCitationsText = currentCitations.length > 0
    ? `\n**Current Citations to AVOID duplicating:**\n${currentCitations.slice(0, 10).join('\n')}`
    : '';

  const blockedDomainsText = blockedDomains.length > 0
    ? `\n\n🚫 **CRITICAL: NEVER use these blocked domains:**\n${blockedDomains.map(d => `- ${d}`).join('\n')}`
    : '';

  const prompt = `You are an expert research assistant finding authoritative external sources for a ${config.name} language article using Google Search.

**Article Topic:** "${articleTopic}"
**Language Required:** ${config.name}
**Article Content Preview (First 4000 chars):**
${articleContent.substring(0, 4000)}
${focusContext}
${currentCitationsText}
${blockedDomainsText}

**CRITICAL GUIDANCE FOR ${articleLanguage.toUpperCase()} ARTICLES ABOUT NON-${articleLanguage.toUpperCase()} TOPICS:**
- Prioritize INTERNATIONAL sources in ${config.name} language
- For topics about specific regions: Find international analysis rather than local government sites
- AVOID: Real estate agency websites, property portals, real estate brokerages, listing sites
- PREFER: Research institutions, statistical agencies, market analysis firms, academic studies, international organizations

**PREFERRED SOURCE TYPES (in order of priority):**
1. International statistical/economic agencies (EU, OECD, World Bank, Eurostat)
2. Academic research and university studies
3. International business/financial publications (Bloomberg, Financial Times, Reuters)
4. Market research and analysis firms
5. Official international organizations (UN, IMF, etc.)

**HIGH-PRIORITY APPROVED DOMAINS (prioritize these):**
${highPriorityDomains.slice(0, 20).map(d => `- ${d.domain} (${d.category}, authority: ${d.score})`).join('\n')}

**CRITICAL REQUIREMENTS:**
1. ALL sources MUST be in ${config.name} language
2. Prioritize INTERNATIONAL sources over local/regional ones
3. Sources must be HIGH AUTHORITY (research, statistical, international organizations)
4. Content must DIRECTLY relate to the article topic
5. Sources must be currently accessible (HTTPS, active)
6. Avoid duplicating current citations listed above
7. Find 5-8 diverse, authoritative sources **FROM DIFFERENT DOMAINS**
8. **NEVER use blocked domains - select from diverse, unused alternatives**
9. **MAXIMIZE DIVERSITY: Use different domains for each suggestion**
10. **AVOID all real estate agencies, brokerages, and property listing sites**

**Return ONLY valid JSON array in this EXACT format:**
[
  {
    "url": "https://example.gob.es/...",
    "sourceName": "Official Source Name",
    "description": "Brief description of what this source contains (1-2 sentences)",
    "relevance": "Why this source is relevant to the article topic",
    "authorityScore": 9,
    "language": "${articleLanguage}",
    "suggestedContext": "Where in the article this citation should appear (e.g., 'Legal requirements section', 'Market statistics')"
  }
]

Return only the JSON array, nothing else.`;

  console.log('Requesting better citations from Perplexity...');

  // Add 90-second timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s

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
            content: `You are an expert research assistant finding authoritative ${config.name}-language INTERNATIONAL sources. ${blockedDomains.length > 0 ? `NEVER use these blocked domains: ${blockedDomains.join(', ')}. ` : ''}NEVER suggest real estate agencies, brokerages, or property listing sites. Prioritize international research, statistics, and academic sources. Return ONLY valid JSON arrays. Never duplicate provided citations. Prioritize diverse, unused domains.`
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

    console.log('Perplexity response:', citationsText.substring(0, 300));

    try {
    // Extract JSON from response
    const jsonMatch = citationsText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const citations = JSON.parse(jsonMatch[0]) as BetterCitation[];

    // ✅ STRICT WHITELISTING: Only allow explicitly approved domains
    const allowedDomainSet = new Set(approvedDomains.map(d => d.domain));
    const authorityScoresMap = calculateSimpleAuthorityScores(approvedDomains);
    
    const validCitations = citations.filter(citation => {
      const domain = extractDomain(citation.url);
      
      // 1. Check if explicitly blocked (competitor or overused)
      if (blockedDomains.includes(domain)) {
        console.warn(`🚫 REJECTED blocked domain: ${domain}`);
        return false;
      }
      
      // 2. STRICT WHITELIST: Must be in approved list for this language
      if (!allowedDomainSet.has(domain)) {
        console.warn(`❌ REJECTED uncategorized domain: ${domain} (not in ${articleLanguage.toUpperCase()} approved list)`);
        return false;
      }
      
      // 3. Basic validation
      return citation.url && 
             citation.sourceName && 
             citation.url.startsWith('http') &&
             !currentCitations.includes(citation.url);
    });

    console.log(`Filtered ${citations.length} → ${validCitations.length} citations (removed ${citations.length - validCitations.length} blocked/wrong-language)`);

    // ✅ Add authority scores and sort
    const scoredCitations = validCitations.map((citation) => {
      const domain = extractDomain(citation.url);
      const authorityScore = authorityScoresMap.get(domain) || 50;
      
      return {
        ...citation,
        authorityScore: citation.authorityScore || authorityScore,
        finalScore: citation.authorityScore || authorityScore
      };
    });

    // Sort by authority score
    scoredCitations.sort((a: any, b: any) => b.finalScore - a.finalScore);

    console.log(`🎯 Authority-sorted citations. Top domains: ${scoredCitations.slice(0, 5).map((c: any) => extractDomain(c.url)).join(', ')}`);

    // ✅ Validate government source presence
    const govCitations = scoredCitations.filter((c: any) => 
      c.url.includes('.gov') || 
      c.url.includes('.gob.es') || 
      c.url.includes('.europa.eu') ||
      c.url.includes('.overheid.nl')
    );

    console.log(`✅ Found ${govCitations.length} government citations out of ${scoredCitations.length} total`);

    // If no government sources found, log warning but don't fail
    if (govCitations.length === 0) {
      console.warn('⚠️  No government sources found - consider manual review');
    }

    return scoredCitations.slice(0, 10);
    } catch (parseError) {
      clearTimeout(timeoutId);
      console.error('Failed to parse citations:', parseError);
      console.error('Raw response:', citationsText);
      throw new Error('Failed to parse citation recommendations');
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Perplexity API timeout after 90 seconds');
      throw new Error('Citation search timed out - try again or add citations manually');
    }
    throw error;
  }
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
