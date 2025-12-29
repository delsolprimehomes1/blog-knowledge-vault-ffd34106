-- Create image_regeneration_queue table for batch image processing
CREATE TABLE IF NOT EXISTS public.image_regeneration_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  original_image_url TEXT,
  new_image_url TEXT,
  image_prompt TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_article_in_queue UNIQUE (article_id)
);

-- Enable RLS
ALTER TABLE public.image_regeneration_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view queue" ON public.image_regeneration_queue
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage queue" ON public.image_regeneration_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_image_queue_status ON public.image_regeneration_queue(status);
CREATE INDEX idx_image_queue_priority ON public.image_regeneration_queue(priority DESC, created_at ASC);

-- Create view for duplicate image detection
CREATE OR REPLACE VIEW duplicate_image_articles AS
WITH image_counts AS (
  SELECT 
    featured_image_url,
    COUNT(*) as usage_count,
    ARRAY_AGG(id) as article_ids,
    ARRAY_AGG(headline) as headlines,
    ARRAY_AGG(cluster_id) as cluster_ids
  FROM blog_articles
  WHERE featured_image_url IS NOT NULL 
    AND featured_image_url != ''
    AND status IN ('draft', 'published')
  GROUP BY featured_image_url
  HAVING COUNT(*) > 1
)
SELECT 
  featured_image_url,
  usage_count,
  article_ids,
  headlines,
  cluster_ids
FROM image_counts
ORDER BY usage_count DESC;