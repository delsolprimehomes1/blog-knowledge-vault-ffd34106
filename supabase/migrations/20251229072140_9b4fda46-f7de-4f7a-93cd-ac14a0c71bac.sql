-- Add columns to track current processing state for real-time progress
ALTER TABLE qa_generation_jobs 
ADD COLUMN IF NOT EXISTS current_article_headline text,
ADD COLUMN IF NOT EXISTS current_language text,
ADD COLUMN IF NOT EXISTS cluster_id uuid;