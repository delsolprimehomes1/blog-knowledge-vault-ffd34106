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
  semanticScore?: number;
  targetSection?: string;
}

interface ArticleSection {
  heading: string;
  content: string;
  keywords: string[];
  citationNeeds: string;
}

interface DomainCategory {
  name: string;
  domains: string[];
  topics: string[];
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
 * Fetch approved domains from the database organized by category
 * Phase 1: Return ALL domains with category information
 */
async function getApprovedDomainsByCategory(supabase: any): Promise<DomainCategory[]> {
  const { data, error } = await supabase
    .from('approved_domains')
    .select('domain, category, tier')
    .eq('is_allowed', true)
    .order('category');
  
  if (error) {
    console.error('❌ Error fetching approved domains:', error);
    return [];
  }
  
  // Group domains by category
  const categoryMap = new Map<string, Set<string>>();
  data.forEach((d: any) => {
    const category = d.category || 'General';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Set());
    }
    categoryMap.get(category)!.add(d.domain);
  });
  
  // Phase 2: Map categories to relevant topics
  const topicMapping: Record<string, string[]> = {
    'Government & Legal': ['legal requirements', 'regulations', 'permits', 'official procedures', 'government policy', 'compliance', 'licensing'],
    'Real Estate & Property': ['property market', 'real estate', 'housing prices', 'property investment', 'buying property', 'rental market'],
    'Finance & Banking': ['mortgages', 'financial planning', 'banking', 'investment', 'tax', 'financial advice'],
    'Tourism & Travel': ['tourism', 'travel', 'attractions', 'destinations', 'vacation', 'accommodation', 'activities'],
    'Climate & Weather': ['weather', 'climate', 'temperature', 'rainfall', 'seasons', 'meteorology'],
    'Education & Language': ['education', 'language learning', 'schools', 'universities', 'courses', 'certifications'],
    'Healthcare & Insurance': ['healthcare', 'medical', 'insurance', 'health system', 'doctors', 'hospitals'],
    'Sports & Recreation': ['golf', 'padel', 'sports', 'fitness', 'outdoor activities', 'recreation'],
    'Gastronomy & Lifestyle': ['restaurants', 'cuisine', 'food', 'dining', 'culinary', 'lifestyle'],
    'Transportation': ['transport', 'roads', 'public transport', 'driving', 'infrastructure', 'connectivity'],
    'Sustainability & Energy': ['sustainability', 'renewable energy', 'environment', 'green energy', 'ecology'],
    'Culture & Heritage': ['culture', 'heritage', 'history', 'museums', 'arts', 'traditions'],
    'Business & Economy': ['business', 'economy', 'commerce', 'trade', 'employment', 'economic data']
  };
  
  const categories: DomainCategory[] = [];
  categoryMap.forEach((domains, categoryName) => {
    categories.push({
      name: categoryName,
      domains: Array.from(domains),
      topics: topicMapping[categoryName] || []
    });
  });
  
  const totalDomains = data.length;
  console.log(`✅ Loaded ${totalDomains} approved domains across ${categories.length} categories`);
  
  return categories;
}

/**
 * Legacy function for backward compatibility
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

/**
 * Phase 3: Parse article into sections for paragraph-level context
 */
function parseArticleSections(content: string, headline: string): ArticleSection[] {
  const sections: ArticleSection[] = [];
  
  // Split by h2/h3 headings
  const headingPattern = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
  const parts = content.split(headingPattern);
  
  // First section (intro before any heading)
  if (parts[0] && parts[0].trim()) {
    const text = parts[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    sections.push({
      heading: 'Introduction',
      content: text, // Keep full section content for Perplexity
      keywords: extractKeywords(text),
      citationNeeds: identifyCitationNeeds(text, headline)
    });
  }
  
  // Process remaining sections
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i];
    const sectionContent = parts[i + 1] || '';
    const text = sectionContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (text.length > 50) {
      sections.push({
        heading: heading.trim(),
        content: text, // Keep full section content for Perplexity
        keywords: extractKeywords(text),
        citationNeeds: identifyCitationNeeds(text, heading)
      });
    }
  }
  
  console.log(`📑 Parsed article into ${sections.length} sections`);
  return sections;
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const frequency = new Map<string, number>();
  
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function identifyCitationNeeds(text: string, heading: string): string {
  const lowerText = text.toLowerCase();
  const lowerHeading = heading.toLowerCase();
  
  // Identify what type of citation this section needs
  if (lowerText.includes('law') || lowerText.includes('legal') || lowerText.includes('regulation') || lowerHeading.includes('legal')) {
    return 'Legal/regulatory authority';
  }
  if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('market') || lowerHeading.includes('market')) {
    return 'Market data/statistics';
  }
  if (lowerText.includes('weather') || lowerText.includes('climate') || lowerText.includes('temperature')) {
    return 'Weather/climate data';
  }
  if (lowerText.includes('tourism') || lowerText.includes('attraction') || lowerText.includes('visit')) {
    return 'Tourism information';
  }
  if (lowerText.includes('process') || lowerText.includes('procedure') || lowerText.includes('how to')) {
    return 'Official procedures/guides';
  }
  
  return 'Expert opinion or authoritative source';
}

/**
 * Phase 4: Calculate semantic relevance between citation and paragraph
 */
function calculateSemanticMatch(citation: Citation, section: ArticleSection): number {
  let score = 0;
  
  // Check if citation relevance mentions section keywords
  const relevanceLower = citation.relevance.toLowerCase();
  const sectionText = (section.heading + ' ' + section.content).toLowerCase();
  
  // Keyword overlap
  const matchedKeywords = section.keywords.filter(keyword => 
    relevanceLower.includes(keyword) || citation.sourceName.toLowerCase().includes(keyword)
  );
  score += matchedKeywords.length * 10;
  
  // Citation needs alignment
  if (relevanceLower.includes('government') && section.citationNeeds.includes('authority')) score += 20;
  if (relevanceLower.includes('official') && section.citationNeeds.includes('Official')) score += 20;
  if (relevanceLower.includes('market') && section.citationNeeds.includes('Market')) score += 20;
  if (relevanceLower.includes('statistics') && section.citationNeeds.includes('statistics')) score += 20;
  if (relevanceLower.includes('weather') && section.citationNeeds.includes('Weather')) score += 20;
  
  // Context match
  const contextLower = citation.contextInArticle.toLowerCase();
  if (contextLower.includes(section.heading.toLowerCase().substring(0, 20))) score += 15;
  
  // Normalize to 0-100
  return Math.min(100, score);
}

/**
 * Phase 5: Identify article category for smart retry
 */
function identifyArticleCategory(headline: string, content: string): string {
  const text = (headline + ' ' + content.substring(0, 1000)).toLowerCase();
  
  if (text.match(/legal|law|regulation|permit|license|compliance/i)) return 'Government & Legal';
  if (text.match(/property|real estate|housing|buy.*home|villa|apartment/i)) return 'Real Estate & Property';
  if (text.match(/mortgage|bank|finance|invest|tax|financial/i)) return 'Finance & Banking';
  if (text.match(/tourism|travel|visit|attraction|destination|vacation/i)) return 'Tourism & Travel';
  if (text.match(/weather|climate|temperature|rain|season/i)) return 'Climate & Weather';
  if (text.match(/education|school|university|language|learn|study/i)) return 'Education & Language';
  if (text.match(/health|medical|insurance|doctor|hospital/i)) return 'Healthcare & Insurance';
  if (text.match(/golf|padel|sport|fitness|recreation/i)) return 'Sports & Recreation';
  if (text.match(/restaurant|food|cuisine|dining|gastronomy/i)) return 'Gastronomy & Lifestyle';
  
  return 'General';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline, language = 'es', requireGovernmentSource = false } = await req.json();
    
    console.log('🔍 Finding external citations for:', headline);
    console.log('📖 Language:', language, '| Content length:', content?.length || 0);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Phase 1 & 2: Load ALL approved domains organized by category with topic mapping
    const domainCategories = await getApprovedDomainsByCategory(supabase);
    const approvedDomains = await getApprovedDomains(supabase);
    const totalDomains = approvedDomains.length;
    
    if (approvedDomains.length === 0) {
      throw new Error('No approved domains found in database. Please configure approved_domains table.');
    }
    
    // Phase 3: Parse article into sections for paragraph-level context
    const sections = parseArticleSections(content, headline);
    console.log(`📑 Parsed into ${sections.length} sections`);
    
    // Phase 5: Identify article category for smart retry
    const articleCategory = identifyArticleCategory(headline, content);
    console.log(`📊 Article category: ${articleCategory}`);
    
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
        instruction: 'Find 3-5 authoritative sources for this Spanish article',
        domains: ['.gob.es', '.es official domains'],
        sources: ['Spanish government ministries', 'Official institutions', 'Authoritative sources'],
        languageName: 'Spanish',
        exampleDomain: 'https://www.inclusion.gob.es/...'
      },
      en: {
        instruction: 'Find 3-5 authoritative sources for this English article',
        domains: ['.gov', '.gov.uk', '.org official domains'],
        sources: ['Government agencies', 'Official institutions', 'Authoritative sources'],
        languageName: 'English',
        exampleDomain: 'https://www.gov.uk/...'
      },
      nl: {
        instruction: 'Find 3-5 authoritative sources for this Dutch article',
        domains: ['.nl', '.overheid.nl', '.gov.nl official domains'],
        sources: ['Dutch government sources', 'Official institutions', 'Authoritative sources'],
        languageName: 'Dutch',
        exampleDomain: 'https://www.overheid.nl/...'
      }
    };

    const config = languageConfig[language] || languageConfig.es;

    // Phase 1: Build comprehensive domain whitelist (ALL domains, organized by category)
    const whitelistByCategory = domainCategories.map(cat => {
      return `**${cat.name}** (${cat.domains.length} domains, best for: ${cat.topics.slice(0, 3).join(', ')}):\n${cat.domains.join(', ')}`;
    }).join('\n\n');

    // Phase 2: Build topic-to-domain guidance
    const relevantCategory = domainCategories.find(c => c.name === articleCategory);
    const topicGuidance = `
🎯 DOMAIN SELECTION GUIDANCE BY TOPIC:
${domainCategories.map(cat => 
  `• ${cat.name} → Use for: ${cat.topics.join(', ')}`
).join('\n')}

📍 FOR THIS SPECIFIC ARTICLE:
Topic Category: ${articleCategory}
${relevantCategory ? 
  `🎯 Priority Domains: ${relevantCategory.domains.slice(0, 10).join(', ')}` : 
  '🎯 Use most relevant category domains'
}`;

    // Phase 3: Build section-specific context for targeted citations
    const sectionContext = sections.map((section, i) => `
Section ${i + 1}: "${section.heading}"
Content: ${section.content}
Keywords: ${section.keywords.slice(0, 5).join(', ')}
Citation Needs: ${section.citationNeeds}
`).join('\n');

    const governmentRequirement = requireGovernmentSource 
      ? `\n- ⚠️ MANDATORY: At least ONE source MUST be from official government domains (${config.domains.join(' or ')})`
      : '';

    const blockedDomainsText = blockedDomains.length > 0
      ? `\n- 🚫 AVOID overused domains: ${blockedDomains.slice(0, 15).join(', ')}`
      : '';

    // Strip HTML but preserve structure for full article context
    const fullArticleText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    const prompt = `${config.instruction}:

Article Topic: "${headline}"
Article Category: ${articleCategory}
Article Language: ${config.languageName}

📄 FULL ARTICLE CONTENT (Read completely from top to bottom to find the most relevant external citations):
${fullArticleText}

📖 ARTICLE STRUCTURE & CITATION NEEDS BY SECTION:
${sectionContext}

${topicGuidance}

📚 APPROVED DOMAIN WHITELIST (${totalDomains} TOTAL):
${whitelistByCategory}

CRITICAL REQUIREMENTS:
- Return MINIMUM 3 citations, ideally 4-5 citations
- Match citations to specific sections based on their citation needs
- PRIORITIZE IN THIS ORDER:
  1. Government/Official sites (.gob.es, .gov, official institutions)
  2. Category-specific expert domains (match article topic to domain category)
  3. Established brands with high authority
- ALL sources MUST be in ${config.languageName} language
- ALL sources must be HTTPS and currently active
- Each citation must specify which section it belongs to
- Citations must DIRECTLY support claims in their target section${governmentRequirement}${blockedDomainsText}

Return ONLY valid JSON in this exact format:
[
  {
    "sourceName": "Example Government Agency",
    "url": "${config.exampleDomain}",
    "anchorText": "official regulatory procedures",
    "contextInArticle": "When discussing legal requirements in [Section Name]",
    "insertAfterHeading": "Section heading where this citation belongs",
    "relevance": "Authoritative government source providing official data on [specific topic]. Directly supports the claim about [specific claim in that section]"
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

    // Phase 4: Semantic validation - ensure citations truly match their target sections
    if (allowedCitations.length > 0 && sections.length > 0) {
      console.log('🧠 Phase 4: Running semantic validation...');
      allowedCitations = allowedCitations.map((citation: Citation) => {
        // Find the best matching section for this citation
        let bestMatch = sections[0];
        let bestScore = 0;
        
        sections.forEach(section => {
          const score = calculateSemanticMatch(citation, section);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = section;
          }
        });
        
        console.log(`📊 Citation "${citation.sourceName}" → Section "${bestMatch.heading}": ${bestScore}% match`);
        
        return {
          ...citation,
          semanticScore: bestScore,
          targetSection: bestMatch.heading
        };
      });
      
      // Filter out citations with very low semantic relevance (< 30%)
      const semanticallyRelevant = allowedCitations.filter((c: any) => c.semanticScore >= 30);
      const removedCount = allowedCitations.length - semanticallyRelevant.length;
      
      if (removedCount > 0) {
        console.log(`🎯 Removed ${removedCount} citations with low semantic relevance`);
      }
      
      allowedCitations = semanticallyRelevant;
    }

    // Phase 5: Smart retry with category-specific domains if no valid citations found
    if (allowedCitations.length === 0) {
      console.warn('⚠️ Zero approved citations found - attempting Phase 5 smart retry');
      
      // Get domains specific to the article category
      const categoryDomains = relevantCategory ? relevantCategory.domains : approvedDomains;
      const priorityDomains = categoryDomains.slice(0, 20);
      
      console.log(`🎯 Retrying with ${priorityDomains.length} category-specific domains for: ${articleCategory}`);
      
      const categoryGuidance = relevantCategory ? `
This article is about: ${articleCategory}
Key topics: ${relevantCategory.topics.join(', ')}
Use domains that are EXPERTS in these specific topics.
` : '';
      
      const retryPrompt = `Find 3-4 HIGH-QUALITY citations for this ${config.languageName} article.

Article Topic: "${headline}"
Article Category: ${articleCategory}
${categoryGuidance}

📚 APPROVED DOMAINS FOR THIS CATEGORY:
${priorityDomains.join(', ')}

📖 ARTICLE SECTIONS (match citations to these):
${sectionContext.substring(0, 1000)}

REQUIREMENTS:
- Use ONLY the ${priorityDomains.length} domains listed above
- Match each citation to a specific section
- Focus on government and authoritative sources
- Each citation must directly support a claim in its target section

Return ONLY valid JSON:
[
  {
    "sourceName": "Source Name",
    "url": "https://example.com/...",
    "anchorText": "descriptive anchor",
    "contextInArticle": "Section context",
    "insertAfterHeading": "Section heading",
    "relevance": "Why this source supports the section's claim"
  }
]`;

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
            
            console.log(`✅ Retry found ${allowedCitations.length} approved citations`);
            
            // Phase 4: Apply semantic validation to retry citations
            if (allowedCitations.length > 0 && sections.length > 0) {
              console.log('🧠 Phase 4: Running semantic validation on retry citations...');
              allowedCitations = allowedCitations.map((citation: Citation) => {
                let bestMatch = sections[0];
                let bestScore = 0;
                
                sections.forEach(section => {
                  const score = calculateSemanticMatch(citation, section);
                  if (score > bestScore) {
                    bestScore = score;
                    bestMatch = section;
                  }
                });
                
                return {
                  ...citation,
                  semanticScore: bestScore,
                  targetSection: bestMatch.heading
                };
              });
              
              // Filter out low-relevance citations
              allowedCitations = allowedCitations.filter((c: any) => c.semanticScore >= 30);
              console.log(`✅ ${allowedCitations.length} citations passed semantic validation`);
            }
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
