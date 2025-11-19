-- Update check_stuck_cluster_jobs to allow 20 minutes instead of 10
CREATE OR REPLACE FUNCTION public.check_stuck_cluster_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.cluster_generations
  SET 
    status = 'failed',
    error = 'Job timed out - no activity for 20+ minutes',
    updated_at = NOW()
  WHERE 
    status = 'generating'
    AND updated_at < NOW() - INTERVAL '20 minutes';
END;
$function$;