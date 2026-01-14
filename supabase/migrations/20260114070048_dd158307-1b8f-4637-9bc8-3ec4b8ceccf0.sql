CREATE OR REPLACE FUNCTION public.get_cluster_image_health()
 RETURNS TABLE(cluster_id uuid, unique_images bigint, total_images bigint, health_percent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ba.cluster_id,
    -- Count unique images among English articles only (1 per funnel position)
    COUNT(DISTINCT CASE WHEN ba.language = 'en' THEN ba.featured_image_url END) as unique_images,
    -- Expected 6 funnel positions
    CAST(6 AS bigint) as total_images,
    CASE 
      WHEN COUNT(CASE WHEN ba.language = 'en' THEN 1 END) = 0 THEN 100
      ELSE ROUND(
        (COUNT(DISTINCT CASE WHEN ba.language = 'en' THEN ba.featured_image_url END)::numeric / 6::numeric) * 100
      )::integer
    END as health_percent
  FROM blog_articles ba
  WHERE ba.cluster_id IS NOT NULL
    AND ba.status = 'published'
  GROUP BY ba.cluster_id;
END;
$function$;