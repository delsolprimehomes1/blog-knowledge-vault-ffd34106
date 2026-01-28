-- Add conversation_transcript column to crm_leads table
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS conversation_transcript JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.crm_leads.conversation_transcript IS 'Full Emma chatbot conversation history with all messages';