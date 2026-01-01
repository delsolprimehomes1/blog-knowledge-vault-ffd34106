-- Drop and recreate the enforce_qa_cap function with correct limit
-- 4 Q&A types per language per cluster = max 4 records per (cluster_id, language) combo
CREATE OR REPLACE FUNCTION public.enforce_qa_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only enforce cap if cluster_id is set
  IF NEW.cluster_id IS NOT NULL THEN
    -- Count existing Q&As for this cluster + language combo (excluding current insert)
    SELECT COUNT(*) INTO current_count
    FROM qa_pages
    WHERE cluster_id = NEW.cluster_id
    AND language = NEW.language
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Allow max 4 Q&As per language per cluster (one per qa_type: core, decision, practical, problem)
    IF current_count >= 4 THEN
      RAISE EXCEPTION 'Q&A cap reached: cluster % already has % Q&As for language % (max 4 per language)', 
        NEW.cluster_id, current_count, NEW.language;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;