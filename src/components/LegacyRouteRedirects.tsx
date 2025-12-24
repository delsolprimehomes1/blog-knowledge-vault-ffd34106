import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Redirect components for legacy URLs without language prefix
 * Q&A redirect looks up the actual language from DB to redirect correctly
 */

// Redirect /blog/:slug -> /{actual-language}/blog/:slug (looks up correct language)
export const BlogRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: article, isLoading } = useQuery({
    queryKey: ['blog-redirect', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_articles')
        .select('slug, language')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      return data;
    },
    enabled: !!slug,
  });

  // While loading, show nothing (brief flash)
  if (isLoading) return null;
  
  // Redirect to correct language folder, fallback to /en/ if not found
  const targetLang = article?.language || 'en';
  return <Navigate to={`/${targetLang}/blog/${slug}`} replace />;
};

// Redirect /qa/:slug -> /{actual-language}/qa/:slug (looks up correct language)
export const QARedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: qaPage, isLoading } = useQuery({
    queryKey: ['qa-redirect', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('qa_pages')
        .select('slug, language')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      return data;
    },
    enabled: !!slug,
  });

  // While loading, show nothing (brief flash)
  if (isLoading) return null;
  
  // Redirect to correct language folder, fallback to /en/ if not found
  const targetLang = qaPage?.language || 'en';
  return <Navigate to={`/${targetLang}/qa/${slug}`} replace />;
};

// Redirect /compare/:slug -> /en/compare/:slug
export const ComparisonRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/en/compare/${slug}`} replace />;
};

// Redirect /locations/:citySlug -> /en/locations/:citySlug
export const LocationIndexRedirect = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  return <Navigate to={`/en/locations/${citySlug}`} replace />;
};

// Redirect /locations/:citySlug/:topicSlug -> /en/locations/:citySlug/:topicSlug
export const LocationPageRedirect = () => {
  const { citySlug, topicSlug } = useParams<{ citySlug: string; topicSlug: string }>();
  return <Navigate to={`/en/locations/${citySlug}/${topicSlug}`} replace />;
};
