-- Create function to check and mark stuck QA jobs as failed
CREATE OR REPLACE FUNCTION public.check_stuck_qa_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.qa_generation_jobs
  SET 
    status = 'failed',
    error = 'Job timed out - no activity for 30+ minutes',
    completed_at = NOW()
  WHERE 
    status = 'running'
    AND created_at < NOW() - INTERVAL '30 minutes'
    AND (completed_at IS NULL);
END;
$$;