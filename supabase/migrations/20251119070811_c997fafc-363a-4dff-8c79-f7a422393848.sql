-- Update the stuck job checker to use 10 minutes instead of 15
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
    error = 'Job timed out - no activity for 10+ minutes',
    updated_at = NOW()
  WHERE 
    status = 'generating'
    AND updated_at < NOW() - INTERVAL '10 minutes';
END;
$function$;