import { supabase } from "@/integrations/supabase/client";

export interface DomainValidationResult {
  isValid: boolean;
  actualLanguage: string | null;
  domain: string;
  sourceName?: string;
  rejectionReason?: string;
  note?: string;
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
 * BLACKLIST APPROACH: Accept ANY domain by default, only block competitors
 */
export async function validateDomainLanguage(
  url: string,
  expectedLanguage: string
): Promise<DomainValidationResult> {
  const domain = extractDomain(url);
  
  if (!domain) {
    return { isValid: false, actualLanguage: null, domain: '', rejectionReason: 'Invalid URL' };
  }
  
  // STEP 1: Check blocked_domains table
  const { data: blockedData } = await supabase
    .from('blocked_domains')
    .select('domain, reason, category')
    .eq('domain', domain)
    .eq('is_blocked', true)
    .maybeSingle();
  
  if (blockedData) {
    return { 
      isValid: false, 
      actualLanguage: null, 
      domain,
      rejectionReason: `Blocked: ${blockedData.reason} (${blockedData.category})`
    };
  }
  
  // STEP 2: Check competitor patterns
  const competitorPatterns = ['realestate', 'realtor', 'property', 'properties', 'inmobiliaria', 'immobilien', 'vastgoed', 'makelaar'];
  const domainLower = domain.toLowerCase();
  for (const pattern of competitorPatterns) {
    if (domainLower.includes(pattern)) {
      return { isValid: false, actualLanguage: null, domain, rejectionReason: `Competitor pattern: '${pattern}'` };
    }
  }
  
  // STEP 3: Check if this is an authority domain (bypass language checks)
  if (isAuthorityDomain(domain)) {
    return {
      isValid: true,
      actualLanguage: expectedLanguage,
      domain,
      note: 'Authority domain - cross-language allowed'
    };
  }
  
  // STEP 4: Check if this is a government/statistical site (bypass language checks)
  if (isGovernmentSite(domain)) {
    return {
      isValid: true,
      actualLanguage: expectedLanguage,
      domain,
      note: 'Government/statistical source - universally acceptable'
    };
  }
  
  // STEP 5: Check path-based language
  const pathLanguage = extractLanguageFromPath(url);
  if (pathLanguage) {
    const matches = pathLanguage === expectedLanguage;
    if (matches) {
      return { isValid: true, actualLanguage: pathLanguage, domain };
    }
    // Fall through to TLD check if path doesn't match
  }
  
  // STEP 6: Validate TLD
  const universalTLDs = ['com', 'org', 'net', 'gov', 'edu', 'int', 'eu'];
  const langToTLDs: Record<string, string[]> = {
    'en': ['com', 'org', 'net', 'uk', 'us', 'gov', 'edu', 'eu'], 'de': ['de', 'at', 'ch', 'eu', 'com', 'org'],
    'nl': ['nl', 'be', 'eu', 'com', 'org'], 'fr': ['fr', 'be', 'ch', 'eu', 'com', 'org'], 'es': ['es', 'eu', 'com', 'org'],
    'pl': ['pl', 'eu', 'com', 'org'], 'sv': ['se', 'eu', 'com', 'org'], 'da': ['dk', 'eu', 'com', 'org'],
    'no': ['no', 'eu', 'com', 'org'], 'hu': ['hu', 'eu', 'com', 'org'], 'fi': ['fi', 'eu', 'com', 'org'],
  };
  
  const tld = domain.split('.').pop()?.toLowerCase() || '';
  const acceptableTLDs = langToTLDs[expectedLanguage] || universalTLDs;
  
  if (!universalTLDs.includes(tld) && !acceptableTLDs.includes(tld)) {
    return { isValid: false, actualLanguage: null, domain, rejectionReason: `TLD .${tld} doesn't match language ${expectedLanguage}` };
  }
  
  return { isValid: true, actualLanguage: expectedLanguage, domain };
}

export function extractLanguageFromPath(url: string): string | null {
  try {
    const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
    const languageCodes = ['en', 'de', 'fr', 'nl', 'pl', 'sv', 'da', 'hu', 'it', 'pt', 'es', 'no', 'fi'];
    if (pathSegments.length > 0) {
      const first = pathSegments[0].toLowerCase().split(/[-_]/)[0];
      if (languageCodes.includes(first)) return first;
    }
    return null;
  } catch { return null; }
}

export function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

export async function validateMultipleDomains(urls: string[], expectedLanguage: string): Promise<Map<string, DomainValidationResult>> {
  const results = new Map<string, DomainValidationResult>();
  await Promise.all(urls.map(async (url) => { results.set(url, await validateDomainLanguage(url, expectedLanguage)); }));
  return results;
}
