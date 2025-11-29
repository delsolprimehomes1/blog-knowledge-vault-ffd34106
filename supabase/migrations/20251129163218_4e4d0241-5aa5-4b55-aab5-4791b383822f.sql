-- Add Finnish (fi) and Norwegian (no) to valid_language constraint
ALTER TABLE blog_articles DROP CONSTRAINT IF EXISTS valid_language;
ALTER TABLE blog_articles ADD CONSTRAINT valid_language 
  CHECK (language = ANY (ARRAY['en', 'es', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no']));