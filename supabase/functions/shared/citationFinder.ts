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
async function getApprovedDomainsForLanguage(language: string): Promise<Array<{domain: string, category: string}>> {
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
    return data.map((d: any) => ({ domain: d.domain, category: d.category || d.domain }));
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

// ===== DIVERSITY SCORING =====
interface DomainScore {
  domain: string;
  category: string;
  usageCount: number;
  diversityScore: number; // Higher = better for selection
}

async function calculateDomainDiversityScores(
  approvedDomains: Array<{domain: string, category: string}>,
  language: string
): Promise<DomainScore[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch usage stats for all approved domains
    const { data: usageData, error } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses')
      .in('domain', approvedDomains.map(d => d.domain));
    
    if (error) {
      console.error('Error fetching usage stats:', error);
    }
    
    const usageMap = new Map(usageData?.map(d => [d.domain, d.total_uses]) || []);
    
    return approvedDomains.map(d => {
      const usageCount = usageMap.get(d.domain) || 0;
      
      // Diversity score formula:
      // - Unused domains get 100 points
      // - Each use reduces score by 5 points
      // - Max penalty at 20 uses (hard block)
      const diversityScore = Math.max(0, 100 - (usageCount * 5));
      
      return {
        domain: d.domain,
        category: d.category,
        usageCount,
        diversityScore
      };
    });
  } catch (error) {
    console.error('Failed to calculate diversity scores:', error);
    return approvedDomains.map(d => ({
      domain: d.domain,
      category: d.category,
      usageCount: 0,
      diversityScore: 100
    }));
  }
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
  
  // ✅ Get blocked domains AND language-filtered approved domains
  const blockedDomains = await getOverusedDomains(20);
  const approvedDomains = await getApprovedDomainsForLanguage(articleLanguage);
  
  // ✅ Calculate diversity scores for prioritization
  const domainScores = await calculateDomainDiversityScores(approvedDomains, articleLanguage);
  
  // Sort by diversity score and take top 100 for the prompt
  const prioritizedDomains = domainScores
    .filter(d => d.diversityScore > 0) // Exclude blocked domains
    .sort((a, b) => b.diversityScore - a.diversityScore)
    .slice(0, 100);

  const focusContext = focusArea 
    ? `\n**Special Focus:** ${focusArea} - prioritize sources specific to this region/topic`
    : '';

  const currentCitationsText = currentCitations.length > 0
    ? `\n**Current Citations to AVOID duplicating:**\n${currentCitations.slice(0, 10).join('\n')}`
    : '';

  const blockedDomainsText = blockedDomains.length > 0
    ? `\n\n🚫 **CRITICAL: HARD-BLOCKED DOMAINS (NEVER use these):**\n${blockedDomains.map(d => `- ${d}`).join('\n')}\n\n**These domains exceed the 20-use limit. Find DIVERSE alternatives from our approved domains.**`
    : '';

  // ✅ DIVERSITY-PRIORITIZED WHITELIST
  const priority1 = prioritizedDomains.filter(d => d.usageCount === 0);
  const priority2 = prioritizedDomains.filter(d => d.usageCount > 0 && d.usageCount < 5);
  const priority3 = prioritizedDomains.filter(d => d.usageCount >= 5 && d.usageCount < 10);

  const diversityWhitelistText = `\n\n✅ **DIVERSITY-PRIORITIZED ${articleLanguage.toUpperCase()} SOURCES (USE IN ORDER):**

**PRIORITY 1 - NEVER USED (diversityScore: 100):**
${priority1.slice(0, 20).map(d => `- ${d.domain} (${d.category})`).join('\n')}
${priority1.length > 20 ? `...and ${priority1.length - 20} more unused domains\n` : ''}

**PRIORITY 2 - LIGHTLY USED (diversityScore: 75-95):**
${priority2.slice(0, 15).map(d => `- ${d.domain} (${d.category}, used ${d.usageCount}x)`).join('\n')}

**PRIORITY 3 - MODERATELY USED (diversityScore: 50-70):**
${priority3.slice(0, 10).map(d => `- ${d.domain} (used ${d.usageCount}x)`).join('\n')}

**⚠️ INSTRUCTIONS:**
1. ALWAYS prefer domains with diversityScore > 80 (unused/rarely used)
2. If suggesting 5 citations, use 5 DIFFERENT domains
3. Prioritize government (.gov, .gob) and EU institutions over news
4. Only use tier_2 sources if no tier_1 alternatives exist`;

  const prompt = `You are an expert research assistant finding authoritative external sources for a ${config.name} language article.

**Article Topic:** "${articleTopic}"
**Language Required:** ${config.name}
**Article Content Preview:**
${articleContent.substring(0, 1000)}
${focusContext}
${currentCitationsText}${blockedDomainsText}${diversityWhitelistText}

**CRITICAL REQUIREMENTS:**
1. ALL sources MUST be in ${config.name} language
2. Prioritize domains from PRIORITY 1 (unused) and PRIORITY 2 (lightly used)
3. Sources must be HIGH AUTHORITY (government, educational, official organizations)
4. Content must DIRECTLY relate to the article topic
5. Sources must be currently accessible (HTTPS, active)
6. Avoid duplicating current citations listed above
7. Find 5-8 diverse, authoritative sources **FROM DIFFERENT DOMAINS**
8. **NEVER use blocked domains - select from diverse, unused alternatives**
9. **MAXIMIZE DIVERSITY: Use different domains for each suggestion**

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

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
          content: `You are an expert research assistant finding authoritative ${config.name}-language sources. ${blockedDomains.length > 0 ? `NEVER use these blocked domains: ${blockedDomains.join(', ')}. ` : ''}Return ONLY valid JSON arrays. Never duplicate provided citations. Prioritize diverse, unused domains.`
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

    // ✅ Filter out blocked domains AND enforce language matching
    const allowedDomainSet = new Set(approvedDomains.map(d => d.domain));
    const domainScoresMap = new Map(domainScores.map(d => [d.domain, d]));
    
    const validCitations = citations.filter(citation => {
      const domain = extractDomain(citation.url);
      
      // Check if blocked
      if (blockedDomains.includes(domain)) {
        console.warn(`🚫 REJECTED overused domain: ${domain}`);
        return false;
      }
      
      // Check if in language whitelist
      if (!allowedDomainSet.has(domain)) {
        console.warn(`❌ REJECTED wrong language domain: ${domain} (not in ${articleLanguage.toUpperCase()} whitelist)`);
        return false;
      }
      
      // Basic validation
      return citation.url && 
             citation.sourceName && 
             citation.url.startsWith('http') &&
             !currentCitations.includes(citation.url);
    });

    console.log(`Filtered ${citations.length} → ${validCitations.length} citations (removed ${citations.length - validCitations.length} blocked/wrong-language)`);

    // ✅ POST-SELECTION DIVERSITY SCORING
    const scoredCitations = validCitations.map((citation) => {
      const domain = extractDomain(citation.url);
      const domainScore = domainScoresMap.get(domain);
      
      return {
        ...citation,
        diversityScore: domainScore?.diversityScore || 0,
        usageCount: domainScore?.usageCount || 0,
        finalScore: citation.authorityScore + (domainScore?.diversityScore || 0) / 10
      };
    });

    // Sort by final score (authority + diversity bonus)
    scoredCitations.sort((a: any, b: any) => b.finalScore - a.finalScore);

    console.log(`🎯 Diversity-sorted citations. Top domain usage counts: ${scoredCitations.slice(0, 5).map((c: any) => `${extractDomain(c.url)}(${c.usageCount})`).join(', ')}`);

    return scoredCitations.slice(0, 10);
  } catch (parseError) {
    console.error('Failed to parse citations:', parseError);
    console.error('Raw response:', citationsText);
    throw new Error('Failed to parse citation recommendations');
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
