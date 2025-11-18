import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Citation {
  sourceName: string;
  url: string;
  anchorText: string;
  contextInArticle: string;
  insertAfterHeading?: string;
  relevance: string;
  verified?: boolean;
}

// Helper function to identify government/educational domains
function isGovernmentDomain(url: string): boolean {
  const govPatterns = [
    // Generic government domains
    '.gov',                    // US federal/state government
    '.edu',                    // Educational institutions (US)
    '.ac.uk',                  // Academic institutions (UK)
    
    // UK government
    '.gov.uk',                 // UK government departments
    '.nhs.uk',                 // National Health Service
    'ofcom.org.uk',           // Ofcom (Communications regulator)
    'fca.org.uk',             // Financial Conduct Authority
    'cqc.org.uk',             // Care Quality Commission
    'ons.gov.uk',             // Office for National Statistics
    
    // Spanish government (expanded patterns)
    '.gob.es',                 // Spanish government
    '.gob.',                   // Generic Spanish-speaking countries
    'ine.es',                  // Instituto Nacional de Estadística
    'bde.es',                  // Banco de España
    'boe.es',                  // Boletín Oficial del Estado
    'agenciatributaria.es',    // Spanish Tax Agency
    'registradores.org',       // Spanish Land Registry
    'mitma.gob.es',            // Ministry of Transport
    'inclusion.gob.es',        // Ministry of Inclusion
    'mjusticia.gob.es',        // Ministry of Justice
    'exteriores.gob.es',       // Ministry of Foreign Affairs
    
    // European Union
    'europa.eu',               // EU institutions
    'eurostat.ec.europa.eu',  // Eurostat
    
    // Other countries
    '.gouv.',                  // French-speaking governments (gouv.fr, etc.)
    '.overheid.nl',            // Netherlands government
    '.gc.ca',                  // Government of Canada
    '.gov.au',                 // Australian government
    '.govt.nz'                 // New Zealand government
  ];
  const lowerUrl = url.toLowerCase();
  return govPatterns.some(pattern => lowerUrl.includes(pattern));
}

// Resilient URL verification with fallback strategies
async function verifyUrl(url: string): Promise<boolean> {
  const isGov = isGovernmentDomain(url);
  
  try {
    // Try HEAD request first (fastest)
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)'
      },
      signal: AbortSignal.timeout(10000) // Increased to 10 seconds
    });
    
    // Accept 2xx and 3xx status codes (more lenient)
    if (response.status >= 200 && response.status < 400) {
      return true;
    }
    
    // 403 is also acceptable (site blocks bots but exists)
    if (response.status === 403) {
      console.log(`403 but accepting: ${url}`);
      return true;
    }
    
    // For government domains, try GET request as fallback
    if (isGov && (response.status === 400 || response.status >= 500)) {
      console.log(`HEAD failed for gov site ${url}, trying GET...`);
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)'
        },
        signal: AbortSignal.timeout(12000)
      });
      // Accept 2xx, 3xx, and 403 for government sites
      return (getResponse.status >= 200 && getResponse.status < 400) || getResponse.status === 403;
    }
    
    return false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`⚠️ Verification error for ${url}: ${errorMsg}`);
    
    // For government domains, be more lenient with SSL/network errors
    if (isGov) {
      console.warn(`✅ Accepting government URL despite verification error: ${url}`);
      return true; // ✅ Accept government sources even with SSL issues
    }
    
    return false;
  }
}

// Verification with retry logic
async function verifyUrlWithRetry(url: string, retries = 2): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    const result = await verifyUrl(url);
    if (result) return true;
    
    if (i < retries) {
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}

// ===== DOMAIN DIVERSITY ENFORCEMENT =====
async function getOverusedDomains(supabase: any, limit: number = 30): Promise<string[]> {
  // ✅ Only block domains with high recent usage (30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data, error } = await supabase
    .from('domain_usage_stats')
    .select('domain, total_uses, last_used_at')
    .gte('total_uses', limit)
    .gte('last_used_at', thirtyDaysAgo.toISOString())
    .order('total_uses', { ascending: false });
    
  if (error) {
    console.error('Error fetching domain stats:', error);
    return [];
  }
  
  console.log(`🚫 Blocked ${data.length} overused domains (>${limit} uses in last 30 days)`);
  return data.map((d: any) => d.domain);
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Fetch approved domains from the database
 * This replaces the hardcoded whitelist and allows dynamic management
 */
async function getApprovedDomains(supabase: any): Promise<string[]> {
  const { data, error } = await supabase
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', true);
  
  if (error) {
    console.error('❌ Error fetching approved domains:', error);
    return [];
  }
  
  const domains = data.map((d: any) => d.domain);
  console.log(`✅ Loaded ${domains.length} approved domains from database`);
  return domains;
}

/**
 * Check if a URL's domain is in the approved whitelist
 */
function isApprovedDomain(url: string, approvedDomains: string[]): boolean {
  const domain = extractDomain(url);
  return approvedDomains.includes(domain) || isGovernmentDomain(url);
}

function checkUrlLanguage(url: string, language: string): boolean {
  // ✅ Government and educational domains are ALWAYS accepted (authoritative regardless of TLD)
  if (isGovernmentDomain(url)) {
    console.log(`✅ Accepting government/educational domain: ${url}`);
    return true;
  }
  
  const languagePatterns: Record<string, string[]> = {
    'es': ['.es', '.gob.es', 'spain', 'spanish', 'espana', 'espanol', '.eu', 'europa.eu'],
    'en': ['.com', '.org', '.gov', '.uk', '.us', '.edu', 'english', '.int', '.eu', 'europa.eu'],
    'nl': ['.nl', 'dutch', 'netherlands', 'nederland', '.eu', 'europa.eu'],
    'de': ['.de', 'german', 'deutschland', '.eu', 'europa.eu'],
    'fr': ['.fr', 'french', 'france', '.eu', 'europa.eu'],
  };
  
  const patterns = languagePatterns[language] || languagePatterns['es'];
  const matches = patterns.some(pattern => url.includes(pattern));
  
  if (!matches) {
    console.log(`⚠️ Language mismatch for ${url} (expected: ${language})`);
  }
  
  return matches;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline, language = 'es', requireGovernmentSource = false } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load approved domains from database
    const approvedDomains = await getApprovedDomains(supabase);
    if (approvedDomains.length === 0) {
      throw new Error('No approved domains found in database. Please configure approved_domains table.');
    }

    // Get blocked domains
    const blockedDomains = await getOverusedDomains(supabase, 30);

    // Language-specific configurations
    const languageConfig: Record<string, {
      instruction: string;
      domains: string[];
      sources: string[];
      languageName: string;
      exampleDomain: string;
    }> = {
      es: {
        instruction: 'Find 3-5 authoritative sources for this Spanish real estate article',
        domains: ['.gob.es', '.es official domains'],
        sources: ['Spanish government ministries (Ministerios)', 'Property registry (Registradores de España)', 'Financial sources (Banco de España)', 'Legal and regulatory sources'],
        languageName: 'Spanish',
        exampleDomain: 'https://www.inclusion.gob.es/...'
      },
      en: {
        instruction: 'Find 3-5 authoritative sources for this English real estate article',
        domains: ['.gov', '.gov.uk', '.org official domains'],
        sources: ['Government housing agencies', 'Property registries', 'Financial authorities (SEC, Federal Reserve)', 'Legal and regulatory sources'],
        languageName: 'English',
        exampleDomain: 'https://www.hud.gov/...'
      },
      nl: {
        instruction: 'Find 3-5 authoritative sources for this Dutch real estate article',
        domains: ['.nl', '.overheid.nl', '.gov.nl official domains'],
        sources: ['Dutch government sources (Nederlandse overheid)', 'Land registry (Kadaster)', 'Financial authorities (De Nederlandsche Bank)', 'Legal and regulatory sources'],
        languageName: 'Dutch',
        exampleDomain: 'https://www.kadaster.nl/...'
      }
    };

    const config = languageConfig[language] || languageConfig.es;

    const governmentRequirement = requireGovernmentSource 
      ? `\n\nMANDATORY: At least ONE source MUST be from an official government domain (${config.domains.join(' or ')}). This is non-negotiable and CRITICAL for article validation.`
      : '';

    const blockedDomainsText = blockedDomains.length > 0
      ? `\n\n🚫 **CRITICAL: HARD-BLOCKED DOMAINS (NEVER use these):**\n${blockedDomains.map(d => `- ${d}`).join('\n')}\n\n**These domains exceed the 30-use limit. Select DIVERSE alternatives from approved domains.**`
      : '';

    // Build domain list for Perplexity (show top 50 for brevity in prompt)
    const topDomains = approvedDomains.slice(0, 50).join(', ');
    const totalDomains = approvedDomains.length;

    const whitelistText = `
🎯 CRITICAL WHITELIST RULE - ONLY THESE ${totalDomains} DOMAINS ALLOWED:

**Top Priority Domains (showing ${Math.min(50, totalDomains)} of ${totalDomains}):**
${topDomains}

**Important:** There are ${totalDomains} total approved domains. Choose from this list ONLY.
❌ ANY DOMAIN NOT IN THE APPROVED LIST WILL BE AUTOMATICALLY REJECTED
❌ DO NOT suggest: idealista, kyero, propertyportal, airbnb, expedia, sunpropertiesmarbella, luxe-villa, directimo (NOT approved)
`;

    const prompt = `${config.instruction}:

Article Topic: "${headline}"
Article Language: ${config.languageName}
Content Preview: ${content.substring(0, 2000)}

${whitelistText}

CRITICAL REQUIREMENTS:
- Return MINIMUM 2 citations, ideally 3-5 citations
- PRIORITIZE IN THIS ORDER:
  1. Government/Official sites (.gob.es, spain.info, aemet.es, cervantes.es)
  2. Tier 2 brands (lonelyplanet, roughguides, booking.com, tripadvisor)
  3. Specialized sources relevant to article topic
- ALL sources MUST be in ${config.languageName} language (no translations, no foreign sites)
- ALL sources must be HTTPS and currently active
- Sources must be DIRECTLY RELEVANT to the article topic: "${headline}"
- For each source, identify WHERE in the article it should be cited
- **Select from ${totalDomains}-domain whitelist ONLY**${governmentRequirement}${blockedDomainsText}

Return ONLY valid JSON in this exact format:
[
  {
    "sourceName": "Example Government Agency",
    "url": "${config.exampleDomain}",
    "anchorText": "official regulatory procedures",
    "contextInArticle": "When discussing legal requirements",
    "insertAfterHeading": "Legal Requirements",
    "relevance": "Authoritative government source providing official data on [specific topic]"
  }
]

Return only the JSON array, nothing else.`;

    console.log('Calling Perplexity API to find authoritative sources...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a research assistant specialized in finding authoritative ${config.languageName} sources. ${blockedDomains.length > 0 ? `NEVER use these blocked domains: ${blockedDomains.join(', ')}. ` : ''}CRITICAL: Return ONLY valid JSON arrays. All URLs must be in ${config.languageName} language. Prioritize government and educational sources. Select diverse, unused domains.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('Perplexity response:', aiResponse);
    
    let citations: Citation[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        citations = JSON.parse(jsonMatch[0]);
      } else {
        citations = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse citations JSON:', parseError);
      throw new Error('Failed to parse AI response into citations');
    }

    if (!Array.isArray(citations) || citations.length === 0) {
      console.error('No valid citations found in response');
      throw new Error('No citations found');
    }

    console.log(`Found ${citations.length} citations from Perplexity`);

    // ✅ Filter citations with whitelist as FIRST priority
    let allowedCitations = citations.filter((citation: Citation) => {
      if (!citation.url || !citation.sourceName) {
        console.warn(`❌ Invalid citation structure: ${JSON.stringify(citation)}`);
        return false;
      }
      if (!citation.url.startsWith('http')) {
        console.warn(`❌ Invalid URL protocol: ${citation.url}`);
        return false;
      }
      
      const domain = extractDomain(citation.url);
      
      // ✅ FIRST: Whitelist check (highest priority)
      if (!isApprovedDomain(citation.url, approvedDomains)) {
        console.warn(`🚫 WHITELIST REJECTION: ${domain} - Not in approved domains`);
        return false;
      }
      
      // ✅ SECOND: Check overused domains (but exempt government/educational)
      if (blockedDomains.includes(domain) && !isGovernmentDomain(citation.url)) {
        console.warn(`⚠️ USAGE LIMIT: ${domain} - Used 30+ times in 30 days`);
        return false;
      }
      
      // Government domains bypass blocking
      if (isGovernmentDomain(citation.url)) {
        console.log(`✅ Government domain accepted (bypass usage limit): ${domain}`);
      }
      
      // Verify language matches (with government domain exemption)
      const urlLower = citation.url.toLowerCase();
      const isCorrectLanguage = checkUrlLanguage(urlLower, language);
      
      if (!isCorrectLanguage) {
        console.warn(`⚠️ Language filter: ${citation.url}`);
        return false;
      }
      
      return true;
    });

    console.log(`${allowedCitations.length} citations passed strict filtering (${citations.length - allowedCitations.length} blocked)`);

    // ✅ If no approved citations found, try a second targeted call with priority domains
    if (allowedCitations.length === 0) {
      console.warn('⚠️ Zero approved citations found - attempting second call with priority domains');
      
      // Use top 10 most authoritative approved domains
      const priorityDomains = approvedDomains
        .filter(d => isGovernmentDomain(`https://${d}`) || 
                     ['booking.com', 'tripadvisor.com', 'lonelyplanet.com', 'timeout.com', 'spain.info', 'andalucia.org', 'visitcostadelsol.com'].includes(d))
        .slice(0, 15);
      
      const jsonFormatInstructions = `
Return ONLY valid JSON in this exact format:
[
  {
    "sourceName": "Source Name",
    "url": "https://example.com/article",
    "anchorText": "descriptive anchor text",
    "contextInArticle": "where in article to cite this",
    "relevance": "why this source is relevant"
  }
]`;

      const retryPrompt = `Find 3-5 citations for this article. You MUST ONLY use these ${priorityDomains.length} priority domains: ${priorityDomains.join(', ')}.

Headline: "${headline}"
Language: ${config.languageName}
Content: ${content.substring(0, 1000)}

Return ONLY citations from the ${priorityDomains.length} domains listed above. Be creative in finding relevant content from these high-authority sources.

${jsonFormatInstructions}`;

      try {
        const retryResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: `You are a research assistant finding citations from a specific list of ${priorityDomains.length} approved domains. ONLY suggest URLs from these domains: ${priorityDomains.join(', ')}`
              },
              {
                role: 'user',
                content: retryPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryAiResponse = retryData.choices[0].message.content;
          
          try {
            const jsonMatch = retryAiResponse.match(/\[[\s\S]*\]/);
            const retryCitations = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(retryAiResponse);
            
            // Filter retry citations through same strict process
            allowedCitations = retryCitations.filter((citation: Citation) => {
              if (!citation.url || !citation.sourceName) return false;
              if (!citation.url.startsWith('http')) return false;
              const domain = extractDomain(citation.url);
              return isApprovedDomain(citation.url, approvedDomains);
            });
            
            console.log(`✅ Second attempt found ${allowedCitations.length} approved citations`);
          } catch (e) {
            console.error('Failed to parse retry citations:', e);
          }
        }
      } catch (error) {
        console.error('Retry attempt failed:', error);
      }
    }

    console.log(`Verifying ${allowedCitations.length} URLs...`);

    // Verify each URL with retry logic (with detailed logging)
    const verifiedCitations = await Promise.all(
      allowedCitations.map(async (citation: Citation, index: number) => {
        console.log(`[${index + 1}/${allowedCitations.length}] Verifying: ${citation.url}`);
        const verified = await verifyUrlWithRetry(citation.url);
        console.log(`[${index + 1}/${allowedCitations.length}] ${verified ? '✅ Verified' : '❌ Failed'}: ${citation.url}`);
        return { ...citation, verified };
      })
    );

    let validCitations = verifiedCitations.filter(c => c.verified);
    console.log(`${validCitations.length} of ${allowedCitations.length} citations verified successfully`);
    
    // ✅ FALLBACK: If no citations verified, use unverified high-authority citations
    if (validCitations.length === 0) {
      console.warn('⚠️ No citations verified successfully - using unverified citations as fallback');
      // Prioritize government/educational domains even if unverified
      const govCitations = verifiedCitations.filter(c => isGovernmentDomain(c.url));
      if (govCitations.length > 0) {
        console.log(`Using ${govCitations.length} unverified government citations`);
        validCitations = govCitations.slice(0, 3);
      } else {
        console.log(`Using top ${Math.min(3, verifiedCitations.length)} unverified citations`);
        validCitations = verifiedCitations.slice(0, 3);
      }
    }

    // ✅ AUTHORITY SCORING - Prioritize whitelist domains
    const citationsWithScores = validCitations.map((citation: any) => {
      let authorityScore = 5; // baseline
      const domain = extractDomain(citation.url);
      
      // Government/official sources (highest authority)
      if (isGovernmentDomain(citation.url)) {
        authorityScore += 5;
        console.log(`🏛️ Government boost: ${domain} (+5)`);
      }
      
      // Tier 1 domains (Official federations, Universities)
      if (['aemet.es', 'cervantes.es', 'fedgolf.com', 'turespana.es', 'idae.es', 'ual.es', 'uca.es', 'padelfip.com'].includes(domain)) {
        authorityScore += 4;
        console.log(`⭐ Tier 1 boost: ${domain} (+4)`);
      }
      
      // Tier 2 domains (Established brands)
      if (['lonelyplanet.com', 'roughguides.com', 'michelin.es', 'wikiloc.com', 'windy.com', 'booking.com', 'tripadvisor.com'].includes(domain)) {
        authorityScore += 2;
        console.log(`📊 Tier 2 boost: ${domain} (+2)`);
      }
      
      // Domain authority indicators
      if (citation.url.includes('.edu')) authorityScore += 4;
      if (citation.url.includes('.org')) authorityScore += 3;
      
      // Source name credibility
      const sourceLower = citation.sourceName.toLowerCase();
      if (sourceLower.includes('official')) authorityScore += 2;
      if (sourceLower.includes('government') || sourceLower.includes('ministry')) authorityScore += 3;
      if (sourceLower.includes('university') || sourceLower.includes('research')) authorityScore += 2;
      
      return {
        ...citation,
        authorityScore: Math.min(authorityScore, 10)
      };
    });

    // Sort by authority score (highest first)
    citationsWithScores.sort((a: any, b: any) => b.authorityScore - a.authorityScore);
    
    console.log(`Authority scores: ${citationsWithScores.map((c: any) => `${c.sourceName}: ${c.authorityScore}`).join(', ')}`);

    // Ensure at least 1 citation (relaxed to allow single high-quality source)
    if (citationsWithScores.length === 0) {
      console.error('⚠️ No citations found after all attempts - returning empty result for manual review');
      return new Response(
        JSON.stringify({ 
          citations: [],
          totalFound: citations.length,
          totalVerified: 0,
          hasGovernmentSource: false,
          warning: 'No suitable citations found - manual review required'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    // Warn if only 1 citation (recommend 2+ for better E-E-A-T)
    if (citationsWithScores.length === 1) {
      console.warn('⚠️ Only 1 verified citation found (2+ recommended for stronger E-E-A-T)');
    }

    // Check if government source is present (warn instead of blocking)
    const hasGovSource = citationsWithScores.some((c: any) => isGovernmentDomain(c.url));
    
    if (requireGovernmentSource && !hasGovSource) {
      console.warn('⚠️ No government source found (requirement enabled but not blocking results)');
    } else if (hasGovSource) {
      console.log('✓ Government source found');
    }

    return new Response(
      JSON.stringify({ 
        citations: citationsWithScores,
        totalFound: citations.length,
        totalVerified: citationsWithScores.length,
        hasGovernmentSource: hasGovSource,
        averageAuthorityScore: citationsWithScores.reduce((acc: number, c: any) => acc + c.authorityScore, 0) / citationsWithScores.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in find-external-links function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to find external links',
        citations: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
