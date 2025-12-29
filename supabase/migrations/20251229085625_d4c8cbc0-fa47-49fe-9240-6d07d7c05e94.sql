-- Fix the view to use SECURITY INVOKER instead of default SECURITY DEFINER
DROP VIEW IF EXISTS duplicate_image_articles;

CREATE VIEW duplicate_image_articles WITH (security_invoker = true) AS
WITH image_counts AS (
  SELECT 
    featured_image_url,
    COUNT(*) as usage_count,
    ARRAY_AGG(id) as article_ids,
    ARRAY_AGG(headline) as headlines,
    ARRAY_AGG(cluster_id) as cluster_ids
  FROM blog_articles
  WHERE featured_image_url IS NOT NULL 
    AND featured_image_url != ''
    AND status IN ('draft', 'published')
  GROUP BY featured_image_url
  HAVING COUNT(*) > 1
)
SELECT 
  featured_image_url,
  usage_count,
  article_ids,
  headlines,
  cluster_ids
FROM image_counts
ORDER BY usage_count DESC;