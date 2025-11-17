-- Update function to return article status and search all articles
DROP FUNCTION IF EXISTS find_articles_with_citation(TEXT);

CREATE OR REPLACE FUNCTION find_articles_with_citation(citation_url TEXT, published_only BOOLEAN DEFAULT true)
RETURNS TABLE (
  id UUID,
  headline TEXT,
  detailed_content TEXT,
  language TEXT,
  status TEXT,
  external_citations JSONB
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.headline,
    ba.detailed_content,
    ba.language,
    ba.status,
    ba.external_citations
  FROM blog_articles ba
  WHERE ba.external_citations::text LIKE '%"url":"' || citation_url || '"%'
    AND (NOT published_only OR ba.status = 'published');
END;
$$ LANGUAGE plpgsql;