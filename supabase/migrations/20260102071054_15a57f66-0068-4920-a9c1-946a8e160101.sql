-- Add new columns to qa_generation_jobs for cluster-wide Q&A tracking
ALTER TABLE qa_generation_jobs 
ADD COLUMN IF NOT EXISTS articles_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_qas_created integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_qas_failed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_article_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_percent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS article_results jsonb DEFAULT '[]'::jsonb;