-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name TEXT NOT NULL,
  internal_ref TEXT UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('apartment', 'villa')),
  location TEXT NOT NULL,
  beds_min INTEGER NOT NULL,
  beds_max INTEGER,
  baths INTEGER NOT NULL,
  size_sqm INTEGER NOT NULL,
  price_eur INTEGER NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  descriptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_category ON public.properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_order ON public.properties(display_order);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can manage properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can manage properties" ON public.properties;

-- Public can view active properties
CREATE POLICY "Public can view active properties"
  ON public.properties
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage properties (secure)
CREATE POLICY "Admins can manage properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();