-- Fix hreflang_group_id for cluster f00cbad6-e00a-4a9d-9b02-f405d0ab0c87
-- Each cluster_number should share ONE hreflang_group_id across all 10 languages
-- Use the English article's hreflang_group_id as the canonical one for each cluster_number

WITH english_groups AS (
  SELECT cluster_number, hreflang_group_id
  FROM blog_articles
  WHERE cluster_id = 'f00cbad6-e00a-4a9d-9b02-f405d0ab0c87'
  AND language = 'en'
)
UPDATE blog_articles ba
SET hreflang_group_id = eg.hreflang_group_id
FROM english_groups eg
WHERE ba.cluster_id = 'f00cbad6-e00a-4a9d-9b02-f405d0ab0c87'
AND ba.cluster_number = eg.cluster_number;