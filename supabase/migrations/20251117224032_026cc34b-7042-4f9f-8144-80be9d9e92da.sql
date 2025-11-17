-- Update existing domains to blacklist (is_allowed = false)
UPDATE approved_domains
SET is_allowed = false,
    notes = 'Competitor domain - automatically blocked from citations',
    updated_at = now()
WHERE is_allowed = true;

-- Insert 46 new competitor domains to blacklist (using trust_score 1 = lowest)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('spaansedroomhuizen.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('realestate-space.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('spaineasy.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('investinspain.be', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('youroverseashome.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('amahomespain.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('mdrluxuryhomes.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('immoabroad.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('casaaandecostablanca.nl', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('wyndhamgrandcostadelsol.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('benoitproperties.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('cire-costadelsol.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('costasunsets.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('uwhuisinspanje.eu', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('vakantiewoningkopen.nl', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('mediterraneanhomes.eu', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('spainhomes.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('panoramamarbella.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('spanjespecials.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('realista.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('keyrealestates.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('pasku.co', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('privoimobiliare.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('nardia.es', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('spotblue.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('avidaestate.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('mikenaumannimmobilien.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('vivi-realestate.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('pineapplehomesmalaga.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('inmoinvestments.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('tekce.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('homerunmarbella.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('c21gibraltar.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('marbella-estates.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('propertiesforsale.es', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('casalobo.es', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('hihomes.es', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('imoinvestcostadelsol.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('theagency-marbella.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('dolanproperty.es', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('fineandcountry.es', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('spanskafastigheter.se', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('realestatemijas.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('higueron-valley.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('portfolio-deluxe.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked'),
('purelivingproperties.com', 'Real Estate Competitors', NULL, 1, false, 'Direct competitor - blocked')
ON CONFLICT (domain) DO UPDATE SET
  is_allowed = false,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  trust_score = EXCLUDED.trust_score,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Add comment to clarify this is a BLACKLIST system
COMMENT ON TABLE approved_domains IS 'BLACKLIST of competitor domains. Domains with is_allowed=false are blocked from all citations. Total: 296 competitor real estate websites.';