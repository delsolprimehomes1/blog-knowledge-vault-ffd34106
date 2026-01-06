-- 1. Add author_photo_context column
ALTER TABLE public.blog_articles 
ADD COLUMN IF NOT EXISTS author_photo_context VARCHAR(10) 
CHECK (author_photo_context IN ('blog', 'qa')) 
DEFAULT 'blog';

-- 2. Create function to protect date_published from changes
CREATE OR REPLACE FUNCTION public.protect_date_published()
RETURNS TRIGGER AS $$
BEGIN
  -- If date_published was already set and is being changed, prevent it
  IF OLD.date_published IS NOT NULL 
     AND NEW.date_published IS DISTINCT FROM OLD.date_published THEN
    RAISE EXCEPTION 'date_published cannot be changed once set. Use date_modified for content updates.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Create trigger using the protection function
DROP TRIGGER IF EXISTS protect_date_published_trigger ON public.blog_articles;
CREATE TRIGGER protect_date_published_trigger
  BEFORE UPDATE ON public.blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_date_published();

-- 4. Set default author_id for new articles
ALTER TABLE public.blog_articles 
ALTER COLUMN author_id SET DEFAULT '738c1e24-025b-4f15-ac7c-541bb8a5dade'::uuid;

-- 5. Update existing articles without author_id
UPDATE public.blog_articles 
SET author_id = '738c1e24-025b-4f15-ac7c-541bb8a5dade'
WHERE author_id IS NULL;