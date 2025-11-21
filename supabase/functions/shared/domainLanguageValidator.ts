export interface DomainValidationResult {
  isValid: boolean;
  actualLanguage: string | null;
  domain: string;
  sourceName?: string;
}

/**
 * Validates that a citation URL's domain matches the expected article language
 * by checking against the approved_domains table
 */
export async function validateDomainLanguage(
  supabase: any,
  url: string,
  expectedLanguage: string
): Promise<DomainValidationResult> {
  const domain = extractDomain(url);
  
  if (!domain) {
    return { isValid: false, actualLanguage: null, domain: '' };
  }
  
  const { data, error } = await supabase
    .from('approved_domains')
    .select('language, domain, category')
    .eq('domain', domain)
    .eq('is_allowed', true)
    .single();
  
  if (error || !data) {
    // Domain not in approved list
    return { isValid: false, actualLanguage: null, domain };
  }
  
  // Priority 1: Check for language in URL path (highest priority)
  const pathLanguage = extractLanguageFromPath(url);
  if (pathLanguage) {
    console.log(`Using path language ${pathLanguage} (overriding domain language ${data.language}) for ${url}`);
    return {
      isValid: pathLanguage === expectedLanguage,
      actualLanguage: pathLanguage,
      domain,
      sourceName: data.category || domain
    };
  }
  
  // Priority 2: Check if it's a universal EU/Global source
  const isUniversal = data.language?.toUpperCase() === 'EU' || 
                     data.language?.toUpperCase() === 'GLOBAL' ||
                     data.language?.toUpperCase() === 'EU/GLOBAL';
  
  if (isUniversal) {
    console.log(`Universal source detected (${data.language}) for ${url}`);
  } else {
    console.log(`Using domain language ${data.language} for ${url}`);
  }
  
  // Priority 3: Fall back to domain language
  return {
    isValid: data.language === expectedLanguage || isUniversal,
    actualLanguage: data.language,
    domain,
    sourceName: data.category || domain
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
    const languageCodes = ['en', 'es', 'de', 'fr', 'nl', 'pl', 'sv', 'da', 'hu', 'it', 'pt'];
    
    // Check first path segment for language code
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0].toLowerCase();
      
      // Direct match (e.g., /en/, /es/)
      if (languageCodes.includes(firstSegment)) {
        console.log(`Path language detected: ${firstSegment} from ${url}`);
        return firstSegment;
      }
      
      // Handle variants like /en-us/, /en_US/
      const baseLanguage = firstSegment.split(/[-_]/)[0];
      if (languageCodes.includes(baseLanguage)) {
        console.log(`Path language detected: ${baseLanguage} from ${url}`);
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
