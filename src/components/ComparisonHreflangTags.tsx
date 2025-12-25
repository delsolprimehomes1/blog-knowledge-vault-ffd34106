import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import {
  HreflangContent,
  SupportedLanguage,
  fetchHreflangSiblings,
  generateHreflangTags,
  isSupportedLanguage,
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
}: ComparisonHreflangTagsProps) => {
  const [siblings, setSiblings] = useState<HreflangContent[]>([]);

  // Warn if missing hreflang_group_id
  useEffect(() => {
    if (!hreflang_group_id) {
      console.warn(
        `ComparisonHreflangTags: Comparison page "${slug}" is missing hreflang_group_id. Hreflang tags will use fallback behavior.`
      );
    }
  }, [hreflang_group_id, slug]);

  // Fetch siblings when hreflang_group_id changes
  useEffect(() => {
    if (!hreflang_group_id) {
      setSiblings([]);
      return;
    }

    const fetchSiblings = async () => {
      const results = await fetchHreflangSiblings(supabase, hreflang_group_id, 'comparison');
      setSiblings(results);
    };

    fetchSiblings();
  }, [hreflang_group_id]);

  // Create current comparison page as HreflangContent
  const validSourceLang = (isSupportedLanguage(source_language || 'en') ? (source_language || 'en') : 'en') as SupportedLanguage;
  const currentPage: HreflangContent = useMemo(() => ({
    id,
    hreflang_group_id: hreflang_group_id || id,
    language: (isSupportedLanguage(language) ? language : 'en') as SupportedLanguage,
    slug,
    canonical_url: canonical_url || '',
    source_language: validSourceLang,
    content_type: 'comparison',
    status: 'published' as const,
  }), [id, hreflang_group_id, language, slug, canonical_url, validSourceLang]);

  // Generate hreflang tags
  const hreflangTags = useMemo(
    () => generateHreflangTags(currentPage, siblings),
    [currentPage, siblings]
  );

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
