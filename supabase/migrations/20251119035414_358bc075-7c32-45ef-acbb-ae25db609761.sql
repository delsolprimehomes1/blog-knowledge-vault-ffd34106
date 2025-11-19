-- Add language, region, and source_type columns to approved_domains
ALTER TABLE public.approved_domains
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.approved_domains.language IS 'Language code (e.g., EN, ES, DE, NL, FR, PL, SE, DK, HU)';
COMMENT ON COLUMN public.approved_domains.region IS 'Geographic region (e.g., EU, UK, US, Spain, Germany)';
COMMENT ON COLUMN public.approved_domains.source_type IS 'Type of source (e.g., government, institutional, news, academic, tourism)';

-- Create index for faster language filtering
CREATE INDEX IF NOT EXISTS idx_approved_domains_language ON public.approved_domains(language);
CREATE INDEX IF NOT EXISTS idx_approved_domains_source_type ON public.approved_domains(source_type);