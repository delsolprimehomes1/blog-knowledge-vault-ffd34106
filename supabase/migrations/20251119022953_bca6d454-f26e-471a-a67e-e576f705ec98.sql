-- Phase 1: Add competitor blacklist to approved_domains (using trust_score of 1 to satisfy constraints)
INSERT INTO approved_domains (domain, category, is_allowed, tier, trust_score, notes)
VALUES 
  ('kyero.com', 'Real Estate Competitor', false, NULL, 1, 'Property listing competitor - Costa del Sol real estate'),
  ('idealista.com', 'Real Estate Competitor', false, NULL, 1, 'Property marketplace competitor'),
  ('rightmove.co.uk', 'Real Estate Competitor', false, NULL, 1, 'UK property listings'),
  ('zoopla.co.uk', 'Real Estate Competitor', false, NULL, 1, 'UK property listings'),
  ('thinkspain.com', 'Real Estate Competitor', false, NULL, 1, 'Property marketplace - Spain properties'),
  ('spanishpropertyinsight.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish property sales competitor'),
  ('costa-del-sol-properties.com', 'Real Estate Competitor', false, NULL, 1, 'Direct competitor - Costa del Sol'),
  ('marbella-properties.com', 'Real Estate Competitor', false, NULL, 1, 'Direct competitor - Marbella'),
  ('solvia.es', 'Real Estate Competitor', false, NULL, 1, 'Spanish property sales platform'),
  ('fotocasa.es', 'Real Estate Competitor', false, NULL, 1, 'Spanish property listing site'),
  ('habitaclia.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish property portal'),
  ('pisos.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish property listing competitor'),
  ('yaencontre.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish property search platform'),
  ('inmobiliaria.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish real estate portal'),
  ('propertyportal.com', 'Real Estate Competitor', false, NULL, 1, 'International property listings'),
  ('greenacres.es', 'Real Estate Competitor', false, NULL, 1, 'Costa del Sol property agency'),
  ('vivalavida.com', 'Real Estate Competitor', false, NULL, 1, 'Costa del Sol property specialist'),
  ('spanishpropertycenter.co.uk', 'Real Estate Competitor', false, NULL, 1, 'Spanish property sales'),
  ('completespanishpropertyguide.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish property guide with listings'),
  ('propertyforsaleinspain.com', 'Real Estate Competitor', false, NULL, 1, 'Spanish property marketplace')
ON CONFLICT (domain) DO UPDATE SET 
  is_allowed = EXCLUDED.is_allowed,
  category = EXCLUDED.category,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Phase 3: Create discovered_domains table for tracking unknown domains
CREATE TABLE IF NOT EXISTS discovered_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  source_name TEXT,
  first_suggested_at TIMESTAMPTZ DEFAULT NOW(),
  last_suggested_at TIMESTAMPTZ DEFAULT NOW(),
  times_suggested INTEGER DEFAULT 1,
  times_used INTEGER DEFAULT 0,
  article_topics JSONB DEFAULT '[]'::jsonb,
  example_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on discovered_domains
ALTER TABLE discovered_domains ENABLE ROW LEVEL SECURITY;

-- Admin can view all discovered domains
CREATE POLICY "Admins can view discovered domains"
  ON discovered_domains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Service role can insert/update discovered domains
CREATE POLICY "Service can manage discovered domains"
  ON discovered_domains FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discovered_domains_status ON discovered_domains(status);
CREATE INDEX IF NOT EXISTS idx_discovered_domains_domain ON discovered_domains(domain);

-- Add updated_at trigger
CREATE TRIGGER update_discovered_domains_updated_at
  BEFORE UPDATE ON discovered_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();