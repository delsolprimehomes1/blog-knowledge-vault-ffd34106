-- Add funnel_stage column to qa_pages for Hans' funnel-based linking strategy
ALTER TABLE qa_pages 
ADD COLUMN IF NOT EXISTS funnel_stage TEXT 
CHECK (funnel_stage IN ('TOFU', 'MOFU', 'BOFU'));

-- Create index for efficient funnel_stage queries
CREATE INDEX IF NOT EXISTS idx_qa_pages_funnel_stage 
ON qa_pages(funnel_stage);

-- Create composite index for Hans' query pattern (cluster + language + funnel)
CREATE INDEX IF NOT EXISTS idx_qa_pages_cluster_lang_funnel 
ON qa_pages(cluster_id, language, funnel_stage);

-- Backfill existing Q&As with funnel stage from their source article
UPDATE qa_pages qa
SET funnel_stage = ba.funnel_stage
FROM blog_articles ba
WHERE qa.source_article_id = ba.id
AND qa.funnel_stage IS NULL;