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
  
  // Check if language matches or if it's a universal EU/Global source
  const isUniversal = data.language?.toUpperCase() === 'EU' || 
                     data.language?.toUpperCase() === 'GLOBAL' ||
                     data.language?.toUpperCase() === 'EU/GLOBAL';
  
  return {
    isValid: data.language === expectedLanguage || isUniversal,
    actualLanguage: data.language,
    domain,
    sourceName: data.category || domain
  };
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
