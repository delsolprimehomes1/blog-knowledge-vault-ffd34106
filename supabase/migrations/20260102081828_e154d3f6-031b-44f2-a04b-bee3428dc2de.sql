-- Add column to track partial Q&A type progress for graceful timeout recovery
ALTER TABLE qa_generation_jobs 
ADD COLUMN IF NOT EXISTS resume_from_qa_type TEXT;