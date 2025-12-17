-- Add category column to faq_pages table
ALTER TABLE public.faq_pages ADD COLUMN category TEXT;

-- Backfill existing FAQs with category from source articles
UPDATE public.faq_pages fp 
SET category = ba.category 
FROM public.blog_articles ba 
WHERE fp.source_article_id = ba.id AND fp.category IS NULL;

-- Create index for category filtering
CREATE INDEX idx_faq_pages_category ON public.faq_pages(category);