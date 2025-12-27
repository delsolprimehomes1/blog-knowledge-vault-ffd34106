-- Drop the incorrect constraint that only allows 1 article per cluster/language
-- The correct constraint (unique_cluster_language_article) already exists and allows 6 articles per cluster
ALTER TABLE blog_articles DROP CONSTRAINT IF EXISTS unique_cluster_language;