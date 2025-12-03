-- Phase 1: Complete data model migration

-- Step 1: Add is_primary column
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Step 2: Fill NULL cluster_ids with new UUIDs
UPDATE blog_articles 
SET cluster_id = gen_random_uuid()
WHERE cluster_id IS NULL;

-- Step 3: Fix duplicates - keep oldest per (cluster_id, language), others get new cluster_id
WITH ranked_articles AS (
  SELECT 
    id,
    cluster_id,
    language,
    ROW_NUMBER() OVER (
      PARTITION BY cluster_id, language 
      ORDER BY created_at ASC
    ) as rn
  FROM blog_articles
  WHERE cluster_id IS NOT NULL
),
duplicates_to_fix AS (
  SELECT id
  FROM ranked_articles
  WHERE rn > 1
)
UPDATE blog_articles 
SET cluster_id = gen_random_uuid()
WHERE id IN (SELECT id FROM duplicates_to_fix);

-- Step 4: Backfill is_primary (EN preferred, then alphabetically)
WITH cluster_primaries AS (
  SELECT DISTINCT ON (cluster_id) id
  FROM blog_articles
  WHERE cluster_id IS NOT NULL
  ORDER BY cluster_id, 
    CASE WHEN language = 'en' THEN 0 ELSE 1 END,
    language ASC
)
UPDATE blog_articles 
SET is_primary = true 
WHERE id IN (SELECT id FROM cluster_primaries);

-- Step 5: Add unique constraint
ALTER TABLE blog_articles 
ADD CONSTRAINT unique_cluster_language UNIQUE (cluster_id, language);