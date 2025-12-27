-- Add generated_qa_page_ids field to blog_articles for bidirectional linking
ALTER TABLE public.blog_articles 
ADD COLUMN IF NOT EXISTS generated_qa_page_ids UUID[] DEFAULT '{}';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_blog_articles_qa_page_ids 
ON public.blog_articles USING GIN (generated_qa_page_ids);

-- Backfill existing data from qa_pages
UPDATE public.blog_articles ba
SET generated_qa_page_ids = (
  SELECT COALESCE(array_agg(qp.id ORDER BY qp.qa_type, qp.language), '{}')
  FROM public.qa_pages qp
  WHERE qp.source_article_id = ba.id
)
WHERE EXISTS (
  SELECT 1 FROM public.qa_pages WHERE source_article_id = ba.id
);