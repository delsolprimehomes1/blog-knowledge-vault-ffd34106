-- Tier 1: Add Spanish statistical and government domains
INSERT INTO approved_domains (domain, trust_score, category, language, region, notes)
VALUES 
  ('idealista.com', 85, 'Real Estate Statistics', 'es', 'ES', 'Market reports and statistics only - property listings blocked by path filter'),
  ('ine.es', 95, 'Government Statistics', 'es', 'ES', 'Spanish National Statistics Institute'),
  ('bde.es', 95, 'Government Statistics', 'es', 'ES', 'Bank of Spain - economic data'),
  ('mitma.gob.es', 95, 'Government Statistics', 'es', 'ES', 'Spanish Ministry of Transport - housing data')
ON CONFLICT (domain) DO UPDATE SET
  trust_score = EXCLUDED.trust_score,
  category = EXCLUDED.category,
  language = EXCLUDED.language,
  region = EXCLUDED.region,
  notes = EXCLUDED.notes;

-- Tier 2: Add is_international flag for cross-language domain support
ALTER TABLE approved_domains 
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- Mark statistical and government sources as international
UPDATE approved_domains 
SET is_international = true 
WHERE category IN ('Government Statistics', 'Real Estate Statistics', 'Research', 'Statistical Agency', 'Government')
  OR source_type IN ('government', 'statistical');