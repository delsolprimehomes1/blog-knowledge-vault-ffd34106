import { Navigate, useParams } from "react-router-dom";

/**
 * Redirect components for legacy URLs without language prefix
 * These redirect to the English (/en/) version of each page
 */

// Redirect /blog/:slug -> /en/blog/:slug
export const BlogRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/en/blog/${slug}`} replace />;
};

// Redirect /qa/:slug -> /en/qa/:slug
export const QARedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/en/qa/${slug}`} replace />;
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
