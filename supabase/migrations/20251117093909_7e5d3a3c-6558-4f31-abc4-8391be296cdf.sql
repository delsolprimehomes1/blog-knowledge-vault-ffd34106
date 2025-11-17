-- Create function to find articles containing a specific citation URL
CREATE OR REPLACE FUNCTION find_articles_with_citation(citation_url TEXT)
RETURNS TABLE (
  id UUID,
  headline TEXT,
  detailed_content TEXT,
  language TEXT,
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
    ba.external_citations
  FROM blog_articles ba
  WHERE ba.status = 'published'
    AND ba.external_citations::text LIKE '%"url":"' || citation_url || '"%';
END;
$$ LANGUAGE plpgsql;