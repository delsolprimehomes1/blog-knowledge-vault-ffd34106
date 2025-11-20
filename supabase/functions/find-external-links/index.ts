import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { validateDomainLanguage } from '../shared/domainLanguageValidator.ts';

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

// Government domain checking removed - now handled by approved_domains table with language validation

// Resilient URL verification with fallback strategies
async function verifyUrl(url: string, retryCount = 0, maxRetries = 2): Promise<boolean> {
  const isPDF = url.toLowerCase().endsWith('.pdf');
  
  // Increase timeout for PDFs and official domains (they're often slower)
  const isOfficialDomain = url.includes('.gov') || url.includes('.gob.') || url.includes('.edu') || url.includes('europa.eu');
  const timeout = (isOfficialDomain || isPDF) ? 15000 : 10000;
  
  try {
    // Try HEAD request first (fastest)
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...(isPDF && { 'Accept': 'application/pdf' })
      },
      signal: AbortSignal.timeout(timeout)
    });
    
    // Accept 2xx and 3xx status codes (more lenient)
    if (response.status >= 200 && response.status < 400) {
      return true;
    }
    
    // 403 is acceptable for known authority domains (site blocks bots but exists)
    if (response.status === 403 && (isOfficialDomain || isPDF)) {
      console.log(`403 but accepting authority domain: ${url}`);
      return true;
    }
    
    // For official domains and PDFs, try GET request as fallback
    if ((isOfficialDomain || isPDF) && (response.status === 400 || response.status >= 500)) {
      console.log(`HEAD failed for ${isOfficialDomain ? 'official site' : 'PDF'} ${url}, trying GET...`);
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...(isPDF && { 'Accept': 'application/pdf' })
        },
        signal: AbortSignal.timeout(timeout)
      });
      
      if (getResponse.status >= 200 && getResponse.status < 400) {
        return true;
      }
      
      if (getResponse.status === 403 && (isOfficialDomain || isPDF)) {
        console.log(`GET returned 403 but accepting authority domain: ${url}`);
        return true;
      }
    }
    
    return false;
  } catch (err) {
    const error = err as Error;
    // Retry on timeout or network errors
    if (retryCount < maxRetries && (error.name === 'TimeoutError' || error.name === 'TypeError')) {
      console.log(`Retry ${retryCount + 1}/${maxRetries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return verifyUrl(url, retryCount + 1, maxRetries);
    }
    
    // Accept official and PDF sources even on network errors (they often have strict bot protection)
    if ((isOfficialDomain || isPDF) && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      console.log(`Network error for authority domain ${url}, but accepting as valid`);
      return true;
    }
    
    console.error(`Failed to verify ${url} after ${retryCount + 1} attempts:`, error);
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

// Fetch approved AND blacklisted domains from Supabase
async function getApprovedAndBlockedDomains(supabase: any) {
  const { data: approved, error: approvedError } = await supabase
    .from('approved_domains')
    .select('domain, category, tier, trust_score')
    .eq('is_allowed', true);
  
  const { data: blocked, error: blockedError } = await supabase
    .from('approved_domains')
    .select('domain, category, notes')
    .eq('is_allowed', false);
  
  if (approvedError) {
    console.error('Error fetching approved domains:', approvedError);
    throw approvedError;
  }
  if (blockedError) {
    console.error('Error fetching blocked domains:', blockedError);
    throw blockedError;
  }
  
  return {
    whitelistDomains: approved?.map((d: any) => d.domain) || [],
    blacklistDomains: blocked?.map((d: any) => d.domain) || [],
    approvedByCategory: approved || []
  };
}

// Check if domain is a competitor
function isCompetitorDomain(url: string, blacklist: string[]): boolean {
  const domain = extractDomain(url);
  return blacklist.includes(domain);
}

// Check if domain is an authoritative source that should be auto-approved
function isAuthoritativeSource(url: string, sourceName: string): boolean {
  const domain = extractDomain(url).toLowerCase();
  const name = sourceName.toLowerCase();
  
  // Auto-approve government and educational domains
  const authoritativeTLDs = ['.gov', '.gob.es', '.edu', '.ac.uk', '.eu', '.int'];
  if (authoritativeTLDs.some(tld => domain.endsWith(tld))) {
    console.log(`✅ AUTO-APPROVED (Government/Educational TLD): ${domain}`);
    return true;
  }
  
  // Auto-approve official institutions
  const officialInstitutions = [
    'ayuntamiento', 'diputacion', 'junta-andalucia', 'gobierno',
    'ministerio', 'council', 'commission', 'parliament'
  ];
  if (officialInstitutions.some(inst => domain.includes(inst) || name.includes(inst))) {
    console.log(`✅ AUTO-APPROVED (Official Institution): ${domain}`);
    return true;
  }
  
  return false;
}

// Multi-signal scoring system for competitor detection
function looksLikeRealEstateCompetitor(url: string, sourceName: string): boolean {
  // First check if it's an authoritative source - auto-approve these
  if (isAuthoritativeSource(url, sourceName)) {
    return false;
  }
  
  const domain = extractDomain(url).toLowerCase();
  const name = sourceName.toLowerCase();
  const fullUrl = url.toLowerCase();
  
  let score = 0;
  const signals: string[] = [];
  
  // Property type keywords (1 point each)
  const propertyKeywords = [
    'properties', 'property', 'real-estate', 'realestate', 'realtor',
    'inmobiliaria', 'homes', 'villas', 'apartments', 'housing',
    'casas', 'vivienda', 'piso', 'finca',
    // Fix 2: Add relocation, expat, and investment keywords
    'relocation', 'relocate', 'expat', 'expatriate', 
    'retire-in', 'living-in', 'moving-to', 'move-to',
    'developer', 'investment', 'mortgage', 'finance',
    'international-property', 'overseas-property'
  ];
  
  if (propertyKeywords.some(kw => domain.includes(kw) || name.includes(kw))) {
    score += 1;
    signals.push('property-keywords');
  }
  
  // Commercial intent keywords (2 points each)
  const commercialKeywords = [
    'buy', 'sell', 'sale', 'for-sale', 'comprar', 'vender', 'venta',
    'listings', 'listing', 'agent', 'broker', 'agency',
    // Fix 2: Add investment, mortgage, and advisory keywords
    'invest', 'investment', 'investor', 'developer',
    'mortgage', 'finance', 'loan', 'advisory',
    'retire', 'retirement', 'guide', 'consultant'
  ];
  
  if (commercialKeywords.some(kw => domain.includes(kw) || name.includes(kw) || fullUrl.includes(`/${kw}/`))) {
    score += 2;
    signals.push('commercial-intent');
  }
  
  // Domain structure signals (2 points each)
  const commercialPaths = ['/properties/', '/listings/', '/buy/', '/sell/', '/for-sale/'];
  if (commercialPaths.some(path => fullUrl.includes(path))) {
    score += 2;
    signals.push('commercial-url-structure');
  }
  
  // NOTE: Geographic keywords (marbella, estepona, etc.) are NOT penalized alone
  // They only matter when combined with property + commercial signals
  
  const isCompetitor = score >= 3;
  
  if (isCompetitor) {
    console.log(`❌ REJECTED as competitor: ${domain} (score: ${score}, signals: ${signals.join(', ')})`);
  } else {
    console.log(`✅ APPROVED: ${domain} (score: ${score}${signals.length > 0 ? `, signals: ${signals.join(', ')}` : ' - no commercial signals'})`);
  }
  
  return isCompetitor;
}

// Log discovered domain for review
async function logDiscoveredDomain(
  supabase: any, 
  domain: string, 
  sourceName: string, 
  articleTopic: string, 
  url: string
) {
  try {
    // Check if domain already exists
    const { data: existing } = await supabase
      .from('discovered_domains')
      .select('*')
      .eq('domain', domain)
      .single();
    
    if (existing) {
      // Update existing entry
      const topics = existing.article_topics || [];
      const urls = existing.example_urls || [];
      
      await supabase
        .from('discovered_domains')
        .update({
          times_suggested: existing.times_suggested + 1,
          last_suggested_at: new Date().toISOString(),
          article_topics: [...new Set([...topics, articleTopic])],
          example_urls: [...new Set([...urls, url])].slice(0, 10) // Keep max 10 examples
        })
        .eq('domain', domain);
    } else {
      // Insert new entry
      await supabase
        .from('discovered_domains')
        .insert({
          domain,
          source_name: sourceName,
          article_topics: [articleTopic],
          example_urls: [url]
        });
    }
  } catch (error) {
    console.error('Error logging discovered domain:', error);
    // Don't throw - this is non-critical
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
  const { whitelistDomains } = await getApprovedAndBlockedDomains(supabase);
  return whitelistDomains;
}

/**
 * Check if a URL's domain is in the approved whitelist
 */
function isApprovedDomain(url: string, approvedDomains: string[]): boolean {
  const domain = extractDomain(url);
  return approvedDomains.includes(domain);
}

function checkUrlLanguage(url: string, language: string): boolean {
  // Language checking now handled by domainLanguageValidator with approved_domains table
  
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
    const { 
      content, 
      headline, 
      language = 'es', 
      requireGovernmentSource = false,
      attemptNumber = 1,
      requireApprovedDomains = false
    } = await req.json();
    
    console.log(`🔍 Finding external citations for: ${headline} (attempt ${attemptNumber})`);
    console.log('📖 Language:', language, '| Content length:', content?.length || 0);
    console.log('🔧 Options:', { requireGovernmentSource, requireApprovedDomains });

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
    const { whitelistDomains: approvedDomains, blacklistDomains } = await getApprovedAndBlockedDomains(supabase);
    const totalDomains = approvedDomains.length;
    
    console.log(`✅ Loaded ${totalDomains} whitelisted domains`);
    console.log(`🚫 Loaded ${blacklistDomains.length} blacklisted competitor domains`);
    
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
    
    // Create blacklist text for prompt
    const competitorText = blacklistDomains.length > 0
      ? `\n\n🚫 NEVER USE THESE COMPETITOR DOMAINS:\n${blacklistDomains.slice(0, 20).join(', ')}`
      : '';
    
    const strictEnforcementNotice = `
🚨 CRITICAL ENFORCEMENT RULES (NON-NEGOTIABLE):

1. LANGUAGE MATCHING IS MANDATORY:
   - Article language: ${config.languageName} (${language.toUpperCase()})
   - ALL citations MUST be in ${config.languageName} language ONLY
   - ❌ NO English fallbacks if article is non-English
   - ❌ NO multilingual pages unless primary language matches
   - ❌ NO auto-translated pages
   - ✅ ONLY native ${config.languageName} content

2. COMPETITOR BLOCKING IS ABSOLUTE:
   - ❌ ZERO TOLERANCE for real estate companies, agencies, marketplaces
   - ❌ NO property listing sites (homes, apartments, villas for sale/rent)
   - ❌ NO relocation services, expat blogs, property consultants
   - ❌ NO mortgage brokers, investment advisors
   - ❌ NO tourism sites that link to property services
   - 🚫 Blacklisted forever: idealista, kyero, rightmove, zoopla, fotocasa, pisos.com, thinkspain
   - If unsure about a domain → DO NOT use it

3. RELEVANCE THRESHOLD ≥ 30%:
   - Each citation must DIRECTLY support a specific claim in the target section
   - ❌ NO generic overviews or tangentially related content
   - ❌ NO shallow resource pages
   - ❌ NO filler citations just to meet the count
   - ✅ ONLY citations that add authoritative evidence to specific statements

4. AUTHORITY HIERARCHY (Priority Order):
   - Tier 1: Government (.gov, .gob.es, .gov.uk, .europa.eu)
   - Tier 2: Educational (.edu, .ac.uk, universities)
   - Tier 3: Official statistics (INE, Eurostat, national stats offices)
   - Tier 4: Category-specific approved domains (from whitelist)
   - ❌ NEVER use news sites, blogs, or commercial sources unless explicitly approved

5. IF YOU CANNOT FIND 2+ VALID CITATIONS:
   - ❌ DO NOT suggest competitors as fallback
   - ❌ DO NOT suggest lower-quality sources
   - ❌ DO NOT suggest wrong-language sources
   - ✅ RETURN FEWER CITATIONS (even 0) - we will retry
   - Better to return 0 citations than 1 bad citation

REMEMBER: Quality > Quantity. We need MINIMUM 2, but all 2+ must be perfect.
`;

    // 🔄 PERSISTENT RETRY WITH FEEDBACK LOOP (EXTENDED TO 7 ATTEMPTS)
    const maxAttempts = 7;
    const requireFullDomainPass = true; // Force full domain coverage before giving up
    let currentAttempt = 0;
    const rejectedDomains: Map<string, string> = new Map(); // domain -> rejection reason
    let allowedCitations: Citation[] = [];
    
    // Helper function to build rejection feedback for Gemini
    const buildRejectionFeedback = (rejectedDomains: Map<string, string>, attemptNumber: number): string => {
      if (rejectedDomains.size === 0) return '';
      
      const rejectionList = Array.from(rejectedDomains.entries())
        .map(([domain, reason]) => `- ${domain}: ${reason}`)
        .join('\n');
      
      return `
🚫 PREVIOUS ATTEMPT FEEDBACK (Attempt ${attemptNumber}):
These domains were REJECTED in previous attempts. DO NOT use them again:

${rejectionList}

Total rejected: ${rejectedDomains.size}
You have ${approvedDomains.length - rejectedDomains.size} other approved domains to choose from.
IMPORTANT: Try completely different domains from the approved list.
Focus on government (.gov, .gob.es), educational (.edu, .ac.uk), and official statistics domains first.
`;
    };
    
    // Helper function for tiered domain batching (Fix #1)
    const getDomainsByTier = (attemptNumber: number): string[] => {
      const tier1 = approvedDomains.filter((d: any) => d.tier === 'Tier 1');
      const tier2 = approvedDomains.filter((d: any) => d.tier === 'Tier 2');
      
      // Progressive expansion:
      // Attempts 1-2: Tier 1 only (government/official)
      // Attempts 3-4: Tiers 1+2 (add educational)
      // Attempts 5-7: All tiers (full domain coverage)
      if (attemptNumber <= 2) {
        return tier1.map((d: any) => d.domain);
      } else if (attemptNumber <= 4) {
        return [...tier1, ...tier2].map((d: any) => d.domain);
      } else {
        return approvedDomains.map((d: any) => d.domain);
      }
    };
    
    console.log(`\n🔄 Starting persistent retry loop (max ${maxAttempts} attempts)`);
    console.log(`📊 Available approved domains: ${approvedDomains.length}`);
    
    while (currentAttempt < maxAttempts && allowedCitations.length < 2) {
      currentAttempt++;
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔄 ATTEMPT ${currentAttempt}/${maxAttempts}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      if (currentAttempt > 1) {
        console.log(`📊 Status: ${allowedCitations.length} citations found so far`);
        console.log(`❌ Rejected domains: ${rejectedDomains.size}`);
      }
      
      const feedbackText = buildRejectionFeedback(rejectedDomains, currentAttempt);

    // Build comprehensive domain statistics for Gemini
    const articleWordCount = fullArticleText.split(/\s+/).length;
    const domainStats = {
      total: totalDomains,
      byLanguage: {
        [language]: approvedDomains.filter((d: any) => d.language === language).length,
        'EU': approvedDomains.filter((d: any) => d.language === 'EU').length,
        'GLOBAL': approvedDomains.filter((d: any) => d.language === 'GLOBAL').length
      },
      byTier: {
        'Tier 1 (Gov)': approvedDomains.filter((d: any) => d.tier === 'Tier 1').length,
        'Tier 2 (Edu)': approvedDomains.filter((d: any) => d.tier === 'Tier 2').length,
        'Tier 3 (Stats)': approvedDomains.filter((d: any) => d.tier === 'Tier 3').length,
        'Tier 4 (Other)': approvedDomains.filter((d: any) => d.tier === 'Tier 4').length
      }
    };

    const domainStatsText = `
📊 DOMAIN INVENTORY (You have ${totalDomains} approved domains to search):

BY LANGUAGE:
- ${language.toUpperCase()}: ${domainStats.byLanguage[language]} domains
- EU/GLOBAL: ${(domainStats.byLanguage['EU'] || 0) + (domainStats.byLanguage['GLOBAL'] || 0)} domains

BY AUTHORITY TIER:
- ${Object.entries(domainStats.byTier).map(([tier, count]) => `${tier}: ${count}`).join('\n- ')}

🎯 SEARCH STRATEGY:
1. Start with Tier 1 (Government) domains: ${domainStats.byTier['Tier 1 (Gov)']} options
2. Then try Tier 2 (Educational): ${domainStats.byTier['Tier 2 (Edu)']} options
3. Then Tier 3 (Statistics): ${domainStats.byTier['Tier 3 (Stats)']} options
4. Finally Tier 4 (Category-specific): ${domainStats.byTier['Tier 4 (Other)']} options

🚨 CRITICAL: Search through ALL ${totalDomains} domains systematically. DO NOT stop after checking only 10-20 domains.
You have access to hundreds of approved sources across all categories.
`;

    const prompt = `${strictEnforcementNotice}

${feedbackText}

${config.instruction}:

Article Topic: "${headline}"
Article Category: ${articleCategory}
Article Language: ${config.languageName}

📖 FULL ARTICLE ANALYSIS REQUIRED:
- Article length: ${articleWordCount} words across ${sections.length} sections
- YOU MUST read and understand the ENTIRE article before suggesting citations
- Base semantic relevance on the COMPLETE article context, not just headlines or first paragraphs
- Match citations to specific paragraphs within their target sections

📄 COMPLETE ARTICLE CONTENT (Read from start to finish):
${fullArticleText}

📖 ARTICLE STRUCTURE & CITATION NEEDS BY SECTION:
${sectionContext}

${topicGuidance}

${domainStatsText}

✅ APPROVED DOMAINS BY CATEGORY (${totalDomains} total):
${whitelistByCategory}
${competitorText}

🔒 ZERO-TOLERANCE COMPETITOR RULES:
1. ❌ NEVER cite ANY real estate company, agency, or marketplace
2. ❌ NEVER cite property listing sites (homes, villas, apartments for sale)
3. ❌ NEVER cite relocation blogs, expat guides, or international property consultants
4. ❌ NEVER cite mortgage brokers, finance advisors, or property investment firms
5. ❌ NEVER cite tourism blogs that monetize via property links or agency referrals
6. ❌ NEVER cite developers, housing portals, or commercial property sites
7. ❌ NEVER cite idealista, kyero, rightmove, zoopla, fotocasa, pisos.com, thinkspain, or ANY similar sites

✅ ONLY ALLOW:
- Government domains: .gov, .gob.es, .gov.uk, .europa.eu, .int
- Educational institutions: .edu, .ac.uk, universities
- Official statistics agencies: INE, DGT, Eurostat, national statistics offices
- Public institutions: ministries, city councils, regional governments (e.g., juntadeandalucia.es)
- Public health, transport, police, immigration authorities

🚨 IF YOU CANNOT FIND 2+ CITATIONS FROM APPROVED SOURCES:
- DO NOT suggest competitor domains as fallback
- DO NOT suggest commercial or news sites
- RETURN FEWER CITATIONS (even if <2) rather than breaking the rules

CRITICAL REQUIREMENTS:
- Return MINIMUM 3 citations, ideally 4-5 citations
- Match citations to specific sections based on their citation needs
- Each citation must support SPECIFIC claims in the article (not generic overviews)
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

    console.log('🤖 Calling Gemini 2.5 Flash with Google Search Grounding...');
    
    // Language code mapping for Google Search Grounding
    const languageCodeMap: Record<string, string> = {
      'en': 'en',
      'es': 'es',
      'de': 'de',
      'nl': 'nl',
      'fr': 'fr',
      'pl': 'pl',
      'sv': 'sv',
      'da': 'da',
      'hu': 'hu'
    };
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build domain filter for Google Search Grounding with tiered batching (Fix #1)
    const searchDomains = getDomainsByTier(currentAttempt);
    console.log(`🔍 Attempt ${currentAttempt}: Searching ${searchDomains.length} domains (Tier ${currentAttempt <= 2 ? '1' : currentAttempt <= 4 ? '1+2' : 'All'})`);

    // Note: Timeout is now managed by generate-cluster (adaptive: 90s→60s→45s based on attempt)
    const GEMINI_TIMEOUT = 45000;
    const startTime = Date.now();
    
    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT);
      
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a research assistant specialized in finding authoritative ${config.languageName} sources using Google Search. ${blockedDomains.length > 0 ? `NEVER use these blocked domains: ${blockedDomains.join(', ')}. ` : ''}CRITICAL: Return ONLY valid JSON arrays. All URLs must be in ${config.languageName} language. Prioritize government and educational sources.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          tools: [
            {
              type: 'google_search_retrieval',
              google_search_retrieval: {
                dynamic_retrieval_config: {
                  mode: 'MODE_DYNAMIC',
                  dynamic_threshold: 0.4, // Fix #4: Lower threshold for more active search grounding
                  // CRITICAL: Filter Google results by language
                  language_codes: [languageCodeMap[language] || 'en']
                }
              }
            }
          ],
          tool_config: {
            google_search_retrieval: {
              search_domain_filter: searchDomains
            }
          },
          temperature: 0.6, // Fix #3: More exploration while staying factual
          max_tokens: 3500 // Fix #3: Room for more citations with full context
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ Gemini call completed in ${elapsed}ms`);
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`⏱️ Gemini call timed out after ${elapsed}ms (limit: ${GEMINI_TIMEOUT}ms)`);
        throw new Error(`Gemini API timeout after ${elapsed}ms`);
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Log response (truncated to avoid massive logs from malformed URLs)
    const truncatedResponse = aiResponse.length > 2000 
      ? aiResponse.substring(0, 2000) + '... (truncated)'
      : aiResponse;
    console.log('Gemini response:', truncatedResponse);
    
    let citations: Citation[] = [];
    try {
      // Clean up the response before parsing
      let cleanedResponse = aiResponse;
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Extract JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('No JSON array found in response');
        throw new Error('Failed to parse AI response into citations');
      }
      
      // Try to parse and validate
      let parsedCitations = JSON.parse(jsonMatch[0]);
      
      // Validate and clean citations
      if (!Array.isArray(parsedCitations)) {
        throw new Error('Response is not an array');
      }
      
      // Filter out citations with invalid/malformed URLs
      citations = parsedCitations.filter((citation: any) => {
        if (!citation.url || typeof citation.url !== 'string') {
          console.warn(`❌ Invalid citation: missing or invalid URL`);
          return false;
        }
        
        // Reject URLs that are suspiciously long (likely malformed)
        if (citation.url.length > 500) {
          console.warn(`❌ Rejecting malformed URL (too long): ${citation.url.substring(0, 100)}...`);
          return false;
        }
        
        // Reject URLs with repeated patterns (common in malformed responses)
        const repeatedPattern = /(.{20,})\1{3,}/;
        if (repeatedPattern.test(citation.url)) {
          console.warn(`❌ Rejecting malformed URL (repeated pattern): ${citation.url.substring(0, 100)}...`);
          return false;
        }
        
        // Basic URL validation
        try {
          new URL(citation.url);
          return true;
        } catch {
          console.warn(`❌ Invalid URL format: ${citation.url}`);
          return false;
        }
      });
      
    } catch (parseError) {
      console.error('Failed to parse citations JSON:', parseError);
      console.error('Raw response:', aiResponse.substring(0, 500));
      // Gracefully fall back to empty citations instead of throwing
      citations = [];
    }

    if (!Array.isArray(citations) || citations.length === 0) {
      console.warn('No valid citations found in response');
      // Continue with empty citations, frontend will handle "no suggestions" state
    }

    console.log(`Found ${citations.length} citations from Gemini + Google Search`);

    // 🛡️ CRITICAL: Language validation checkpoint (post-Gemini)
    console.log(`[Language Validation] Checking all ${citations.length} citations for language match...`);
    const languageValidatedCitations: Citation[] = [];

    for (const citation of citations) {
      const validation = await validateDomainLanguage(supabase, citation.url, language);
      
      if (!validation.isValid) {
        console.warn(`[Language Validation] ❌ REJECTED (${citation.url}): Expected ${language}, Got ${validation.actualLanguage || 'unknown'}`);
        continue;
      }
      
      console.log(`[Language Validation] ✅ PASSED (${citation.url}): Language ${validation.actualLanguage}`);
      languageValidatedCitations.push(citation);
    }

    console.log(`[Language Validation] ${citations.length} → ${languageValidatedCitations.length} citations passed language check`);
    citations = languageValidatedCitations;

    // Quality validation: semantic relevance and context
    console.log(`[Citation Quality Check] Running semantic relevance validation...`);
    
    citations = citations.filter((citation: Citation) => {
      // Check if citation has semantic score
      if (citation.semanticScore !== undefined && citation.semanticScore < 30) {
        console.warn(`❌ LOW RELEVANCE REJECTED: ${citation.url} (score: ${citation.semanticScore}%)`);
        return false;
      }
      
      // Check if citation has proper context
      if (!citation.contextInArticle || citation.contextInArticle.length < 20) {
        console.warn(`❌ INSUFFICIENT CONTEXT: ${citation.url}`);
        return false;
      }
      
      // Check if citation specifies target section
      if (!citation.insertAfterHeading) {
        console.warn(`❌ NO TARGET SECTION: ${citation.url}`);
        return false;
      }
      
      console.log(`✅ QUALITY PASSED: ${citation.url} (${citation.sourceName})`);
      return true;
    });
    
    console.log(`[Citation Quality Check] ${languageValidatedCitations.length} → ${citations.length} citations passed quality check`);

    // 🔀 HYBRID FILTERING: Blacklist → Whitelist → Conditional Allow (WITH REJECTION TRACKING)
    let currentAttemptCitations = citations.filter((citation: Citation) => {
      if (!citation.url || !citation.sourceName) {
        console.warn(`❌ Invalid citation structure: ${JSON.stringify(citation)}`);
        return false;
      }
      if (!citation.url.startsWith('http')) {
        console.warn(`❌ Invalid URL protocol: ${citation.url}`);
        return false;
      }
      
      const domain = extractDomain(citation.url);
      
      // 🚫 FIRST: Check blacklist (highest priority rejection)
      if (isCompetitorDomain(citation.url, blacklistDomains)) {
        console.warn(`🚫 BLACKLIST REJECTION: ${domain} - Competitor domain`);
        rejectedDomains.set(domain, 'Competitor/blacklisted domain');
        return false;
      }
      
      // ✅ SECOND: Check whitelist (fast approval for known good domains)
      const isApproved = isApprovedDomain(citation.url, approvedDomains);
      
      if (isApproved) {
        console.log(`✅ APPROVED DOMAIN: ${domain} - TRUSTED SOURCE (no usage limits)`);
        return true; // IMMEDIATE APPROVAL - approved domains are always trusted
      }
      
      // Layer 3: GOVERNMENT-ONLY MODE - Requires BOTH gov/official domain AND correct language
      if (attemptNumber === 3) {
        const isGovOrOfficial = domain.includes('.gov') || 
                                domain.includes('.gob.') || 
                                domain.includes('.edu') ||
                                domain.includes('.ac.uk') ||
                                domain.includes('eurostat') ||
                                domain.includes('europa.eu') ||
                                domain.includes('ine.');
        
        if (!isGovOrOfficial) {
          console.warn(`🚫 Layer 3 BLOCKED: ${domain} - Not government/official domain`);
          rejectedDomains.set(domain, 'Not government/official (Layer 3 strict mode)');
          return false;
        }
        
        console.log(`✅ Layer 3 APPROVED: ${domain} - Government/official with correct language`);
      }
      
      // Layer 1-2: Use normal approved domain logic
      if (requireApprovedDomains) {
        console.warn(`🚫 Layer 1-2 REJECTION: ${domain} - Not in approved list (requireApprovedDomains=true)`);
        rejectedDomains.set(domain, 'Not in approved domains list');
        return false;
      }
      
      // 🔍 THIRD: Unknown domain - apply heuristic checks (only when not forcing approved domains)
      console.log(`🔍 Unknown domain detected: ${domain} - Running competitor detection...`);
      
      // Check if it looks like a real estate competitor
      if (looksLikeRealEstateCompetitor(citation.url, citation.sourceName)) {
        console.warn(`🚫 HEURISTIC REJECTION: ${domain} - Appears to be real estate competitor`);
        rejectedDomains.set(domain, 'Looks like real estate competitor (heuristic)');
        return false;
      }
      
      // Check language match
      const isCorrectLanguage = checkUrlLanguage(citation.url.toLowerCase(), language);
      if (!isCorrectLanguage) {
        console.warn(`⚠️ LANGUAGE MISMATCH: ${domain}`);
        rejectedDomains.set(domain, 'Language mismatch');
        return false;
      }
      
      // ✅ ALLOW: Unknown domain that passed all checks
      console.log(`✅ UNKNOWN DOMAIN APPROVED: ${domain} - Not a competitor, correct language`);
      
      // Log this discovered domain for admin review
      logDiscoveredDomain(supabase, domain, citation.sourceName, headline, citation.url);
      
      return true;
    });

    console.log(`${currentAttemptCitations.length} citations passed hybrid filtering in this attempt`);
    
    // 🛡️ Phase 3: URL verification for this attempt only
    console.log(`Phase 3: Verifying ${currentAttemptCitations.length} URLs for this attempt...`);
    
    const verifiedCitations = await Promise.all(
      currentAttemptCitations.map(async (citation: Citation) => {
        const isWorking = await verifyUrl(citation.url);
        if (!isWorking) {
          const domain = extractDomain(citation.url);
          rejectedDomains.set(domain, 'URL verification failed (not accessible)');
        }
        return isWorking ? citation : null;
      })
    );
    
    const verifiedFromThisAttempt = verifiedCitations.filter(c => c !== null) as Citation[];
    console.log(`${verifiedFromThisAttempt.length} citations verified successfully in this attempt`);
    
    // 🧠 Phase 4: Semantic validation for this attempt's verified citations only
    let semanticallyValidated = verifiedFromThisAttempt;
    if (semanticallyValidated.length > 0 && sections.length > 0) {
      console.log('🧠 Running semantic validation on this attempt...');
      semanticallyValidated = semanticallyValidated.map((citation: Citation) => {
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
      const semanticallyRelevant = semanticallyValidated.filter((c: any) => c.semanticScore >= 30);
      const removedCount = semanticallyValidated.length - semanticallyRelevant.length;
      
      if (removedCount > 0) {
        console.log(`🎯 Removed ${removedCount} citations with low semantic relevance`);
        // Track rejected domains
        semanticallyValidated.filter((c: any) => c.semanticScore < 30).forEach((c: any) => {
          const domain = extractDomain(c.url);
          rejectedDomains.set(domain, 'Low semantic relevance (<30%)');
        });
      }
      
      semanticallyValidated = semanticallyRelevant;
      
      // Fix 5: Phase 4.5 - Content Complement Validation (duplicate detection, generic URLs, claim support)
      console.log('🎯 Phase 4.5: Validating citations complement article content...');
      
      const dedupedCitations = semanticallyValidated.filter((citation: any, index: number, self: any[]) => {
        // Check for duplicate URLs
        const isDuplicate = self.findIndex((c: any) => c.url === citation.url) !== index;
        if (isDuplicate) {
          console.warn(`⚠️ DUPLICATE REMOVED: ${citation.url}`);
          return false;
        }
        
        // Check for generic overview URLs
        const isGenericOverview = 
          citation.url.includes('/about') ||
          citation.url.includes('/about-us') ||
          citation.url.includes('/home') ||
          citation.url.endsWith('/');
        
        if (isGenericOverview && citation.semanticScore < 50) {
          console.warn(`⚠️ GENERIC URL REMOVED: ${citation.url} (low relevance + generic path)`);
          return false;
        }
        
        // Verify citation supports a specific claim
        const hasClaim = citation.relevance && citation.relevance.length > 50;
        if (!hasClaim) {
          console.warn(`⚠️ VAGUE CITATION REMOVED: ${citation.url} (no specific claim support)`);
          return false;
        }
        
        return true;
      });
      
      console.log(`${dedupedCitations.length} citations passed content complement validation (removed ${semanticallyValidated.length - dedupedCitations.length} duplicates/generic/vague citations)`);
      semanticallyValidated = dedupedCitations;
    }
    
    // Add this attempt's validated citations to cumulative list
    allowedCitations.push(...semanticallyValidated);

    // 📊 LOG DETAILED ATTEMPT STATISTICS
    const attemptStats = {
      citationsAccepted: semanticallyValidated.length,
      rejectionReasons: {
        competitor: 0,
        languageMismatch: 0,
        semanticLow: 0,
        notApproved: 0,
        realEstateHeuristic: 0,
        urlVerificationFailed: 0,
        other: 0
      }
    };

    // Count new rejections from this attempt
    const newRejections = new Map<string, string>();
    rejectedDomains.forEach((reason, domain) => {
      newRejections.set(domain, reason);
      
      // Categorize rejection
      const lowerReason = reason.toLowerCase();
      if (lowerReason.includes('competitor') || lowerReason.includes('blacklist')) {
        attemptStats.rejectionReasons.competitor++;
      } else if (lowerReason.includes('language')) {
        attemptStats.rejectionReasons.languageMismatch++;
      } else if (lowerReason.includes('semantic') || lowerReason.includes('relevance')) {
        attemptStats.rejectionReasons.semanticLow++;
      } else if (lowerReason.includes('approved')) {
        attemptStats.rejectionReasons.notApproved++;
      } else if (lowerReason.includes('real estate') || lowerReason.includes('heuristic')) {
        attemptStats.rejectionReasons.realEstateHeuristic++;
      } else if (lowerReason.includes('verification') || lowerReason.includes('accessible')) {
        attemptStats.rejectionReasons.urlVerificationFailed++;
      } else {
        attemptStats.rejectionReasons.other++;
      }
    });

    if (currentAttempt === 1 || attemptStats.citationsAccepted > 0 || Object.values(attemptStats.rejectionReasons).some(v => v > 0)) {
      console.log(`\n📊 ATTEMPT ${currentAttempt} DETAILED STATISTICS:`);
      console.log(`  ✅ Accepted: ${attemptStats.citationsAccepted} citations`);
      if (Object.values(attemptStats.rejectionReasons).some(v => v > 0)) {
        console.log(`  ❌ Rejection Breakdown:`);
        Object.entries(attemptStats.rejectionReasons).forEach(([reason, count]) => {
          if (count > 0) {
            const reasonLabels: Record<string, string> = {
              competitor: 'Competitor/Blacklist',
              languageMismatch: 'Language Mismatch',
              semanticLow: 'Low Semantic Relevance',
              notApproved: 'Not in Approved List',
              realEstateHeuristic: 'Real Estate Heuristic',
              urlVerificationFailed: 'URL Verification Failed',
              other: 'Other'
            };
            console.log(`    - ${reasonLabels[reason]}: ${count}`);
          }
        });
      }
    }

    // 🔄 CHECK EXIT CONDITIONS
    console.log(`\n📊 ATTEMPT ${currentAttempt} RESULTS: ${allowedCitations.length} valid citations (added ${semanticallyValidated.length} this attempt)`);
    
    if (allowedCitations.length >= 2) {
      console.log(`✅ SUCCESS: Minimum citations met (${allowedCitations.length}/2)`);
      break; // Exit retry loop - we have enough citations
    }
    
    // Full-domain pass requirement: must try 695+ out of 700 domains
    const domainExhaustionThreshold = requireFullDomainPass 
      ? approvedDomains.length - 5  // Must try all but 5 domains
      : approvedDomains.length - 50; // Old behavior
    
    const domainCoveragePercent = (rejectedDomains.size / approvedDomains.length * 100).toFixed(1);
    console.log(`🔍 Domain coverage: ${rejectedDomains.size}/${approvedDomains.length} (${domainCoveragePercent}%)`);
    
    if (rejectedDomains.size >= domainExhaustionThreshold) {
      console.warn(`⚠️ DOMAIN EXHAUSTION: Tried ${rejectedDomains.size}/${approvedDomains.length} approved domains (${domainCoveragePercent}%)`);
      console.warn(`Full domain list has been exhausted - exiting retry loop`);
      break; // Exit - nearly all domains have been rejected
    }
    
    if (currentAttempt < maxAttempts) {
      console.log(`🔄 Retrying with feedback about ${rejectedDomains.size} rejected domains...`);
    }
  } // End of while loop

  // 🎯 FINAL RESULTS AFTER ALL ATTEMPTS
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 FINAL RESULTS AFTER ${currentAttempt} ATTEMPTS`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Valid citations found: ${allowedCitations.length}`);
  console.log(`❌ Rejected domains: ${rejectedDomains.size}`);
  console.log(`📍 Domain coverage: ${(rejectedDomains.size / approvedDomains.length * 100).toFixed(1)}%`);
  
  // Build detailed rejection breakdown
  const rejectionBreakdown = new Map<string, number>();
  rejectedDomains.forEach(reason => {
    rejectionBreakdown.set(reason, (rejectionBreakdown.get(reason) || 0) + 1);
  });
  
  // Sort by frequency
  const sortedReasons = Array.from(rejectionBreakdown.entries())
    .sort((a, b) => b[1] - a[1]);
  
  if (allowedCitations.length + rejectedDomains.size > 0) {
    const successRate = (allowedCitations.length / (allowedCitations.length + rejectedDomains.size) * 100).toFixed(1);
    console.log(`📈 Success rate: ${successRate}%`);
  }
  
  // Log rejection breakdown
  if (sortedReasons.length > 0) {
    console.log(`\n📊 REJECTION BREAKDOWN:`);
    sortedReasons.slice(0, 10).forEach(([reason, count]) => {
      console.log(`  ${count}× ${reason}`);
    });
  }
  
  if (allowedCitations.length < 2) {
    console.error(`\n🚨 FAILED: Could not find 2+ citations after ${currentAttempt} attempts`);
    console.error(`Rejection breakdown:`);
    
    const reasons = new Map<string, number>();
    rejectedDomains.forEach(reason => {
      reasons.set(reason, (reasons.get(reason) || 0) + 1);
    });
    
    reasons.forEach((count, reason) => {
      console.error(`  - ${reason}: ${count} domains`);
    });
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

    // ✅ URL verification is now handled inside the main retry loop above
    // This legacy verification code has been removed
    
    // Skip directly to authority scoring
    let validCitations = allowedCitations;
    
    // ✅ FALLBACK: If no citations found, use best available from allowedCitations
    if (validCitations.length === 0 && allowedCitations.length > 0) {
      console.warn('⚠️ No verified citations - using best available citations as fallback');
      // Prioritize official/government domains
      const officialCitations = allowedCitations.filter((c: any) => {
        const url = c.url.toLowerCase();
        return url.includes('.gov') || url.includes('.gob.') || url.includes('.edu') || url.includes('europa.eu');
      });
      if (officialCitations.length > 0) {
        console.log(`Using ${officialCitations.length} official citations`);
        validCitations = officialCitations.slice(0, 3);
      } else {
        console.log(`Using top ${Math.min(3, allowedCitations.length)} available citations`);
        validCitations = allowedCitations.slice(0, 3);
      }
    }

    // ✅ AUTHORITY SCORING - Prioritize whitelist domains
    const citationsWithScores = validCitations.map((citation: any) => {
      let authorityScore = 5; // baseline
      const domain = extractDomain(citation.url);
      
      // Government/official sources (highest authority)
      const url = citation.url.toLowerCase();
      const isOfficial = url.includes('.gov') || url.includes('.gob.') || url.includes('.edu') || 
                        url.includes('europa.eu') || url.includes('eurostat');
      if (isOfficial) {
        authorityScore += 5;
        console.log(`🏛️ Official source boost: ${domain} (+5)`);
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
      console.error(`\n🚨 CITATION DISCOVERY FAILED - NO VALID CITATIONS FOUND`);
      console.error(`\nRejection Analysis:`);
      sortedReasons.forEach(([reason, count]) => {
        console.error(`  ${count}× ${reason}`);
      });
      
      // Return detailed failure diagnostics
      return new Response(
        JSON.stringify({ 
          citations: [],
          totalFound: 0,
          totalVerified: 0,
          hasGovernmentSource: false,
          error: 'No valid citations found after full domain scan',
          diagnostics: {
            attemptsUsed: currentAttempt,
            maxAttempts: maxAttempts,
            domainsEvaluated: rejectedDomains.size,
            totalDomainsAvailable: approvedDomains.length,
            domainCoveragePercent: (rejectedDomains.size / approvedDomains.length * 100).toFixed(1),
            rejectionBreakdown: Object.fromEntries(sortedReasons),
            articleLength: fullArticleText.split(/\s+/).length,
            sectionsAnalyzed: sections.length
          }
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
    const hasGovSource = citationsWithScores.some((c: any) => {
      const url = c.url.toLowerCase();
      return url.includes('.gov') || url.includes('.gob.') || url.includes('.edu') || url.includes('europa.eu');
    });
    
    if (requireGovernmentSource && !hasGovSource) {
      console.warn('⚠️ No government source found (requirement enabled but not blocking results)');
    } else if (hasGovSource) {
      console.log('✓ Government source found');
    }

    // 📊 LOG SUCCESSFUL DOMAIN CATEGORIES
    if (citationsWithScores.length > 0) {
      const categoriesUsed = new Set<string>();
      const tiersUsed = new Set<string>();
      
      citationsWithScores.forEach((citation: any) => {
        const domain = extractDomain(citation.url);
        const approvedDomain = approvedDomains.find((d: any) => d.domain === domain);
        
        if (approvedDomain) {
          if (approvedDomain.category) categoriesUsed.add(approvedDomain.category);
          if (approvedDomain.tier) tiersUsed.add(approvedDomain.tier);
        }
      });
      
      if (categoriesUsed.size > 0) {
        console.log(`\n✅ SUCCESSFUL DOMAIN CATEGORIES:`);
        categoriesUsed.forEach(cat => console.log(`  - ${cat}`));
      }
      
      if (tiersUsed.size > 0) {
        console.log(`\n✅ AUTHORITY TIERS USED:`);
        tiersUsed.forEach(tier => console.log(`  - ${tier}`));
      }
    }

    // Success case: return citations with comprehensive diagnostics
    return new Response(
      JSON.stringify({ 
        citations: citationsWithScores,
        totalFound: allowedCitations.length, // Total citations found across all attempts
        totalVerified: citationsWithScores.length,
        hasGovernmentSource: hasGovSource,
        averageAuthorityScore: citationsWithScores.reduce((acc: number, c: any) => acc + c.authorityScore, 0) / citationsWithScores.length,
        diagnostics: {
          attemptsUsed: currentAttempt,
          domainsEvaluated: rejectedDomains.size,
          domainCoveragePercent: (rejectedDomains.size / approvedDomains.length * 100).toFixed(1),
          successRate: ((citationsWithScores.length / (citationsWithScores.length + rejectedDomains.size)) * 100).toFixed(1)
        }
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
    const errorMessage = error instanceof Error ? error.message : 'Citation lookup failed';
    
    // Return 500 error so generate-cluster can retry
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        citations: [],
        totalFound: 0,
        totalVerified: 0,
        hasGovernmentSource: false
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
