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
      signal: AbortSignal.timeout(8000)
    });
    
    if (response.status === 200 || response.status === 403) {
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
        signal: AbortSignal.timeout(10000)
      });
      return getResponse.status === 200 || getResponse.status === 403;
    }
    
    return false;
  } catch (error) {
    console.error('URL verification error:', url, error);
    
    // For government domains, be more lenient with SSL/network errors
    if (isGov) {
      console.warn(`Accepting government URL despite verification error: ${url}`);
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
async function getOverusedDomains(supabase: any, limit: number = 20): Promise<string[]> {
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
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function checkUrlLanguage(url: string, language: string): boolean {
  const languagePatterns: Record<string, string[]> = {
    'es': ['.es', '.gob.es', 'spain', 'spanish', 'espana', 'espanol'],
    'en': ['.com', '.org', '.gov', '.uk', 'english'],
    'nl': ['.nl', 'dutch', 'netherlands', 'nederland'],
    'de': ['.de', 'german', 'deutschland'],
    'fr': ['.fr', 'french', 'france'],
  };
  
  const patterns = languagePatterns[language] || languagePatterns['es'];
  return patterns.some(pattern => url.includes(pattern));
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

    // Get blocked domains
    const blockedDomains = await getOverusedDomains(supabase, 20);

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
      ? `\n\n🚫 **CRITICAL: HARD-BLOCKED DOMAINS (NEVER use these):**\n${blockedDomains.map(d => `- ${d}`).join('\n')}\n\n**These domains exceed the 20-use limit. Select DIVERSE alternatives from 600+ approved domains.**`
      : '';

    const prompt = `${config.instruction}:

Article Topic: "${headline}"
Article Language: ${config.languageName}
Content Preview: ${content.substring(0, 2000)}

CRITICAL REQUIREMENTS:
- Return MINIMUM 2 citations, ideally 3-5 citations
- Prioritize official government sources (${config.domains.join(', ')})
- Include these types of sources: ${config.sources.join(', ')}
- ALL sources MUST be in ${config.languageName} language (no translations, no foreign sites)
- ALL sources must be HTTPS and currently active
- Sources must be DIRECTLY RELEVANT to the article topic: "${headline}"
- Authoritative sources only (government, educational, major institutions)
- For each source, identify WHERE in the article it should be cited
- **NEVER use blocked domains - select diverse, unused alternatives**${governmentRequirement}${blockedDomainsText}

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

    // ✅ Filter out blocked domains FIRST (before verification)
    const allowedCitations = citations.filter((citation: Citation) => {
      if (!citation.url || !citation.sourceName) return false;
      if (!citation.url.startsWith('http')) return false;
      
      const domain = extractDomain(citation.url);
      if (blockedDomains.includes(domain)) {
        console.warn(`🚫 BLOCKED: ${domain} - exceeds 20-use limit`);
        return false;
      }
      
      // Verify language matches
      const urlLower = citation.url.toLowerCase();
      const isCorrectLanguage = checkUrlLanguage(urlLower, language);
      
      if (!isCorrectLanguage) {
        console.warn(`Rejected ${citation.url} - language mismatch`);
        return false;
      }
      
      return true;
    });

    console.log(`${allowedCitations.length} citations passed filtering (${citations.length - allowedCitations.length} blocked)`);

    if (allowedCitations.length === 0) {
      throw new Error('All suggested citations were blocked or invalid');
    }

    console.log(`Verifying ${allowedCitations.length} URLs...`);

    // Verify each URL with retry logic
    const verifiedCitations = await Promise.all(
      allowedCitations.map(async (citation: Citation) => {
        const verified = await verifyUrlWithRetry(citation.url);
        return { ...citation, verified };
      })
    );

    const validCitations = verifiedCitations.filter(c => c.verified);
    console.log(`${validCitations.length} citations verified successfully`);

    // ✅ AUTHORITY SCORING - Prioritize high-quality sources
    const citationsWithScores = validCitations.map((citation: any) => {
      let authorityScore = 5; // baseline
      
      // Government/official sources (highest authority)
      if (isGovernmentDomain(citation.url)) authorityScore += 5;
      
      // Domain authority indicators
      if (citation.url.includes('.edu')) authorityScore += 4;
      if (citation.url.includes('.org')) authorityScore += 3;
      
      // Established real estate platforms
      const authoritative = ['idealista', 'kyero', 'propertyportal', 'boe.es', 'registradores', 'notariado', 'europa.eu'];
      if (authoritative.some(domain => citation.url.toLowerCase().includes(domain))) authorityScore += 4;
      
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
      console.error('No valid citations found after filtering and verification');
      throw new Error('Unable to find any verified citations that meet quality standards.');
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
