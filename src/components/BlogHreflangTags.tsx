import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import {
  HreflangContent,
  ContentType,
  SupportedLanguage,
  fetchHreflangSiblings,
  generateHreflangTags,
  isSupportedLanguage,
} from '@/types/hreflang';

/**
 * Props for the BlogHreflangTags component.
 */
interface BlogHreflangTagsProps {
  /** Unique article ID */
  id: string;
  /** Shared ID across all language versions */
  hreflang_group_id: string | null;
  /** Language code of this article */
  language: string;
  /** URL slug for this article */
  slug: string;
  /** Full canonical URL for this article */
  canonical_url: string | null;
  /** Type of content (blog_tofu, blog_mofu, blog_bofu, etc.) */
  content_type: string | null;
}

/**
 * Renders hreflang link tags for blog articles.
 * Fetches sibling language versions and generates proper hreflang tags
 * for SEO internationalization support.
 * 
 * @example
 * <BlogHreflangTags
 *   id={article.id}
 *   hreflang_group_id={article.hreflang_group_id}
 *   language={article.language}
 *   slug={article.slug}
 *   canonical_url={article.canonical_url}
 *   content_type={article.content_type}
 * />
 */
export const BlogHreflangTags = ({
  id,
  hreflang_group_id,
  language,
  slug,
  canonical_url,
  content_type,
}: BlogHreflangTagsProps) => {
  const [siblings, setSiblings] = useState<HreflangContent[]>([]);

  // Warn if missing hreflang_group_id
  useEffect(() => {
    if (!hreflang_group_id) {
      console.warn(
        `BlogHreflangTags: Article "${slug}" is missing hreflang_group_id. Hreflang tags will use fallback behavior.`
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
      const contentTypeValue = (content_type || 'blog_tofu') as ContentType;
      const results = await fetchHreflangSiblings(
        supabase,
        hreflang_group_id,
        contentTypeValue
      );
      setSiblings(results);
    };

    fetchSiblings();
  }, [hreflang_group_id, content_type]);

  // Create current article as HreflangContent
  const currentArticle: HreflangContent = useMemo(() => ({
    id,
    hreflang_group_id: hreflang_group_id || id, // Use id as fallback group
    language: (isSupportedLanguage(language) ? language : 'en') as SupportedLanguage,
    slug,
    canonical_url: canonical_url || '',
    source_language: 'en' as SupportedLanguage,
    content_type: (content_type || 'blog_tofu') as ContentType,
    status: 'published' as const,
  }), [id, hreflang_group_id, language, slug, canonical_url, content_type]);

  // Generate hreflang tags
  const hreflangTags = useMemo(
    () => generateHreflangTags(currentArticle, siblings),
    [currentArticle, siblings]
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

export default BlogHreflangTags;
