-- Create table to track broken link scans
CREATE TABLE public.broken_link_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scan_completed_at TIMESTAMP WITH TIME ZONE,
  total_links_checked INTEGER DEFAULT 0,
  broken_links_found INTEGER DEFAULT 0,
  fixed_links INTEGER DEFAULT 0,
  content_types_scanned TEXT[] DEFAULT '{}',
  scan_type TEXT DEFAULT 'structured',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table to track individual broken links
CREATE TABLE public.broken_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.broken_link_scans(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_slug TEXT NOT NULL,
  source_language TEXT NOT NULL,
  broken_url TEXT NOT NULL,
  link_text TEXT,
  link_location TEXT DEFAULT 'internal_links',
  link_index INTEGER,
  target_status TEXT DEFAULT 'not_found',
  fixed BOOLEAN DEFAULT FALSE,
  fixed_at TIMESTAMP WITH TIME ZONE,
  fix_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_id, broken_url, link_location)
);

-- Enable RLS
ALTER TABLE public.broken_link_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broken_links ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for broken_link_scans
CREATE POLICY "Admins can view broken_link_scans"
  ON public.broken_link_scans FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert broken_link_scans"
  ON public.broken_link_scans FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update broken_link_scans"
  ON public.broken_link_scans FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete broken_link_scans"
  ON public.broken_link_scans FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admin-only policies for broken_links
CREATE POLICY "Admins can view broken_links"
  ON public.broken_links FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert broken_links"
  ON public.broken_links FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update broken_links"
  ON public.broken_links FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete broken_links"
  ON public.broken_links FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_broken_links_scan_id ON public.broken_links(scan_id);
CREATE INDEX idx_broken_links_source ON public.broken_links(source_table, source_id);
CREATE INDEX idx_broken_links_url ON public.broken_links(broken_url);
CREATE INDEX idx_broken_links_fixed ON public.broken_links(fixed);
CREATE INDEX idx_broken_link_scans_created ON public.broken_link_scans(created_at DESC);