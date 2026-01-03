-- Phase 1: Add canonical_url and translations columns to location_pages
-- These are required for complete SEO parity with other content types

-- Add canonical_url column for explicit canonical URL storage
ALTER TABLE public.location_pages 
ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Add translations JSONB column for hreflang sibling linking
ALTER TABLE public.location_pages 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Backfill canonical URLs for all published location pages
-- Pattern: https://www.delsolprimehomes.com/{language}/locations/{city_slug}/{topic_slug}
UPDATE public.location_pages 
SET canonical_url = 'https://www.delsolprimehomes.com/' || language || '/locations/' || city_slug || '/' || topic_slug
WHERE status = 'published' 
AND canonical_url IS NULL;

-- Create index on hreflang_group_id for efficient sibling lookups
CREATE INDEX IF NOT EXISTS idx_location_pages_hreflang_group 
ON public.location_pages(hreflang_group_id) 
WHERE hreflang_group_id IS NOT NULL;

-- Create index on translations for JSONB queries
CREATE INDEX IF NOT EXISTS idx_location_pages_translations 
ON public.location_pages USING GIN(translations);

COMMENT ON COLUMN public.location_pages.canonical_url IS 'Self-referencing canonical URL for SEO';
COMMENT ON COLUMN public.location_pages.translations IS 'JSONB map of language code to slug for hreflang siblings';