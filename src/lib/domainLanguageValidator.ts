import { supabase } from "@/integrations/supabase/client";

export interface DomainValidationResult {
  isValid: boolean;
  actualLanguage: string | null;
  domain: string;
  sourceName?: string;
  rejectionReason?: string;
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
  
  // STEP 3: Check path-based language
  const pathLanguage = extractLanguageFromPath(url);
  if (pathLanguage) {
    const matches = pathLanguage === expectedLanguage;
    return { isValid: matches, actualLanguage: pathLanguage, domain, rejectionReason: matches ? undefined : `Path language mismatch` };
  }
  
  // STEP 4: Validate TLD
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
