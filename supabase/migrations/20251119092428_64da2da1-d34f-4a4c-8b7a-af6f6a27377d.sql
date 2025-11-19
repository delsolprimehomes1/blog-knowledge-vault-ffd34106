-- Fix 6: Expand Competitor Blacklist with Missing Domains
-- Add international portals, developers, mortgage brokers, relocation blogs, and investment advisors

INSERT INTO approved_domains (domain, category, is_allowed, trust_score, notes)
VALUES
  -- International property portals
  ('rightmove.com', 'Real Estate Competitor', false, 1, 'UK property portal (international)'),
  ('zillow.com', 'Real Estate Competitor', false, 1, 'US property portal'),
  ('realtor.com', 'Real Estate Competitor', false, 1, 'US property portal'),
  ('redfin.com', 'Real Estate Competitor', false, 1, 'US property portal'),
  ('trulia.com', 'Real Estate Competitor', false, 1, 'US property portal'),
  
  -- Property developers
  ('taylorwimpey.es', 'Real Estate Competitor', false, 1, 'Developer - Spain'),
  ('meliarealty.com', 'Real Estate Competitor', false, 1, 'Developer - International'),
  ('neinor.com', 'Real Estate Competitor', false, 1, 'Developer - Spain'),
  
  -- Mortgage brokers and finance
  ('spanishmortgagecompany.com', 'Real Estate Competitor', false, 1, 'Mortgage broker'),
  ('spaininvestment.com', 'Real Estate Competitor', false, 1, 'Investment advisor'),
  ('propertyinvestmentspain.com', 'Real Estate Competitor', false, 1, 'Investment advisor'),
  
  -- Relocation blogs and guides
  ('expatfocus.com', 'Real Estate Competitor', false, 1, 'Relocation blog with property links'),
  ('movingtocostadetol.com', 'Real Estate Competitor', false, 1, 'Relocation guide'),
  ('spanishrelocation.com', 'Real Estate Competitor', false, 1, 'Relocation service'),
  ('internationalpropertyguide.com', 'Real Estate Competitor', false, 1, 'Property investment guide')
ON CONFLICT (domain) DO UPDATE SET
  is_allowed = EXCLUDED.is_allowed,
  category = EXCLUDED.category,
  trust_score = EXCLUDED.trust_score,
  notes = EXCLUDED.notes,
  updated_at = now();