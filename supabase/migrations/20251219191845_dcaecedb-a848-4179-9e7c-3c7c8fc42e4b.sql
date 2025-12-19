-- Function to ping sitemaps via edge function
CREATE OR REPLACE FUNCTION public.notify_sitemap_ping()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  -- Only proceed if status is being set to 'published'
  -- For INSERT: check if new status is published
  -- For UPDATE: check if status changed to published
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'published' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'published' OR OLD.status = 'published' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get the slug
  v_slug := NEW.slug;

  -- Make async HTTP call to ping-sitemaps edge function
  PERFORM net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/ping-sitemaps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'slug', v_slug,
      'action', TG_OP
    )
  );
  
  RAISE NOTICE 'Sitemap ping triggered for % - %', TG_TABLE_NAME, v_slug;
  
  RETURN NEW;
END;
$$;

-- Trigger for blog_articles when published
DROP TRIGGER IF EXISTS on_article_published_ping_sitemap ON public.blog_articles;

CREATE TRIGGER on_article_published_ping_sitemap
AFTER INSERT OR UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_sitemap_ping();

-- Trigger for qa_pages when published
DROP TRIGGER IF EXISTS on_qa_published_ping_sitemap ON public.qa_pages;

CREATE TRIGGER on_qa_published_ping_sitemap
AFTER INSERT OR UPDATE ON public.qa_pages
FOR EACH ROW
EXECUTE FUNCTION public.notify_sitemap_ping();

-- Add comment for documentation
COMMENT ON FUNCTION public.notify_sitemap_ping() IS 'Triggers sitemap ping to Bing and IndexNow when content is published';