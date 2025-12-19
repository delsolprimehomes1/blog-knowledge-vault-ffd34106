-- Fix the auto_generate_faqs trigger to use qa_entities instead of faq_entities
CREATE OR REPLACE FUNCTION public.auto_generate_faqs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Only trigger for published articles without QAs
  IF NEW.status = 'published' AND 
     (NEW.qa_entities IS NULL OR jsonb_array_length(NEW.qa_entities) = 0) THEN
    
    -- Get environment variables
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings aren't configured, try hardcoded values as fallback
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'https://kazggnufaoicopvmwhdl.supabase.co';
    END IF;
    
    -- Make async HTTP call to edge function
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/backfill-article-faqs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
      ),
      body := jsonb_build_object(
        'articles', jsonb_build_array(
          jsonb_build_object(
            'id', NEW.id,
            'headline', NEW.headline,
            'detailed_content', NEW.detailed_content,
            'meta_description', NEW.meta_description,
            'language', NEW.language,
            'funnel_stage', NEW.funnel_stage
          )
        ),
        'single_article_mode', true
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;