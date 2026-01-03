-- Update notify_sitemap_ping function to call ping-indexnow instead of ping-sitemaps
CREATE OR REPLACE FUNCTION public.notify_sitemap_ping()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Make async HTTP call to ping-indexnow edge function (changed from ping-sitemaps)
  PERFORM net.http_post(
    url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/ping-indexnow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'slug', v_slug,
      'action', TG_OP
    )
  );
  
  RAISE NOTICE 'IndexNow ping triggered for % - %', TG_TABLE_NAME, v_slug;
  
  RETURN NEW;
END;
$function$;

-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS on_article_published_ping_sitemap ON blog_articles;
DROP TRIGGER IF EXISTS on_qa_published_ping_sitemap ON qa_pages;
DROP TRIGGER IF EXISTS on_location_published_ping_sitemap ON location_pages;
DROP TRIGGER IF EXISTS on_comparison_published_ping_sitemap ON comparison_pages;

-- Create triggers on all content tables
CREATE TRIGGER on_article_published_ping_indexnow
  AFTER INSERT OR UPDATE ON blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION notify_sitemap_ping();

CREATE TRIGGER on_qa_published_ping_indexnow
  AFTER INSERT OR UPDATE ON qa_pages
  FOR EACH ROW
  EXECUTE FUNCTION notify_sitemap_ping();

CREATE TRIGGER on_location_published_ping_indexnow
  AFTER INSERT OR UPDATE ON location_pages
  FOR EACH ROW
  EXECUTE FUNCTION notify_sitemap_ping();

CREATE TRIGGER on_comparison_published_ping_indexnow
  AFTER INSERT OR UPDATE ON comparison_pages
  FOR EACH ROW
  EXECUTE FUNCTION notify_sitemap_ping();