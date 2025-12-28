-- Add cluster_id column to qa_pages table
ALTER TABLE qa_pages 
ADD COLUMN cluster_id UUID;

-- Create index for fast cluster lookups
CREATE INDEX idx_qa_pages_cluster_id ON qa_pages(cluster_id);

-- Backfill existing Q&A pages with cluster_id from their source article
UPDATE qa_pages qa
SET cluster_id = ba.cluster_id
FROM blog_articles ba
WHERE qa.source_article_id = ba.id
AND ba.cluster_id IS NOT NULL;