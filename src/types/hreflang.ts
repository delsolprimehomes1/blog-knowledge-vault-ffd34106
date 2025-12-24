import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Array of exactly 10 supported language codes for hreflang tags.
 * These match the languages available in the CMS content.
 */
export const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da'] as const;

/**
 * Base URL for generating canonical URLs and hreflang hrefs.
 * Uses localhost origin in development, production URL otherwise.
 */
export const BASE_URL = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://www.delsolprimehomes.com')
  : 'https://www.delsolprimehomes.com';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported language codes derived from SUPPORTED_LANGUAGES constant.
 * Results in: 'en' | 'nl' | 'es' | 'de' | 'fr' | 'sv' | 'pl' | 'no' | 'fi' | 'da'
 */
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Content types that support hreflang tags.
 * Maps to different URL patterns and database tables.
 */
export type ContentType = 'blog_tofu' | 'blog_mofu' | 'blog_bofu' | 'qa' | 'location' | 'comparison';

/**
 * Represents a content item with hreflang metadata.
 * Used for generating hreflang tags across language versions.
 */
export interface HreflangContent {
  /** Unique identifier for the content */
  id: string;
  /** Shared ID across all language versions of the same content */
  hreflang_group_id: string;
  /** Language code of this content version */
  language: SupportedLanguage;
  /** URL slug for this content */
  slug: string;
  /** Full canonical URL for this content */
  canonical_url: string;
  /** Original language this content was created in */
  source_language: SupportedLanguage;
  /** Type of content (determines URL pattern) */
  content_type: ContentType;
  /** Publication status */
  status: 'draft' | 'published';
  /** City slug for location pages (e.g., 'marbella') */
  city_slug?: string;
  /** Topic slug for location pages (e.g., 'buying-property') */
  topic_slug?: string;
}

/**
 * Represents a single hreflang tag for SEO.
 */
export interface HreflangTag {
  /** Language code or 'x-default' for default version */
  hreflang: SupportedLanguage | 'x-default';
  /** Full URL to the language version */
  href: string;
}

// =============================================================================
// LANGUAGE METADATA
// =============================================================================

/**
 * Metadata for each supported language including display names and flags.
 */
export const LANGUAGE_METADATA: Record<SupportedLanguage, { 
  name: string; 
  nativeName: string; 
  flag: string;
}> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  sv: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  no: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  fi: { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  da: { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Type guard to check if a string is a supported language code.
 * @param code - String to validate
 * @returns True if code is a valid SupportedLanguage
 * @example
 * if (isSupportedLanguage(lang)) {
 *   // lang is now typed as SupportedLanguage
 * }
 */
export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage);
}

/**
 * Maps content types to their corresponding database table names.
 * @param contentType - The content type to look up
 * @returns Database table name
 */
export function getTableForContentType(contentType: ContentType): string {
  switch (contentType) {
    case 'blog_tofu':
    case 'blog_mofu':
    case 'blog_bofu':
      return 'blog_articles';
    case 'qa':
      return 'qa_pages';
    case 'location':
      return 'location_pages';
    case 'comparison':
      return 'comparison_pages';
    default:
      return 'blog_articles';
  }
}

/**
 * Builds the full URL for a content item in a specific language.
 * Uses different URL patterns based on content type.
 * 
 * @param content - Content item with slug and type information
 * @param lang - Target language code
 * @returns Full URL string
 * 
 * @example
 * // Blog article
 * buildContentUrl({ slug: 'buying-guide', content_type: 'blog_tofu' }, 'es')
 * // Returns: 'https://delsolprimehomes.com/es/blog/buying-guide'
 * 
 * @example
 * // Location page
 * buildContentUrl({ city_slug: 'marbella', topic_slug: 'property-market', content_type: 'location' }, 'de')
 * // Returns: 'https://delsolprimehomes.com/de/locations/marbella/property-market'
 */
export function buildContentUrl(content: HreflangContent, lang: SupportedLanguage): string {
  const { slug, content_type, city_slug, topic_slug } = content;
  
  switch (content_type) {
    case 'blog_tofu':
    case 'blog_mofu':
    case 'blog_bofu':
      return `${BASE_URL}/${lang}/blog/${slug}`;
    case 'qa':
      return `${BASE_URL}/${lang}/qa/${slug}`;
    case 'location':
      // Location pages have city_slug/topic_slug structure
      if (city_slug && topic_slug) {
        return `${BASE_URL}/${lang}/locations/${city_slug}/${topic_slug}`;
      }
      // Fallback to regular slug if city/topic not available
      return `${BASE_URL}/${lang}/locations/${slug}`;
    case 'comparison':
      return `${BASE_URL}/${lang}/compare/${slug}`;
    default:
      return `${BASE_URL}/${lang}/blog/${slug}`;
  }
}

// =============================================================================
// HREFLANG TAG GENERATION
// =============================================================================

/**
 * Generates exactly 11 hreflang tags for a content page.
 * Creates tags for all 10 supported languages plus x-default.
 * For missing language versions, falls back to the English version.
 * x-default always points to the English version.
 * 
 * @param currentContent - The content item being displayed
 * @param siblings - Array of all language versions of this content
 * @returns Array of exactly 11 HreflangTag objects
 * 
 * @example
 * const tags = generateHreflangTags(article, siblings);
 * // Returns:
 * // [
 * //   { hreflang: 'en', href: 'https://delsolprimehomes.com/en/blog/...' },
 * //   { hreflang: 'es', href: 'https://delsolprimehomes.com/es/blog/...' },
 * //   ... (8 more languages)
 * //   { hreflang: 'x-default', href: 'https://delsolprimehomes.com/en/blog/...' }
 * // ]
 */
export function generateHreflangTags(
  currentContent: HreflangContent,
  siblings: HreflangContent[]
): HreflangTag[] {
  // Combine current content with siblings for complete set
  const allVersions = [currentContent, ...siblings.filter(s => s.id !== currentContent.id)];
  
  // Create a map of language -> content for quick lookup
  const languageMap = new Map<SupportedLanguage, HreflangContent>();
  for (const content of allVersions) {
    if (content.status === 'published' && isSupportedLanguage(content.language)) {
      languageMap.set(content.language, content);
    }
  }
  
  // Find English version for fallback (or use current if English doesn't exist)
  const englishVersion = languageMap.get('en') || currentContent;
  const englishUrl = buildContentUrl(englishVersion, 'en');
  
  // Generate tags for all 10 supported languages
  const tags: HreflangTag[] = SUPPORTED_LANGUAGES.map((lang) => {
    const version = languageMap.get(lang);
    
    if (version) {
      // Use actual URL for existing language version
      return {
        hreflang: lang,
        href: buildContentUrl(version, lang),
      };
    } else {
      // Fallback to English version for missing languages
      return {
        hreflang: lang,
        href: englishUrl,
      };
    }
  });
  
  // Add x-default pointing to English version
  tags.push({
    hreflang: 'x-default',
    href: englishUrl,
  });
  
  return tags;
}

// =============================================================================
// DATABASE QUERIES
// =============================================================================

/**
 * Fetches all language versions of a content piece from the database.
 * Queries the appropriate table based on content type and returns
 * all published content with matching hreflang_group_id.
 * 
 * @param supabase - Supabase client instance
 * @param hreflangGroupId - The shared hreflang_group_id to query
 * @param contentType - Type of content (determines which table to query)
 * @returns Promise resolving to array of HreflangContent items
 * 
 * @example
 * const siblings = await fetchHreflangSiblings(supabase, 'abc-123', 'blog_tofu');
 * const tags = generateHreflangTags(currentArticle, siblings);
 */
export async function fetchHreflangSiblings(
  supabase: SupabaseClient,
  hreflangGroupId: string,
  contentType: ContentType
): Promise<HreflangContent[]> {
  const tableName = getTableForContentType(contentType);
  
  // Only include city_slug and topic_slug for location pages (other tables don't have these columns)
  const selectColumns = contentType === 'location'
    ? 'id, hreflang_group_id, language, slug, canonical_url, source_language, content_type, status, city_slug, topic_slug'
    : 'id, hreflang_group_id, language, slug, canonical_url, source_language, content_type, status';
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from(tableName)
    .select(selectColumns)
    .eq('hreflang_group_id', hreflangGroupId)
    .eq('status', 'published') as { data: any[] | null; error: any };
  
  if (error) {
    console.error(`Error fetching hreflang siblings from ${tableName}:`, error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Transform database results to HreflangContent interface
  return data.map((item) => ({
    id: item.id,
    hreflang_group_id: item.hreflang_group_id || '',
    language: (isSupportedLanguage(item.language) ? item.language : 'en') as SupportedLanguage,
    slug: item.slug,
    canonical_url: item.canonical_url || '',
    source_language: (isSupportedLanguage(item.source_language) ? item.source_language : 'en') as SupportedLanguage,
    content_type: (item.content_type || contentType) as ContentType,
    status: item.status as 'draft' | 'published',
    city_slug: item.city_slug,
    topic_slug: item.topic_slug,
  }));
}

/**
 * Fetches hreflang siblings and generates tags in one call.
 * Convenience function that combines fetchHreflangSiblings and generateHreflangTags.
 * 
 * @param supabase - Supabase client instance
 * @param currentContent - The content item being displayed
 * @returns Promise resolving to array of 11 HreflangTag objects
 * 
 * @example
 * const tags = await getHreflangTagsForContent(supabase, article);
 * // Use tags in <head> section
 */
export async function getHreflangTagsForContent(
  supabase: SupabaseClient,
  currentContent: HreflangContent
): Promise<HreflangTag[]> {
  if (!currentContent.hreflang_group_id) {
    // If no group ID, generate tags with just the current content
    return generateHreflangTags(currentContent, []);
  }
  
  const siblings = await fetchHreflangSiblings(
    supabase,
    currentContent.hreflang_group_id,
    currentContent.content_type
  );
  
  return generateHreflangTags(currentContent, siblings);
}
