-- Add enhanced activity tracking columns to crm_activities
ALTER TABLE public.crm_activities 
ADD COLUMN IF NOT EXISTS interest_level text,
ADD COLUMN IF NOT EXISTS sentiment_score numeric,
ADD COLUMN IF NOT EXISTS whatsapp_template_used text,
ADD COLUMN IF NOT EXISTS auto_status_update text;

-- Add constraint for interest_level
ALTER TABLE public.crm_activities
ADD CONSTRAINT crm_activities_interest_level_check 
CHECK (interest_level IS NULL OR interest_level IN ('very_interested', 'interested', 'neutral', 'not_interested'));

-- Add constraint for sentiment_score (0.0 to 1.0)
ALTER TABLE public.crm_activities
ADD CONSTRAINT crm_activities_sentiment_score_check 
CHECK (sentiment_score IS NULL OR (sentiment_score >= 0 AND sentiment_score <= 1));

-- Create index for faster interest level queries
CREATE INDEX IF NOT EXISTS idx_crm_activities_interest_level ON public.crm_activities(interest_level);

-- Create index for sentiment analysis queries
CREATE INDEX IF NOT EXISTS idx_crm_activities_sentiment_score ON public.crm_activities(sentiment_score);