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
 * Props for the QAHreflangTags component.
 */
interface QAHreflangTagsProps {
  /** Unique Q&A page ID */
  id: string;
  /** Shared ID across all language versions */
  hreflang_group_id: string | null;
  /** Language code of this Q&A page */
  language: string;
  /** URL slug for this Q&A page */
  slug: string;
  /** Full canonical URL for this Q&A page */
  canonical_url: string | null;
}

/**
 * Renders hreflang link tags for Q&A pages.
 * Fetches sibling language versions and generates proper hreflang tags
 * for SEO internationalization support.
 */
export const QAHreflangTags = ({
  id,
  hreflang_group_id,
  language,
  slug,
  canonical_url,
}: QAHreflangTagsProps) => {
  const [siblings, setSiblings] = useState<HreflangContent[]>([]);

  // Warn if missing hreflang_group_id
  useEffect(() => {
    if (!hreflang_group_id) {
      console.warn(
        `QAHreflangTags: Q&A page "${slug}" is missing hreflang_group_id. Hreflang tags will use fallback behavior.`
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
      const results = await fetchHreflangSiblings(supabase, hreflang_group_id, 'qa');
      setSiblings(results);
    };

    fetchSiblings();
  }, [hreflang_group_id]);

  // Create current Q&A page as HreflangContent
  const currentPage: HreflangContent = useMemo(() => ({
    id,
    hreflang_group_id: hreflang_group_id || id,
    language: (isSupportedLanguage(language) ? language : 'en') as SupportedLanguage,
    slug,
    canonical_url: canonical_url || '',
    source_language: 'en' as SupportedLanguage,
    content_type: 'qa',
    status: 'published' as const,
  }), [id, hreflang_group_id, language, slug, canonical_url]);

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

export default QAHreflangTags;
