-- Update get_citation_health_stats to include all status types
CREATE OR REPLACE FUNCTION public.get_citation_health_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'healthy', COUNT(*) FILTER (WHERE status = 'healthy'),
    'broken', COUNT(*) FILTER (WHERE status = 'broken'),
    'unreachable', COUNT(*) FILTER (WHERE status = 'unreachable'),
    'redirected', COUNT(*) FILTER (WHERE status = 'redirected'),
    'slow', COUNT(*) FILTER (WHERE status = 'slow'),
    'unchecked', COUNT(*) FILTER (WHERE status IS NULL OR status = '')
  )
  FROM external_citation_health;
$$;