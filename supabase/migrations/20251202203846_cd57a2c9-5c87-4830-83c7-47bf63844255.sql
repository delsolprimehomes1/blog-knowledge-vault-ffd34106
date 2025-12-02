-- Phase 1: Database Safeguards for Cluster Generator

-- 1.1 Add UNIQUE constraint to prevent duplicate articles for same cluster+language+position
ALTER TABLE blog_articles 
ADD CONSTRAINT unique_cluster_language_article 
UNIQUE (cluster_id, language, cluster_number);

-- 1.2 Add per-language status tracking column to cluster_generations
ALTER TABLE cluster_generations 
ADD COLUMN IF NOT EXISTS language_status JSONB DEFAULT '{}';

-- 1.3 Add completion_note column if it doesn't exist
ALTER TABLE cluster_generations 
ADD COLUMN IF NOT EXISTS completion_note TEXT;

-- Create index for faster language_status queries
CREATE INDEX IF NOT EXISTS idx_cluster_generations_language_status 
ON cluster_generations USING GIN (language_status);

-- Add comment explaining the column
COMMENT ON COLUMN cluster_generations.language_status IS 
'Per-language generation status tracking. Values: pending, running, completed, failed, timeout. Used for deterministic resume logic.';