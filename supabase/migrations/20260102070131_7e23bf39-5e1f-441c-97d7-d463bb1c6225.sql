-- Drop the old constraint that only allows core, decision, practical, problem
ALTER TABLE qa_pages DROP CONSTRAINT IF EXISTS faq_pages_faq_type_check;

-- Add new constraint with the descriptive Q&A types used by generate-article-qas
ALTER TABLE qa_pages ADD CONSTRAINT faq_pages_faq_type_check 
CHECK (qa_type IN ('pitfalls', 'costs', 'process', 'legal'));