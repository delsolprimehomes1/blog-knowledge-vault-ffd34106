-- Add page context columns to emma_leads table for analytics
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS page_type TEXT;
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS page_title TEXT;
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS referrer TEXT DEFAULT 'Direct';
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'Emma Chatbot';
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS lead_segment TEXT;
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS initial_lead_score INTEGER DEFAULT 15;
ALTER TABLE public.emma_leads ADD COLUMN IF NOT EXISTS conversation_duration TEXT;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_emma_leads_page_type ON public.emma_leads(page_type);
CREATE INDEX IF NOT EXISTS idx_emma_leads_lead_segment ON public.emma_leads(lead_segment);