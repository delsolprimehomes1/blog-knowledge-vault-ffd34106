-- Add multilingual cluster tracking columns to cluster_generations table
ALTER TABLE cluster_generations 
ADD COLUMN IF NOT EXISTS is_multilingual BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS languages_queue TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_language_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_languages TEXT[] DEFAULT '{}';

-- Add index for faster multilingual job queries
CREATE INDEX IF NOT EXISTS idx_cluster_generations_multilingual 
ON cluster_generations(is_multilingual, current_language_index) 
WHERE is_multilingual = true;