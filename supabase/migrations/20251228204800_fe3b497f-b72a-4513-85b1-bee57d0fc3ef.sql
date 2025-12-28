-- Create cluster translation queue table for batch processing
CREATE TABLE public.cluster_translation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL,
  english_article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  target_language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

-- Create indexes for efficient queue processing
CREATE INDEX idx_queue_status_priority ON public.cluster_translation_queue(status, priority DESC, created_at ASC);
CREATE INDEX idx_queue_cluster ON public.cluster_translation_queue(cluster_id);
CREATE INDEX idx_queue_article ON public.cluster_translation_queue(english_article_id);

-- Create cluster completion progress tracking table
CREATE TABLE public.cluster_completion_progress (
  cluster_id UUID PRIMARY KEY,
  cluster_theme TEXT,
  total_articles_needed INTEGER DEFAULT 60,
  articles_completed INTEGER DEFAULT 0,
  english_articles INTEGER DEFAULT 0,
  translations_completed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started',
  priority_score INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'tier_3',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_count INTEGER DEFAULT 0,
  CONSTRAINT valid_progress_status CHECK (status IN ('not_started', 'queued', 'in_progress', 'completed', 'failed', 'paused'))
);

-- Create index for progress queries
CREATE INDEX idx_progress_status ON public.cluster_completion_progress(status, priority_score DESC);
CREATE INDEX idx_progress_tier ON public.cluster_completion_progress(tier, status);

-- Enable RLS
ALTER TABLE public.cluster_translation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_completion_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for queue table
CREATE POLICY "Admins can view queue" ON public.cluster_translation_queue
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage queue" ON public.cluster_translation_queue
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for progress table
CREATE POLICY "Admins can view progress" ON public.cluster_completion_progress
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage progress" ON public.cluster_completion_progress
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update progress when queue item completes
CREATE OR REPLACE FUNCTION public.update_cluster_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.cluster_completion_progress
    SET 
      translations_completed = translations_completed + 1,
      articles_completed = articles_completed + 1,
      last_updated = NOW(),
      status = CASE 
        WHEN articles_completed + 1 >= total_articles_needed THEN 'completed'
        ELSE 'in_progress'
      END,
      completed_at = CASE 
        WHEN articles_completed + 1 >= total_articles_needed THEN NOW()
        ELSE completed_at
      END
    WHERE cluster_id = NEW.cluster_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update progress on queue completion
CREATE TRIGGER on_queue_item_completed
  AFTER UPDATE ON public.cluster_translation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cluster_progress();