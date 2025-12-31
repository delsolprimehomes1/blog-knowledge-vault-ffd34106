import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import {
  HreflangContent,
  SupportedLanguage,
  fetchHreflangSiblings,
  generateHreflangTags,
  isSupportedLanguage,
  BASE_URL,
} from '@/types/hreflang';

/**
 * Props for the ComparisonHreflangTags component.
 */
interface ComparisonHreflangTagsProps {
  /** Unique comparison page ID */
  id: string;
  /** Shared ID across all language versions */
  hreflang_group_id: string | null;
  /** Language code of this comparison page */
  language: string;
  /** URL slug for this comparison page */
  slug: string;
  /** Full canonical URL for this comparison page */
  canonical_url: string | null;
  /** Source language of the original content (defaults to 'en') */
  source_language?: string;
  /** Translations JSONB from the comparison (fallback when hreflang_group_id is missing) */
  translations?: Record<string, string> | null;
}

/**
 * Renders hreflang link tags for comparison pages.
 * Fetches sibling language versions and generates proper hreflang tags
 * for SEO internationalization support.
 */
export const ComparisonHreflangTags = ({
  id,
  hreflang_group_id,
  language,
  slug,
  canonical_url,
  source_language,
  translations,
}: ComparisonHreflangTagsProps) => {
  const [siblings, setSiblings] = useState<HreflangContent[]>([]);

  // Fetch siblings when hreflang_group_id changes
  useEffect(() => {
    const fetchSiblings = async () => {
      // If we have hreflang_group_id, use it
      if (hreflang_group_id) {
        const results = await fetchHreflangSiblings(supabase, hreflang_group_id, 'comparison');
        setSiblings(results);
        return;
      }

      // Fallback: use translations JSONB to find siblings by slug
      if (translations && Object.keys(translations).length > 0) {
        const translationSlugs = Object.values(translations);
        const { data, error } = await supabase
          .from('comparison_pages')
          .select('id, hreflang_group_id, language, slug, canonical_url, source_language, content_type, status')
          .in('slug', translationSlugs)
          .eq('status', 'published');

        if (!error && data) {
          const mappedSiblings: HreflangContent[] = data.map((item: any) => ({
            id: item.id,
            hreflang_group_id: item.hreflang_group_id || item.id,
            language: (isSupportedLanguage(item.language) ? item.language : 'en') as SupportedLanguage,
            slug: item.slug,
            canonical_url: item.canonical_url || `${BASE_URL}/${item.language}/compare/${item.slug}`,
            source_language: (isSupportedLanguage(item.source_language) ? item.source_language : 'en') as SupportedLanguage,
            content_type: 'comparison',
            status: item.status as 'draft' | 'published',
          }));
          setSiblings(mappedSiblings);
          return;
        }
      }

      // No siblings found
      setSiblings([]);
    };

    fetchSiblings();
  }, [hreflang_group_id, translations]);

  // Create current comparison page as HreflangContent
  const validSourceLang = (isSupportedLanguage(source_language || 'en') ? (source_language || 'en') : 'en') as SupportedLanguage;
  const currentPage: HreflangContent = useMemo(() => ({
    id,
    hreflang_group_id: hreflang_group_id || id,
    language: (isSupportedLanguage(language) ? language : 'en') as SupportedLanguage,
    slug,
    canonical_url: canonical_url || `${BASE_URL}/${language}/compare/${slug}`,
    source_language: validSourceLang,
    content_type: 'comparison',
    status: 'published' as const,
  }), [id, hreflang_group_id, language, slug, canonical_url, validSourceLang]);

  // Generate hreflang tags with guaranteed self-reference and correct x-default
  const hreflangTags = useMemo(() => {
    const baseTags = generateHreflangTags(currentPage, siblings);
    
    // Ensure self-reference exists
    const currentLang = currentPage.language;
    const currentUrl = currentPage.canonical_url || `${BASE_URL}/${currentPage.language}/compare/${currentPage.slug}`;
    const hasSelfReference = baseTags.some(tag => tag.hreflang === currentLang);
    
    if (!hasSelfReference) {
      baseTags.unshift({ hreflang: currentLang, href: currentUrl });
    }
    
    // Fix x-default: must point to English version if it exists
    const englishSibling = siblings.find(s => s.language === 'en' && s.status === 'published');
    const xDefaultIndex = baseTags.findIndex(tag => tag.hreflang === 'x-default');
    
    if (xDefaultIndex !== -1) {
      if (englishSibling) {
        // Point to English sibling
        baseTags[xDefaultIndex] = {
          hreflang: 'x-default',
          href: englishSibling.canonical_url || `${BASE_URL}/en/compare/${englishSibling.slug}`,
        };
      } else if (currentPage.language === 'en') {
        // Current page IS English, use it
        baseTags[xDefaultIndex] = {
          hreflang: 'x-default',
          href: currentUrl,
        };
      } else {
        // No English version exists - remove x-default to avoid pointing to wrong language
        baseTags.splice(xDefaultIndex, 1);
      }
    }
    
    return baseTags;
  }, [currentPage, siblings]);

  return (
    <Helmet>
      {hreflangTags.map((tag) => (
        <link
          key={tag.hreflang}
          rel="alternate"
          hrefLang={tag.hreflang}
          href={tag.href}
        />
      ))}
    </Helmet>
  );
};

export default ComparisonHreflangTags;
