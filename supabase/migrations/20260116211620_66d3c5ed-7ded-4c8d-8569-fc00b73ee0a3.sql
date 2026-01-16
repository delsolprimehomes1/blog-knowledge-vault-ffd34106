-- Create generation_jobs table for tracking async generation jobs
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'location',
  status TEXT NOT NULL DEFAULT 'pending',
  city TEXT,
  region TEXT,
  country TEXT,
  intent_type TEXT,
  languages TEXT[] DEFAULT '{}',
  completed_languages TEXT[] DEFAULT '{}',
  hreflang_group_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage generation jobs
CREATE POLICY "Authenticated users can manage generation jobs" ON generation_jobs
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_generation_jobs_updated_at
  BEFORE UPDATE ON generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();