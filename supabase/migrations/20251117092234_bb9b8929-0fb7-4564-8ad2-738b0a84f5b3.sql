-- Fix security warning: Set search_path for increment_domain_usage function
CREATE OR REPLACE FUNCTION increment_domain_usage(
  p_domain TEXT,
  p_article_id UUID DEFAULT NULL
)
RETURNS TABLE(new_count INTEGER) AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  -- Atomic insert or update with row-level locking
  INSERT INTO domain_usage_stats (
    domain,
    total_uses,
    last_used_at,
    updated_at
  ) VALUES (
    p_domain,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (domain) DO UPDATE SET
    total_uses = domain_usage_stats.total_uses + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  RETURNING domain_usage_stats.total_uses INTO v_new_count;
  
  RETURN QUERY SELECT v_new_count;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';