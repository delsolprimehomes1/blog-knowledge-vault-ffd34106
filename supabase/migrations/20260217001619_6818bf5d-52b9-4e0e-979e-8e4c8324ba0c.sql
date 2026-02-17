
-- Table: villas_page_content (mirrors apartments_page_content)
CREATE TABLE public.villas_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL,
  headline text NOT NULL,
  subheadline text,
  cta_text text DEFAULT 'View Villas',
  hero_image_url text,
  hero_image_alt text,
  video_enabled boolean DEFAULT false,
  video_url text,
  video_thumbnail_url text,
  reviews_enabled boolean DEFAULT false,
  elfsight_embed_code text,
  meta_title text,
  meta_description text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Table: villas_properties (mirrors apartments_properties)
CREATE TABLE public.villas_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL,
  title text NOT NULL,
  slug text,
  location text NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'EUR',
  bedrooms integer NOT NULL,
  bedrooms_max integer,
  bathrooms integer NOT NULL,
  sqm integer NOT NULL,
  property_type text DEFAULT 'villa',
  description text,
  short_description text,
  features jsonb,
  images jsonb,
  featured_image_url text,
  featured_image_alt text,
  gallery_images text[],
  display_order integer DEFAULT 0,
  visible boolean DEFAULT true,
  status text DEFAULT 'draft',
  featured boolean DEFAULT false,
  views integer DEFAULT 0,
  inquiries integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  partner_source text,
  partner_logo text,
  property_group_id uuid
);

-- RLS on villas_page_content
ALTER TABLE public.villas_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published villas content"
  ON public.villas_page_content FOR SELECT
  USING (is_published = true);

CREATE POLICY "Editors can manage villas content"
  ON public.villas_page_content FOR ALL
  USING (public.has_apartments_access(auth.uid()));

-- RLS on villas_properties
ALTER TABLE public.villas_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible villas"
  ON public.villas_properties FOR SELECT
  USING (visible = true);

CREATE POLICY "Editors can manage villas properties"
  ON public.villas_properties FOR ALL
  USING (public.has_apartments_access(auth.uid()));

-- Triggers
CREATE TRIGGER update_villas_page_content_updated_at
  BEFORE UPDATE ON public.villas_page_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_villas_properties_updated_at
  BEFORE UPDATE ON public.villas_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
