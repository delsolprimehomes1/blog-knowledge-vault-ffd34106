-- Add languages_status JSONB column to track per-language completion
ALTER TABLE cluster_completion_progress
ADD COLUMN IF NOT EXISTS languages_status JSONB DEFAULT '{}';

-- Add comment explaining structure
COMMENT ON COLUMN cluster_completion_progress.languages_status IS 'Per-language completion tracking: { "de": { "count": 6, "completed": true, "completed_at": "..." }, ... }';