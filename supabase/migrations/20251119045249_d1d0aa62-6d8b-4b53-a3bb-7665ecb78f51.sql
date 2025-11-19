-- Fix RPC function return type to match actual view columns
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
STABLE
SECURITY INVOKER
AS $$
  SELECT 
    domain,
    category,
    language,
    region,
    tier,
    trust_score,
    total_uses,
    usage_status,
    diversity_score
  FROM domain_diversity_report 
  LIMIT 200;
$$;