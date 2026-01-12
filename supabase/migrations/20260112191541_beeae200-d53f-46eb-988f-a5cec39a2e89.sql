-- Create emma_leads table for complete lead data tracking with webhook retry system
CREATE TABLE public.emma_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL UNIQUE,
  
  -- Contact Info (4 fields)
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  country_prefix TEXT,
  
  -- Q&A Phase (7 fields)
  question_1 TEXT,
  answer_1 TEXT,
  question_2 TEXT,
  answer_2 TEXT,
  question_3 TEXT,
  answer_3 TEXT,
  questions_answered INTEGER DEFAULT 0,
  
  -- Property Criteria (7 fields)
  location_preference JSONB DEFAULT '[]'::jsonb,
  sea_view_importance TEXT,
  budget_range TEXT,
  bedrooms_desired TEXT,
  property_type JSONB DEFAULT '[]'::jsonb,
  property_purpose TEXT,
  timeframe TEXT,
  
  -- System Data (6 fields)
  detected_language TEXT DEFAULT 'EN',
  intake_complete BOOLEAN DEFAULT FALSE,
  declined_selection BOOLEAN DEFAULT FALSE,
  conversation_date TIMESTAMPTZ DEFAULT NOW(),
  conversation_status TEXT DEFAULT 'in_progress',
  exit_point TEXT DEFAULT 'greeting',
  
  -- Webhook Tracking
  webhook_sent BOOLEAN DEFAULT FALSE,
  webhook_sent_at TIMESTAMPTZ,
  webhook_attempts INTEGER DEFAULT 0,
  webhook_last_error TEXT,
  webhook_payload JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.emma_leads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view emma leads" 
ON public.emma_leads 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can insert emma leads" 
ON public.emma_leads 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update emma leads" 
ON public.emma_leads 
FOR UPDATE 
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_emma_leads_updated_at
BEFORE UPDATE ON public.emma_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for webhook retry queries
CREATE INDEX idx_emma_leads_webhook_pending ON public.emma_leads (webhook_sent, webhook_attempts) WHERE webhook_sent = false;
CREATE INDEX idx_emma_leads_conversation_id ON public.emma_leads (conversation_id);
CREATE INDEX idx_emma_leads_created_at ON public.emma_leads (created_at DESC);