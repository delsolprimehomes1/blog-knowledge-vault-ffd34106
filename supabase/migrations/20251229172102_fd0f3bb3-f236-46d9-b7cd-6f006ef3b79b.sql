-- Create a trigger function to validate Q&A language matches source article language
CREATE OR REPLACE FUNCTION validate_qa_language_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if source_article_id is provided
  IF NEW.source_article_id IS NOT NULL THEN
    -- Check if Q&A language matches source article language
    IF NOT EXISTS (
      SELECT 1 FROM blog_articles 
      WHERE id = NEW.source_article_id 
      AND language = NEW.language
    ) THEN
      RAISE EXCEPTION 'Q&A language (%) must match source article language for article %', NEW.language, NEW.source_article_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create the trigger
DROP TRIGGER IF EXISTS check_qa_language_match ON qa_pages;
CREATE TRIGGER check_qa_language_match
BEFORE INSERT OR UPDATE ON qa_pages
FOR EACH ROW
EXECUTE FUNCTION validate_qa_language_match();