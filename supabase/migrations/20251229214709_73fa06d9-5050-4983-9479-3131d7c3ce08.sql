-- Drop the trigger that blocks Q&A translations
-- This trigger incorrectly prevents inserting translated Q&As that reference English source articles
DROP TRIGGER IF EXISTS validate_qa_language ON qa_pages;