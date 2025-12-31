-- Immediate fix: Add self-reference to articles missing their own language in translations
UPDATE blog_articles
SET translations = COALESCE(translations, '{}'::jsonb) || jsonb_build_object(language, slug)
WHERE status = 'published'
AND (translations IS NULL OR NOT (translations ? language));