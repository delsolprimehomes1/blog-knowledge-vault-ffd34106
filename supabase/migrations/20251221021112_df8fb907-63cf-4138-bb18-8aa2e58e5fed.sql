-- Drop the existing check constraint and recreate with city-qa mode
ALTER TABLE public.qa_generation_jobs DROP CONSTRAINT IF EXISTS faq_generation_jobs_mode_check;

-- Add updated constraint that includes city-qa mode
ALTER TABLE public.qa_generation_jobs ADD CONSTRAINT faq_generation_jobs_mode_check 
CHECK (mode IN ('bulk', 'selective', 'single', 'city-qa'));