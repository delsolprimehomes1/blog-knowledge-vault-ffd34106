-- Add composite index for faster article lookups by slug+status
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug_status_published 
ON blog_articles(slug, status) 
WHERE status = 'published';