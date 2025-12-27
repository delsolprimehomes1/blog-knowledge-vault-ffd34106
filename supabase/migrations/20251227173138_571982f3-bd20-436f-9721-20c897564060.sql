-- Table for blocking competitor/real estate domains (BLACKLIST approach)
CREATE TABLE IF NOT EXISTS public.blocked_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL, -- 'competitor', 'real_estate', 'property_portal', 'listing_site'
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT true
);

-- Index for fast lookup
CREATE INDEX idx_blocked_domains_domain ON public.blocked_domains(domain);
CREATE INDEX idx_blocked_domains_category ON public.blocked_domains(category);
CREATE INDEX idx_blocked_domains_is_blocked ON public.blocked_domains(is_blocked);

-- Enable RLS
ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public can read blocked domains" ON public.blocked_domains
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage blocked domains" ON public.blocked_domains
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert comprehensive competitor list
INSERT INTO public.blocked_domains (domain, reason, category) VALUES
-- Major Real Estate Companies
('idealista.com', 'Property listing portal', 'competitor'),
('kyero.com', 'Property listing portal', 'competitor'),
('rightmove.co.uk', 'Property listing portal UK', 'competitor'),
('zoopla.co.uk', 'Property listing portal UK', 'competitor'),
('zillow.com', 'Property listing portal US', 'competitor'),
('realtor.com', 'Property listing portal US', 'competitor'),
('redfin.com', 'Property listing portal US', 'competitor'),
('trulia.com', 'Property listing portal US', 'competitor'),

-- Spanish Property Portals
('fotocasa.es', 'Spanish property portal', 'competitor'),
('pisos.com', 'Spanish property portal', 'competitor'),
('habitaclia.com', 'Spanish property portal', 'competitor'),
('yaencontre.com', 'Spanish property portal', 'competitor'),
('tucasa.com', 'Spanish property portal', 'competitor'),
('casaktua.com', 'Spanish property portal', 'competitor'),
('globaliza.com', 'Spanish property portal', 'competitor'),
('servihabitat.com', 'Spanish property portal', 'competitor'),

-- Luxury Real Estate Brands
('engel-voelkers.com', 'Luxury real estate agency', 'competitor'),
('engelvoelkers.com', 'Luxury real estate agency', 'competitor'),
('sothebysrealty.com', 'Luxury real estate agency', 'competitor'),
('christiesrealestate.com', 'Luxury real estate agency', 'competitor'),
('knightfrank.com', 'Luxury real estate agency', 'competitor'),
('savills.com', 'Luxury real estate agency', 'competitor'),
('luxuryrealestate.com', 'Luxury real estate portal', 'competitor'),
('jamesedition.com', 'Luxury goods/property portal', 'competitor'),

-- International Property Portals
('immobilienscout24.de', 'German property portal', 'competitor'),
('immowelt.de', 'German property portal', 'competitor'),
('immonet.de', 'German property portal', 'competitor'),
('funda.nl', 'Dutch property portal', 'competitor'),
('jaap.nl', 'Dutch property portal', 'competitor'),
('huispedia.nl', 'Dutch property portal', 'competitor'),
('pararius.nl', 'Dutch property portal', 'competitor'),
('seloger.com', 'French property portal', 'competitor'),
('leboncoin.fr', 'French classifieds (includes property)', 'competitor'),
('pap.fr', 'French property portal', 'competitor'),
('logic-immo.com', 'French property portal', 'competitor'),
('immobilier.notaires.fr', 'French notary property portal', 'competitor'),

-- Nordic Property Portals
('hemnet.se', 'Swedish property portal', 'competitor'),
('booli.se', 'Swedish property portal', 'competitor'),
('finn.no', 'Norwegian marketplace', 'competitor'),
('boligportal.dk', 'Danish property portal', 'competitor'),
('boligsiden.dk', 'Danish property portal', 'competitor'),
('oikotie.fi', 'Finnish property portal', 'competitor'),
('etuovi.com', 'Finnish property portal', 'competitor'),

-- Eastern European Property Portals
('otodom.pl', 'Polish property portal', 'competitor'),
('gratka.pl', 'Polish property portal', 'competitor'),
('domy.pl', 'Polish property portal', 'competitor'),
('ingatlan.com', 'Hungarian property portal', 'competitor'),
('jofogas.hu', 'Hungarian classifieds', 'competitor'),

-- Other International
('rightmove.es', 'Rightmove Spain', 'competitor'),
('propertyportugal.com', 'Portugal property portal', 'competitor'),
('greekpropertylive.com', 'Greece property portal', 'competitor'),
('homegate.ch', 'Swiss property portal', 'competitor'),
('spainhouses.net', 'Spain houses portal', 'competitor'),
('spanishpropertyinsight.com', 'Spanish property insight', 'competitor'),
('thinkspain.com', 'Think Spain property', 'competitor'),

-- Real Estate Networks/Franchises
('century21.com', 'Real estate franchise', 'competitor'),
('remax.com', 'Real estate franchise', 'competitor'),
('coldwellbanker.com', 'Real estate franchise', 'competitor'),
('kellerwilliams.com', 'Real estate franchise', 'competitor'),
('era.com', 'Real estate franchise', 'competitor'),
('bhhs.com', 'Berkshire Hathaway real estate', 'competitor'),

-- Property Management & Services
('propertymanager.com', 'Property management', 'real_estate'),
('buildium.com', 'Property management software', 'real_estate'),
('appfolio.com', 'Property management software', 'real_estate'),

-- Vacation Rentals (can compete for buyers)
('airbnb.com', 'Short-term rental platform', 'property_portal'),
('vrbo.com', 'Vacation rental platform', 'property_portal'),
('homeaway.com', 'Vacation rental platform', 'property_portal'),

-- Costa del Sol specific competitors
('costadelsol-property.com', 'Costa del Sol property portal', 'competitor'),
('marbellaproperty.com', 'Marbella property portal', 'competitor'),
('marbella-properties.com', 'Marbella properties', 'competitor'),
('panorama.es', 'Spanish property agency', 'competitor'),
('drumelia.com', 'Marbella luxury agency', 'competitor'),
('kristinatraenkner.com', 'Costa del Sol agency', 'competitor'),
('nvoga.com', 'Spanish property agency', 'competitor'),
('delpaso.es', 'Spanish property agency', 'competitor')
ON CONFLICT (domain) DO NOTHING;

-- Add comments
COMMENT ON TABLE public.blocked_domains IS 'Domains blocked from being used as citations - competitors and real estate companies. Uses BLACKLIST approach: accept any domain by default, only block those in this list.';
COMMENT ON COLUMN public.blocked_domains.category IS 'competitor = direct competitor, real_estate = real estate company, property_portal = listing sites, listing_site = property listings';