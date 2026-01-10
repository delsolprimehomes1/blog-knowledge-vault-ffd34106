-- Add unique constraint to prevent duplicate Q&As per (source_article_id, qa_type, language)
CREATE UNIQUE INDEX IF NOT EXISTS unique_qa_per_article_type_lang 
ON qa_pages (source_article_id, qa_type, language) 
WHERE status != 'archived' AND source_article_id IS NOT NULL;