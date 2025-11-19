-- Create RPC function to query the diversity view
CREATE OR REPLACE FUNCTION get_diversity_report()
RETURNS TABLE (
  domain TEXT,
  category TEXT,
  language TEXT,
  region TEXT,
  tier TEXT,
  trust_score INTEGER,
  total_uses BIGINT,
  usage_status TEXT,
  diversity_score INTEGER
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM domain_diversity_report LIMIT 100;
$$;