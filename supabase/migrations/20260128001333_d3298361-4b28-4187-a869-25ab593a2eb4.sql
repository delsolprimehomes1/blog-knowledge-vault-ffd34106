-- Create retargeting leads table
CREATE TABLE public.retargeting_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  email TEXT NOT NULL,
  question TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'new',
  notes TEXT
);

-- Create indexes for quick lookups
CREATE INDEX idx_retargeting_leads_email ON public.retargeting_leads(email);
CREATE INDEX idx_retargeting_leads_created_at ON public.retargeting_leads(created_at DESC);
CREATE INDEX idx_retargeting_leads_language ON public.retargeting_leads(language);
CREATE INDEX idx_retargeting_leads_status ON public.retargeting_leads(status);

-- Enable RLS
ALTER TABLE public.retargeting_leads ENABLE ROW LEVEL SECURITY;

-- Policy for inserting (public can insert)
CREATE POLICY "Anyone can insert retargeting leads" 
ON public.retargeting_leads FOR INSERT 
WITH CHECK (true);

-- Policy for reading (only authenticated users can read)
CREATE POLICY "Authenticated users can read retargeting leads" 
ON public.retargeting_leads FOR SELECT 
TO authenticated
USING (true);