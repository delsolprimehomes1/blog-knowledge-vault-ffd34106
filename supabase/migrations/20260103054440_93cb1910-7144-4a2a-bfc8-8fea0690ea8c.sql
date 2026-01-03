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
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'published' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'published' OR OLD.status = 'published' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get the slug based on table type (location_pages uses topic_slug, others use slug)
  IF TG_TABLE_NAME = 'location_pages' THEN
    v_slug := NEW.topic_slug;
  ELSE
    v_slug := NEW.slug;
  END IF;

  -- Make async HTTP call to ping-indexnow edge function
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