-- Add conversation_transcript column to store the complete conversation
ALTER TABLE emma_leads 
ADD COLUMN IF NOT EXISTS conversation_transcript JSONB;