export interface DomainValidationResult {
  isValid: boolean;
  actualLanguage: string | null;
  domain: string;
  sourceName?: string;
  rejectionReason?: string;
  note?: string;
}

export interface BlockedDomainResult {
  isBlocked: boolean;
  reason?: string;
  category?: string;
}

// Authority domains that can be cited regardless of URL language
const AUTHORITY_DOMAINS = [
  // International Organizations
  'who.int', 'un.org', 'oecd.org', 'imf.org', 'worldbank.org',
  'europa.eu', 'eurostat', 'ec.europa.eu', 'eea.europa.eu',
  'weforum.org', 'wto.org', 'unesco.org', 'unicef.org',
  
  // Global research & data
  'statista.com', 'ourworldindata.org', 'data.worldbank.org',
  
  // Official tourism sites
  'spain.info', 'germany.travel', 'visitnorway.com', 'holland.com',
  'visitdenmark.com', 'visitfinland.com', 'visitsweden.com',
];

// Government and statistical agency patterns - accept from ANY country
const GOVERNMENT_PATTERNS = [
  // Government TLD patterns
  '.gov', '.gob', '.gouv', 
  
  // Statistics agencies
  'stat.', 'statistics.', 'census.',
  'ine.es', 'insee.fr', 'destatis.de', 'scb.se', 'ssb.no', 'dst.dk', 'ksh.hu', 'cbs.nl', 'stat.fi',
  
  // Legal databases
  'boe.es', 'legifrance.fr', 'gesetze-im-internet.de',
  
  // Regional governments (Spain)
  'juntadeandalucia.es', 'generalitat.cat', 'euskadi.eus',
  
  // Other national governments
  'bundesregierung.de', 'government.nl', 'gouvernement.fr', 'rijksoverheid.nl',
  'regjeringen.no', 'regeringen.se', 'stm.fi', 'kormany.hu',
];

/**
 * Check if domain is an authority domain (WHO, EU, UN, etc.)
 */
function isAuthorityDomain(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return AUTHORITY_DOMAINS.some(auth => 
    lowerDomain.includes(auth) || lowerDomain.endsWith(auth)
  );
}

/**
 * Check if domain is a government/statistical site
 */
function isGovernmentSite(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return GOVERNMENT_PATTERNS.some(pattern => 
    lowerDomain.includes(pattern) || lowerDomain.startsWith(pattern)
  );
}

/**
 * Check if a domain is in the blocked_domains table (BLACKLIST approach)
 */
export async function isBlockedDomain(
  supabase: any,
  url: string
): Promise<BlockedDomainResult> {
  const domain = extractDomain(url);
  
  if (!domain) {
    return { isBlocked: false };
  }
  
  try {
    const { data, error } = await supabase
      .from('blocked_domains')
      .select('domain, reason, category')
      .eq('domain', domain)
      .eq('is_blocked', true)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking blocked domain:', error);
      return { isBlocked: false }; // Fail open on error
    }
    
    if (data) {
      console.log(`🚫 BLOCKED DOMAIN: ${domain} - ${data.reason} (${data.category})`);
      return { 
        isBlocked: true, 
        reason: data.reason, 
        category: data.category 
      };
    }
    
    return { isBlocked: false };
  } catch (error) {
    console.error('Error checking blocked domain:', error);
    return { isBlocked: false }; // Fail open on error
  }
}

/**
 * Check if domain matches competitor patterns (heuristic check)
 */
export function matchesCompetitorPattern(url: string): { matches: boolean; pattern?: string } {
  const domain = extractDomain(url).toLowerCase();
  
  // Competitor keyword patterns
  const competitorPatterns = [
    'realestate',
    'realtor',
    'property',
    'properties',
    'homes-for-sale',
    'inmobiliaria',
    'immobilien',
    'vastgoed',
    'makelaar',
    'makelaars',
    'huizen',
    'woningen',
  ];
  
  for (const pattern of competitorPatterns) {
    if (domain.includes(pattern)) {
      console.log(`🚫 COMPETITOR PATTERN: ${domain} matches '${pattern}'`);
      return { matches: true, pattern };
    }
  }
  
  return { matches: false };
}

/**
 * Validate domain language using TLD-based approach
 * BLACKLIST MODE: Accept any domain, just validate language match
 */
export function validateDomainLanguageByTLD(
  url: string,
  expectedLanguage: string
): { isValid: boolean; reason?: string } {
  const domain = extractDomain(url);
  if (!domain) {
    return { isValid: false, reason: 'Invalid URL' };
  }
  
  // Language code normalization map
  const langToTLDs: Record<string, string[]> = {
    'en': ['com', 'org', 'net', 'uk', 'us', 'ca', 'au', 'nz', 'ie', 'gov', 'edu', 'eu', 'int'],
    'de': ['de', 'at', 'ch', 'eu', 'com', 'org'],
    'nl': ['nl', 'be', 'eu', 'com', 'org'],
    'fr': ['fr', 'be', 'ch', 'ca', 'eu', 'com', 'org'],
    'es': ['es', 'eu', 'com', 'org'],
    'pl': ['pl', 'eu', 'com', 'org'],
    'sv': ['se', 'eu', 'com', 'org'], // Swedish: .se TLD
    'da': ['dk', 'eu', 'com', 'org'], // Danish: .dk TLD  
    'no': ['no', 'eu', 'com', 'org'], // Norwegian: .no TLD
    'hu': ['hu', 'eu', 'com', 'org'], // Hungarian: .hu TLD
    'fi': ['fi', 'eu', 'com', 'org'], // Finnish: .fi TLD
    'it': ['it', 'eu', 'com', 'org'], // Italian: .it TLD
    'ru': ['ru', 'com', 'org'],
    'tr': ['tr', 'com', 'org'],
  };
  
  // Global/international TLDs work for ALL languages
  const universalTLDs = ['com', 'org', 'net', 'gov', 'edu', 'int', 'eu'];
  
  // Extract TLD from domain
  const parts = domain.split('.');
  const tld = parts[parts.length - 1]?.toLowerCase() || '';
  
  // Always accept universal TLDs
  if (universalTLDs.includes(tld)) {
    return { isValid: true };
  }
  
  // Check if TLD matches expected language
  const acceptableTLDs = langToTLDs[expectedLanguage] || [];
  if (acceptableTLDs.includes(tld)) {
    return { isValid: true };
  }
  
  return { 
    isValid: false, 
    reason: `TLD .${tld} doesn't match expected language ${expectedLanguage}` 
  };
}

/**
 * MAIN VALIDATION FUNCTION (BLACKLIST APPROACH)
 * 
 * Logic: Accept ANY domain by default, BLOCK only if:
 * 1. Domain is in blocked_domains table
 * 2. Domain matches competitor patterns
 * 3. Domain TLD doesn't match article language (for non-universal TLDs)
 * 
 * SPECIAL: Authority domains (WHO, EU, government) bypass language checks
 */
export async function validateDomainLanguage(
  supabase: any,
  url: string,
  expectedLanguage: string
): Promise<DomainValidationResult> {
  const domain = extractDomain(url);
  
  if (!domain) {
    return { isValid: false, actualLanguage: null, domain: '', rejectionReason: 'Invalid URL' };
  }
  
  // STEP 1: Check blocked_domains table (explicit blacklist)
  const blockCheck = await isBlockedDomain(supabase, url);
  if (blockCheck.isBlocked) {
    return { 
      isValid: false, 
      actualLanguage: null, 
      domain,
      rejectionReason: `Blocked: ${blockCheck.reason} (${blockCheck.category})`
    };
  }
  
  // STEP 2: Check competitor patterns (heuristic blacklist)
  const patternCheck = matchesCompetitorPattern(url);
  if (patternCheck.matches) {
    return { 
      isValid: false, 
      actualLanguage: null, 
      domain,
      rejectionReason: `Competitor pattern: '${patternCheck.pattern}'`
    };
  }
  
  // STEP 3: Check if this is an authority domain (bypass language checks)
  if (isAuthorityDomain(domain)) {
    console.log(`✅ AUTHORITY DOMAIN: ${domain} - accepting for any language`);
    return {
      isValid: true,
      actualLanguage: expectedLanguage,
      domain,
      note: 'Authority domain - cross-language allowed'
    };
  }
  
  // STEP 4: Check if this is a government/statistical site (bypass language checks)
  if (isGovernmentSite(domain)) {
    console.log(`✅ GOVERNMENT SITE: ${domain} - accepting for any language`);
    return {
      isValid: true,
      actualLanguage: expectedLanguage,
      domain,
      note: 'Government/statistical source - universally acceptable'
    };
  }
  
  // STEP 5: Check path-based language (e.g., /en/, /de/)
  const pathLanguage = extractLanguageFromPath(url);
  if (pathLanguage) {
    const matches = pathLanguage === expectedLanguage;
    console.log(`Path language: ${pathLanguage}, expected: ${expectedLanguage}, matches: ${matches}`);
    
    if (!matches) {
      // For non-authority domains, path language mismatch is a soft rejection
      // Fall through to TLD check - maybe TLD matches
      console.log(`⚠️ Path language ${pathLanguage} != expected ${expectedLanguage}, checking TLD...`);
    } else {
      return {
        isValid: true,
        actualLanguage: pathLanguage,
        domain
      };
    }
  }
  
  // STEP 6: Validate TLD matches language
  const tldCheck = validateDomainLanguageByTLD(url, expectedLanguage);
  if (!tldCheck.isValid) {
    return {
      isValid: false,
      actualLanguage: null,
      domain,
      rejectionReason: tldCheck.reason
    };
  }
  
  // All checks passed - ACCEPT
  console.log(`✅ DOMAIN APPROVED: ${domain} for language ${expectedLanguage}`);
  return {
    isValid: true,
    actualLanguage: expectedLanguage,
    domain
  };
}

/**
 * Extract language code from URL path (e.g., /en/, /es/, /de/)
 */
export function extractLanguageFromPath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
    // Common language codes to detect
    const languageCodes = ['en', 'de', 'fr', 'nl', 'pl', 'sv', 'da', 'hu', 'it', 'pt', 'es', 'no', 'fi', 'ru', 'tr'];
    
    // Check first path segment for language code
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0].toLowerCase();
      
      // Direct match (e.g., /en/, /es/)
      if (languageCodes.includes(firstSegment)) {
        return firstSegment;
      }
      
      // Handle variants like /en-us/, /en_US/
      const baseLanguage = firstSegment.split(/[-_]/)[0];
      if (languageCodes.includes(baseLanguage)) {
        return baseLanguage;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract clean domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Batch validate multiple URLs for language matching
 */
export async function validateMultipleDomains(
  supabase: any,
  urls: string[],
  expectedLanguage: string
): Promise<Map<string, DomainValidationResult>> {
  const results = new Map<string, DomainValidationResult>();
  
  await Promise.all(
    urls.map(async (url) => {
      const result = await validateDomainLanguage(supabase, url, expectedLanguage);
      results.set(url, result);
    })
  );
  
  return results;
}
