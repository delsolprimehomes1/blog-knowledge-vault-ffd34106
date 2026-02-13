
-- Expand property_type constraint to include villa and townhouse
ALTER TABLE public.apartments_properties DROP CONSTRAINT apartments_properties_property_type_check;
ALTER TABLE public.apartments_properties ADD CONSTRAINT apartments_properties_property_type_check CHECK (property_type = ANY (ARRAY['apartment','penthouse','studio','villa','townhouse']));

-- Expand status constraint to include more statuses
ALTER TABLE public.apartments_properties DROP CONSTRAINT apartments_properties_status_check;
ALTER TABLE public.apartments_properties ADD CONSTRAINT apartments_properties_status_check CHECK (status = ANY (ARRAY['available','reserved','sold','coming_soon','for_sale','new_development']));
