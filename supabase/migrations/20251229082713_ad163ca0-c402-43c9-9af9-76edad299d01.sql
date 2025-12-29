-- Drop the old constraint that only allows 'core' and 'decision'
ALTER TABLE qa_pages 
DROP CONSTRAINT IF EXISTS faq_pages_faq_type_check;

-- Add new constraint with all 4 types
ALTER TABLE qa_pages 
ADD CONSTRAINT faq_pages_faq_type_check 
CHECK (qa_type = ANY (ARRAY['core'::text, 'decision'::text, 'practical'::text, 'problem'::text]));