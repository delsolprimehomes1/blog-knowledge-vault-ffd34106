-- Make lead_id nullable in crm_activities to allow logging calls even when no lead is matched
ALTER TABLE public.crm_activities 
ALTER COLUMN lead_id DROP NOT NULL;