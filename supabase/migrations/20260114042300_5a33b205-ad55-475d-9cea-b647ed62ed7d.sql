-- Add redirect tracking to all content tables
ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS is_redirect BOOLEAN DEFAULT FALSE;
ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS redirect_to TEXT;

ALTER TABLE qa_pages ADD COLUMN IF NOT EXISTS is_redirect BOOLEAN DEFAULT FALSE;
ALTER TABLE qa_pages ADD COLUMN IF NOT EXISTS redirect_to TEXT;

ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS is_redirect BOOLEAN DEFAULT FALSE;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS redirect_to TEXT;

ALTER TABLE comparison_pages ADD COLUMN IF NOT EXISTS is_redirect BOOLEAN DEFAULT FALSE;
ALTER TABLE comparison_pages ADD COLUMN IF NOT EXISTS redirect_to TEXT;

-- Create indexes for fast sitemap filtering
CREATE INDEX IF NOT EXISTS idx_blog_articles_redirect ON blog_articles(is_redirect) WHERE is_redirect = TRUE;
CREATE INDEX IF NOT EXISTS idx_qa_pages_redirect ON qa_pages(is_redirect) WHERE is_redirect = TRUE;
CREATE INDEX IF NOT EXISTS idx_location_pages_redirect ON location_pages(is_redirect) WHERE is_redirect = TRUE;
CREATE INDEX IF NOT EXISTS idx_comparison_pages_redirect ON comparison_pages(is_redirect) WHERE is_redirect = TRUE;