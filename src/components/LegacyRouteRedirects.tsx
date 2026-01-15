import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";

/**
 * Redirect components for legacy URLs without language prefix
 * Returns 404 if slug doesn't exist (no more fallback to /en/)
 */

// Redirect /blog/:slug -> /{actual-language}/blog/:slug OR 404 if not found
export const BlogRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: article, isLoading, error } = useQuery({
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
  
  // If article not found, show 404 - NO FALLBACK TO /en/
  if (!article || error) {
    return <NotFound />;
  }
  
  return <Navigate to={`/${article.language}/blog/${slug}`} replace />;
};

// Redirect /qa/:slug -> /{actual-language}/qa/:slug OR 404 if not found
export const QARedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: qaPage, isLoading, error } = useQuery({
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
  
  // If Q&A not found, show 404 - NO FALLBACK TO /en/
  if (!qaPage || error) {
    return <NotFound />;
  }
  
  return <Navigate to={`/${qaPage.language}/qa/${slug}`} replace />;
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
