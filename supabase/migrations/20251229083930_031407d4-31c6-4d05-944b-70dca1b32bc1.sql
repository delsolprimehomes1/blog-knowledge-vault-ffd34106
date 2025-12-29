-- Prevent same language appearing twice in same hreflang_group
CREATE UNIQUE INDEX IF NOT EXISTS unique_language_per_hreflang_group 
ON blog_articles (hreflang_group_id, language) 
WHERE hreflang_group_id IS NOT NULL AND status != 'archived';