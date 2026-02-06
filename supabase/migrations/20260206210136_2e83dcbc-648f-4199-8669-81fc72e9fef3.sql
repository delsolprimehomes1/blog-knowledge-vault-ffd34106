-- Create link_audit_results table for storing comprehensive link audit data
CREATE TABLE public.link_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL,
  link_url TEXT NOT NULL,
  link_type TEXT NOT NULL, -- 'internal' | 'external' | 'navigation'
  source_type TEXT, -- 'blog' | 'qa' | 'comparison' | 'location' | 'footer' | 'header' | 'cta'
  source_id UUID,
  source_slug TEXT,
  http_status INTEGER,
  response_time_ms INTEGER,
  is_broken BOOLEAN DEFAULT false,
  error_message TEXT,
  redirect_url TEXT,
  checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_link_audit_results_audit_id ON public.link_audit_results(audit_id);
CREATE INDEX idx_link_audit_results_is_broken ON public.link_audit_results(is_broken);
CREATE INDEX idx_link_audit_results_link_type ON public.link_audit_results(link_type);
CREATE INDEX idx_link_audit_results_checked_at ON public.link_audit_results(checked_at DESC);

-- Create link_audits table to track audit runs
CREATE TABLE public.link_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_types TEXT[] NOT NULL DEFAULT ARRAY['internal', 'external', 'navigation'],
  content_types TEXT[] NOT NULL DEFAULT ARRAY['blog', 'qa', 'comparison', 'location'],
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  total_links INTEGER DEFAULT 0,
  healthy_links INTEGER DEFAULT 0,
  broken_links INTEGER DEFAULT 0,
  redirect_links INTEGER DEFAULT 0,
  timeout_links INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.link_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_audits ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin only)
CREATE POLICY "Authenticated users can read link_audit_results"
ON public.link_audit_results FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert link_audit_results"
ON public.link_audit_results FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete link_audit_results"
ON public.link_audit_results FOR DELETE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read link_audits"
ON public.link_audits FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert link_audits"
ON public.link_audits FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update link_audits"
ON public.link_audits FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete link_audits"
ON public.link_audits FOR DELETE
USING (auth.role() = 'authenticated');