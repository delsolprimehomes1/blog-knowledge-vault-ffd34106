-- Create qa_article_tracking table to track which blog articles have been used for Q&A generation
CREATE TABLE IF NOT EXISTS qa_article_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source article reference
  source_article_id UUID NOT NULL,
  source_article_headline TEXT NOT NULL,
  source_article_slug TEXT NOT NULL,
  
  -- Generation info - shared hreflang groups for all language versions
  hreflang_group_core UUID NOT NULL,
  hreflang_group_decision UUID NOT NULL,
  
  -- Languages generated
  languages_generated TEXT[] NOT NULL DEFAULT '{}',
  total_qa_pages INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one tracking record per source article
  CONSTRAINT unique_source_article UNIQUE(source_article_id)
);

-- Index for fast lookups
CREATE INDEX idx_qa_article_tracking_source ON qa_article_tracking(source_article_id);
CREATE INDEX idx_qa_article_tracking_status ON qa_article_tracking(status);

-- Enable RLS
ALTER TABLE qa_article_tracking ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Public can read qa_article_tracking"
  ON qa_article_tracking FOR SELECT
  USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can manage qa_article_tracking"
  ON qa_article_tracking FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage qa_article_tracking"
  ON qa_article_tracking FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add tracking_id column to qa_pages if not exists
ALTER TABLE qa_pages ADD COLUMN IF NOT EXISTS tracking_id UUID REFERENCES qa_article_tracking(id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_qa_article_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qa_article_tracking_updated_at
  BEFORE UPDATE ON qa_article_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_article_tracking_timestamp();