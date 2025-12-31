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
  BASE_URL,
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
  /** Source language of the original content (defaults to 'en') */
  source_language?: string;
  /** Translations JSONB from the article (fallback when hreflang_group_id is missing) */
  translations?: Record<string, string> | null;
}

/**
 * Renders hreflang link tags for blog articles.
 * Fetches sibling language versions and generates proper hreflang tags
 * for SEO internationalization support.
 */
export const BlogHreflangTags = ({
  id,
  hreflang_group_id,
  language,
  slug,
  canonical_url,
  content_type,
  source_language,
  translations,
}: BlogHreflangTagsProps) => {
  const [siblings, setSiblings] = useState<HreflangContent[]>([]);

  // Fetch siblings when hreflang_group_id changes
  useEffect(() => {
    const fetchSiblings = async () => {
      // If we have hreflang_group_id, use it
      if (hreflang_group_id) {
        const contentTypeValue = (content_type || 'blog_tofu') as ContentType;
        const results = await fetchHreflangSiblings(
          supabase,
          hreflang_group_id,
          contentTypeValue
        );
        setSiblings(results);
        return;
      }

      // Fallback: use translations JSONB to find siblings by slug
      if (translations && Object.keys(translations).length > 0) {
        const translationSlugs = Object.values(translations);
        const { data, error } = await supabase
          .from('blog_articles')
          .select('id, hreflang_group_id, language, slug, canonical_url, source_language, content_type, status')
          .in('slug', translationSlugs)
          .eq('status', 'published');

        if (!error && data) {
          const mappedSiblings: HreflangContent[] = data.map((item: any) => ({
            id: item.id,
            hreflang_group_id: item.hreflang_group_id || item.id,
            language: (isSupportedLanguage(item.language) ? item.language : 'en') as SupportedLanguage,
            slug: item.slug,
            canonical_url: item.canonical_url || `${BASE_URL}/${item.language}/blog/${item.slug}`,
            source_language: (isSupportedLanguage(item.source_language) ? item.source_language : 'en') as SupportedLanguage,
            content_type: (item.content_type || 'blog_tofu') as ContentType,
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
  }, [hreflang_group_id, content_type, translations]);

  // Create current article as HreflangContent
  const validSourceLang = (isSupportedLanguage(source_language || 'en') ? (source_language || 'en') : 'en') as SupportedLanguage;
  const currentArticle: HreflangContent = useMemo(() => ({
    id,
    hreflang_group_id: hreflang_group_id || id, // Use id as fallback group
    language: (isSupportedLanguage(language) ? language : 'en') as SupportedLanguage,
    slug,
    canonical_url: canonical_url || `${BASE_URL}/${language}/blog/${slug}`,
    source_language: validSourceLang,
    content_type: (content_type || 'blog_tofu') as ContentType,
    status: 'published' as const,
  }), [id, hreflang_group_id, language, slug, canonical_url, content_type, validSourceLang]);

  // Generate hreflang tags with self-reference and correct x-default
  const hreflangTags = useMemo(() => {
    const tags = generateHreflangTags(currentArticle, siblings);
    
    // Ensure self-reference exists
    const selfUrl = canonical_url || `${BASE_URL}/${language}/blog/${slug}`;
    const validLang = (isSupportedLanguage(language) ? language : 'en') as SupportedLanguage;
    const hasSelfReference = tags.some(t => t.hreflang === validLang);
    if (!hasSelfReference) {
      tags.unshift({ hreflang: validLang, href: selfUrl });
    }
    
    // Fix x-default to point to English version (not self if not English)
    const xDefaultIndex = tags.findIndex(t => t.hreflang === 'x-default');
    if (xDefaultIndex !== -1) {
      // Find English sibling
      const englishSibling = siblings.find(s => s.language === 'en');
      const englishUrl = englishSibling?.canonical_url 
        || (translations?.en ? `${BASE_URL}/en/blog/${translations.en}` : null)
        || (language === 'en' ? selfUrl : null);
      
      if (englishUrl && tags[xDefaultIndex].href !== englishUrl) {
        tags[xDefaultIndex] = { hreflang: 'x-default', href: englishUrl };
      }
    }
    
    return tags;
  }, [currentArticle, siblings, language, canonical_url, slug, translations]);

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
