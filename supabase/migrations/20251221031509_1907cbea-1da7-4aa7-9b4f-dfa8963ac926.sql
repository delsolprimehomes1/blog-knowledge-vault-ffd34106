-- Create about_page_content table for AI-optimized content management
CREATE TABLE public.about_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE DEFAULT 'main',
  
  -- SEO Meta
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  canonical_url TEXT DEFAULT 'https://www.delsolprimehomes.com/about',
  
  -- Speakable / AEO - Voice assistant optimized summary
  speakable_summary TEXT NOT NULL,
  
  -- Main Content (Markdown-ready)
  hero_headline TEXT NOT NULL,
  hero_subheadline TEXT NOT NULL,
  mission_statement TEXT NOT NULL,
  our_story_content TEXT NOT NULL,
  why_choose_us_content TEXT NOT NULL,
  
  -- E-E-A-T Data - Trust signals
  years_in_business INTEGER DEFAULT 15,
  properties_sold INTEGER DEFAULT 500,
  client_satisfaction_percent INTEGER DEFAULT 98,
  
  -- FAQ for Schema (AEO)
  faq_entities JSONB DEFAULT '[]'::jsonb,
  
  -- External Citations (GEO)
  citations JSONB DEFAULT '[]'::jsonb,
  
  -- Founder team data (E-E-A-T People)
  founders JSONB DEFAULT '[]'::jsonb,
  
  -- Trust badges and credentials
  credentials JSONB DEFAULT '[]'::jsonb,
  
  -- Language for hreflang
  language TEXT DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.about_page_content ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view about content"
ON public.about_page_content
FOR SELECT
USING (true);

-- Authenticated users can manage content
CREATE POLICY "Authenticated users can manage about content"
ON public.about_page_content
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default content
INSERT INTO public.about_page_content (
  slug,
  meta_title,
  meta_description,
  speakable_summary,
  hero_headline,
  hero_subheadline,
  mission_statement,
  our_story_content,
  why_choose_us_content,
  years_in_business,
  properties_sold,
  client_satisfaction_percent,
  faq_entities,
  citations,
  founders,
  credentials
) VALUES (
  'main',
  'About Del Sol Prime Homes | Expert Real Estate Agents Costa del Sol',
  'Meet the founders of Del Sol Prime Homes. 15+ years experience helping international buyers find their perfect property in Marbella, Estepona, and the Costa del Sol.',
  'Del Sol Prime Homes is a premier real estate agency on the Costa del Sol, founded by Hans Beeckman, Cédric Van Hecke, and Steven Roberts. With over 15 years of combined experience, we have helped more than 500 clients find their dream properties in Marbella, Estepona, Benalmádena, and surrounding areas. We specialize in guiding international buyers through every step of the Spanish property purchase process.',
  'Your Trusted Partners in Costa del Sol Real Estate',
  'Three founders, 15+ years of expertise, and one mission: making your Spanish property dreams a reality.',
  'We believe everyone deserves expert guidance when making one of life''s biggest investments. Our mission is to provide transparent, personalized real estate services that put your interests first, from initial search to handing you the keys.',
  '## Our Journey

Del Sol Prime Homes was born from a shared passion for the Costa del Sol and a desire to transform the property buying experience for international clients.

### The Beginning

Our founders—Hans, Cédric, and Steven—each came to Spain following their own dreams. Hans relocated from Belgium in 2008, Cédric followed in 2010, and Steven made the move from the UK in 2012. What brought them together was a common frustration: the complexity and opacity of the Spanish real estate market for foreign buyers.

### Building Something Better

After years of helping friends and colleagues navigate property purchases informally, they decided to create a service that addressed the real pain points international buyers face:

- Language barriers and legal complexities
- Understanding true market values
- Navigating Spanish bureaucracy
- Finding trustworthy local contacts

### Today

What started as a small consultancy has grown into a full-service real estate agency, serving clients from across Europe and beyond. We remain committed to our founding principle: treat every client like family.',
  '## Why Clients Choose Us

### Local Expertise, Global Perspective

We live where you want to buy. Our founders have collectively spent 40+ years on the Costa del Sol, giving us intimate knowledge of every neighborhood, from the glamour of Marbella''s Golden Mile to the authentic charm of Estepona''s old town.

### End-to-End Service

We don''t just find properties—we guide you through the entire journey:
- Property search and viewings
- Price negotiation
- Legal assistance and NIE applications
- Mortgage arrangements
- After-sales support

### Transparent & Honest

No hidden fees. No pressure tactics. Just straightforward advice and genuine recommendations based on your needs, not our commission.',
  15,
  500,
  98,
  '[
    {
      "question": "Who are the founders of Del Sol Prime Homes?",
      "answer": "Del Sol Prime Homes was founded by Hans Beeckman, Cédric Van Hecke, and Steven Roberts—three experienced real estate professionals who relocated to the Costa del Sol and combined their expertise to help international buyers find their perfect Spanish properties."
    },
    {
      "question": "How long has Del Sol Prime Homes been in business?",
      "answer": "Our founding team has over 15 years of combined experience in the Costa del Sol real estate market, having helped more than 500 clients purchase properties in the region."
    },
    {
      "question": "What areas does Del Sol Prime Homes cover?",
      "answer": "We specialize in properties across the Costa del Sol, including Marbella, Estepona, Benalmádena, Fuengirola, Mijas, Torremolinos, Manilva, Casares, and Sotogrande."
    },
    {
      "question": "What services does Del Sol Prime Homes offer?",
      "answer": "We provide comprehensive real estate services including property search and viewings, price negotiation, legal assistance, NIE applications, mortgage arrangements, and after-sales support. We guide international buyers through every step of purchasing property in Spain."
    },
    {
      "question": "Is Del Sol Prime Homes licensed in Spain?",
      "answer": "Yes, Del Sol Prime Homes is a fully licensed real estate agency registered with the API (Agentes de la Propiedad Inmobiliaria) and compliant with all Spanish real estate regulations."
    }
  ]'::jsonb,
  '[
    {
      "source": "Ministerio de Transportes y Movilidad Sostenible",
      "url": "https://www.mitma.gob.es/",
      "text": "Spanish government ministry overseeing real estate regulations"
    },
    {
      "source": "Consejo General de Colegios de Agentes de la Propiedad Inmobiliaria",
      "url": "https://www.consejocoapis.org/",
      "text": "Official Spanish real estate agents professional council"
    },
    {
      "source": "Junta de Andalucía - Vivienda",
      "url": "https://www.juntadeandalucia.es/organismos/fomentoarticulaciondelterritorioyvivienda.html",
      "text": "Andalusian regional government housing authority"
    }
  ]'::jsonb,
  '[
    {
      "name": "Hans Beeckman",
      "role": "Co-Founder & Managing Director",
      "bio": "Originally from Belgium, Hans relocated to the Costa del Sol in 2008. With a background in international business and a passion for real estate, he oversees strategic partnerships and client relations. Hans is fluent in Dutch, French, English, and Spanish.",
      "photo_url": "/assets/team/hans.jpg",
      "linkedin_url": "https://www.linkedin.com/in/hansbeeckman",
      "credentials": ["API Licensed Agent", "RICS Associate Member", "Certified Property Valuer"],
      "years_experience": 16,
      "languages": ["Dutch", "French", "English", "Spanish"],
      "specialization": "Luxury properties and investment portfolios"
    },
    {
      "name": "Cédric Van Hecke",
      "role": "Co-Founder & Sales Director",
      "bio": "Cédric moved from Belgium to Spain in 2010, drawn by the lifestyle and business opportunities. His background in marketing and sales, combined with deep knowledge of the local market, makes him an invaluable guide for buyers seeking their perfect home.",
      "photo_url": "/assets/team/cedric.jpg",
      "linkedin_url": "https://www.linkedin.com/in/cedricvanhecke",
      "credentials": ["API Licensed Agent", "Certified Negotiation Expert", "Digital Marketing Specialist"],
      "years_experience": 14,
      "languages": ["Dutch", "French", "English", "Spanish"],
      "specialization": "New developments and off-plan properties"
    },
    {
      "name": "Steven Roberts",
      "role": "Co-Founder & Operations Director",
      "bio": "Steven relocated from the UK to Marbella in 2012. His expertise in property law and operations ensures that every transaction proceeds smoothly. He specializes in helping British and Irish buyers navigate the Spanish property market.",
      "photo_url": "/assets/team/steven.jpg",
      "linkedin_url": "https://www.linkedin.com/in/stevenroberts",
      "credentials": ["API Licensed Agent", "UK Property Ombudsman Member", "AML Compliance Certified"],
      "years_experience": 12,
      "languages": ["English", "Spanish"],
      "specialization": "British buyers and legal compliance"
    }
  ]'::jsonb,
  '[
    {
      "name": "API Licensed",
      "description": "Registered with Agentes de la Propiedad Inmobiliaria",
      "icon": "shield-check"
    },
    {
      "name": "RICS Affiliated",
      "description": "Royal Institution of Chartered Surveyors standards",
      "icon": "award"
    },
    {
      "name": "AML Compliant",
      "description": "Full Anti-Money Laundering compliance",
      "icon": "file-check"
    },
    {
      "name": "GDPR Certified",
      "description": "EU data protection standards",
      "icon": "lock"
    }
  ]'::jsonb
);

-- Create trigger for updated_at
CREATE TRIGGER update_about_page_content_updated_at
BEFORE UPDATE ON public.about_page_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();