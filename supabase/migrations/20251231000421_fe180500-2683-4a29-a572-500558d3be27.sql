-- Create function to enforce 24 Q&A cap per cluster/language
CREATE OR REPLACE FUNCTION public.enforce_qa_cap()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF NEW.cluster_id IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM qa_pages
    WHERE cluster_id = NEW.cluster_id
    AND language = NEW.language;
    
    IF current_count >= 24 THEN
      RAISE EXCEPTION 'Q&A cap reached: cluster % already has % Q&As for language %', 
        NEW.cluster_id, current_count, NEW.language;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce cap on insert
CREATE TRIGGER qa_cap_trigger
BEFORE INSERT ON qa_pages
FOR EACH ROW EXECUTE FUNCTION public.enforce_qa_cap();