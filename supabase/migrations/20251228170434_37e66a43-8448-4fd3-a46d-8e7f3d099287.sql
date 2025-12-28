-- Add completion tracking columns to cluster_generations table
ALTER TABLE public.cluster_generations 
ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS english_articles_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS translated_articles_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of incomplete clusters
CREATE INDEX IF NOT EXISTS idx_cluster_generations_completion_status 
ON public.cluster_generations(completion_status);

-- Add comment for documentation
COMMENT ON COLUMN public.cluster_generations.completion_status IS 'Status of cluster completion: pending, in_progress, translating, completed, failed';
COMMENT ON COLUMN public.cluster_generations.english_articles_count IS 'Number of English articles in this cluster';
COMMENT ON COLUMN public.cluster_generations.translated_articles_count IS 'Number of translated articles across all languages';