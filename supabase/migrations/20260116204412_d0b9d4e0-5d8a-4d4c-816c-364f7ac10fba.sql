-- Backfill Q&A page categories from their source blog articles
UPDATE qa_pages qa
SET category = ba.category
FROM blog_articles ba
WHERE qa.source_article_id = ba.id
AND qa.category IS NULL
AND ba.category IS NOT NULL;

-- For any Q&As without a source article, set a default category
UPDATE qa_pages
SET category = 'General'
WHERE category IS NULL;