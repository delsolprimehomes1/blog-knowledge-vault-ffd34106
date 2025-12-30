-- Create error logging table for Q&A generation failures
CREATE TABLE public.qa_generation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.qa_generation_jobs(id) ON DELETE CASCADE,
  article_id UUID,
  language TEXT,
  qa_type TEXT,
  error_type TEXT, -- 'timeout', 'api_error', 'validation', 'duplicate'
  error_message TEXT,
  cluster_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qa_generation_errors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view errors" ON public.qa_generation_errors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can insert errors" ON public.qa_generation_errors
  FOR INSERT WITH CHECK (true);

-- Add index for quick lookups
CREATE INDEX idx_qa_generation_errors_job_id ON public.qa_generation_errors(job_id);
CREATE INDEX idx_qa_generation_errors_cluster_id ON public.qa_generation_errors(cluster_id);