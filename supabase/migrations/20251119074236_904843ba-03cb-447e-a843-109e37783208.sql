-- Add citation_status tracking to blog_articles
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS citation_status TEXT DEFAULT 'pending' CHECK (citation_status IN ('pending', 'verified', 'failed'));

ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS citation_failure_reason TEXT;

-- Index for filtering failed citations
CREATE INDEX IF NOT EXISTS idx_blog_articles_citation_status 
ON blog_articles(citation_status) WHERE citation_status = 'failed';

-- Update existing articles to 'verified' if they have 2+ citations
UPDATE blog_articles 
SET citation_status = 'verified' 
WHERE (external_citations IS NOT NULL AND jsonb_array_length(external_citations) >= 2);

-- Mark articles with < 2 citations as failed
UPDATE blog_articles 
SET citation_status = 'failed', 
    citation_failure_reason = 'Insufficient citations (legacy article)'
WHERE (external_citations IS NULL OR jsonb_array_length(external_citations) < 2) 
AND status = 'published';