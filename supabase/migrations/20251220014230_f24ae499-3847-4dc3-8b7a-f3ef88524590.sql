-- Create comparison_pages table for AI-citation optimized comparisons
CREATE TABLE public.comparison_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core comparison data
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  comparison_topic TEXT NOT NULL,
  niche TEXT DEFAULT 'real-estate',
  target_audience TEXT,
  
  -- SEO/AEO fields
  slug TEXT UNIQUE NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  headline TEXT NOT NULL,
  speakable_answer TEXT NOT NULL,
  canonical_url TEXT,
  
  -- Content sections
  quick_comparison_table JSONB DEFAULT '[]'::jsonb,
  option_a_overview TEXT,
  option_b_overview TEXT,
  side_by_side_breakdown TEXT,
  use_case_scenarios TEXT,
  final_verdict TEXT,
  
  -- Structured data
  qa_entities JSONB DEFAULT '[]'::jsonb,
  external_citations JSONB DEFAULT '[]'::jsonb,
  internal_links JSONB DEFAULT '[]'::jsonb,
  
  -- Media
  featured_image_url TEXT,
  featured_image_alt TEXT,
  featured_image_caption TEXT,
  
  -- E-E-A-T
  author_id UUID REFERENCES public.authors(id),
  reviewer_id UUID REFERENCES public.authors(id),
  
  -- Metadata
  category TEXT DEFAULT 'Comparisons',
  language TEXT DEFAULT 'en',
  status TEXT DEFAULT 'draft',
  date_published TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comparison_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view published comparisons"
ON public.comparison_pages
FOR SELECT
USING (status = 'published');

CREATE POLICY "Authenticated users can manage comparisons"
ON public.comparison_pages
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_comparison_pages_updated_at
BEFORE UPDATE ON public.comparison_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for slug lookups
CREATE INDEX idx_comparison_pages_slug ON public.comparison_pages(slug);
CREATE INDEX idx_comparison_pages_status ON public.comparison_pages(status);
CREATE INDEX idx_comparison_pages_language ON public.comparison_pages(language);