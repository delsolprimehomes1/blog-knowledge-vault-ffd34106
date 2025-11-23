-- Create internal_link_suggestions table for tracking AI-generated link suggestions
CREATE TABLE IF NOT EXISTS public.internal_link_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  suggested_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  confidence_score INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_link_suggestions_article ON public.internal_link_suggestions(article_id);
CREATE INDEX IF NOT EXISTS idx_link_suggestions_status ON public.internal_link_suggestions(status);

-- Enable RLS
ALTER TABLE public.internal_link_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view link suggestions"
  ON public.internal_link_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert link suggestions"
  ON public.internal_link_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update link suggestions"
  ON public.internal_link_suggestions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete link suggestions"
  ON public.internal_link_suggestions FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_link_suggestions_updated_at
  BEFORE UPDATE ON public.internal_link_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();