-- Create location_pages table for AI-citation-ready location intelligence content
CREATE TABLE public.location_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Location identifiers
  city_slug TEXT NOT NULL,
  topic_slug TEXT NOT NULL UNIQUE,
  city_name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Andalusia',
  country TEXT NOT NULL DEFAULT 'Spain',
  
  -- Page intent and metadata
  intent_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  
  -- Core content sections (AI-ready)
  speakable_answer TEXT NOT NULL,
  location_overview TEXT,
  market_breakdown TEXT,
  best_areas JSONB DEFAULT '[]'::jsonb,
  cost_breakdown JSONB DEFAULT '[]'::jsonb,
  use_cases TEXT,
  final_summary TEXT,
  
  -- FAQs for FAQ schema
  qa_entities JSONB DEFAULT '[]'::jsonb,
  
  -- Media
  featured_image_url TEXT,
  featured_image_alt TEXT,
  
  -- Links and citations
  internal_links JSONB DEFAULT '[]'::jsonb,
  external_citations JSONB DEFAULT '[]'::jsonb,
  
  -- EEAT signals
  author_id UUID REFERENCES public.authors(id),
  reviewer_id UUID REFERENCES public.authors(id),
  
  -- Publishing
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  date_published TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Composite constraint for unique city+topic combination per language
  CONSTRAINT unique_location_topic_lang UNIQUE (city_slug, intent_type, language)
);

-- Create indexes for common queries
CREATE INDEX idx_location_pages_city_slug ON public.location_pages(city_slug);
CREATE INDEX idx_location_pages_status ON public.location_pages(status);
CREATE INDEX idx_location_pages_language ON public.location_pages(language);
CREATE INDEX idx_location_pages_intent_type ON public.location_pages(intent_type);

-- Enable Row Level Security
ALTER TABLE public.location_pages ENABLE ROW LEVEL SECURITY;

-- Public can view published location pages
CREATE POLICY "Public can view published location pages"
ON public.location_pages
FOR SELECT
USING (status = 'published');

-- Authenticated users can manage all location pages
CREATE POLICY "Authenticated users can manage location pages"
ON public.location_pages
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_location_pages_updated_at
BEFORE UPDATE ON public.location_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();