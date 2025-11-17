-- Seed approved domains with high-authority sources
-- Government and Official Institutions (Spain)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('boe.es', 'government', 'tier_1', 10, true, 'Official Spanish State Gazette'),
('gob.es', 'government', 'tier_1', 10, true, 'Spanish Government Portal'),
('juntadeandalucia.es', 'government', 'tier_1', 10, true, 'Andalusian Government'),
('madrid.org', 'government', 'tier_1', 10, true, 'Madrid Regional Government'),
('gencat.cat', 'government', 'tier_1', 10, true, 'Catalan Government'),
('ine.es', 'government', 'tier_1', 10, true, 'National Statistics Institute'),
('mscbs.gob.es', 'government', 'tier_1', 10, true, 'Ministry of Health'),
('mitma.gob.es', 'government', 'tier_1', 10, true, 'Ministry of Transport'),
('hacienda.gob.es', 'government', 'tier_1', 10, true, 'Ministry of Finance'),

-- International Government and Organizations
('europa.eu', 'government', 'tier_1', 10, true, 'European Union Official'),
('who.int', 'government', 'tier_1', 10, true, 'World Health Organization'),
('worldbank.org', 'government', 'tier_1', 10, true, 'World Bank'),
('imf.org', 'government', 'tier_1', 10, true, 'International Monetary Fund'),
('un.org', 'government', 'tier_1', 10, true, 'United Nations'),
('oecd.org', 'government', 'tier_1', 10, true, 'OECD'),

-- Academic and Research Institutions
('harvard.edu', 'academic', 'tier_1', 9, true, 'Harvard University'),
('mit.edu', 'academic', 'tier_1', 9, true, 'MIT'),
('stanford.edu', 'academic', 'tier_1', 9, true, 'Stanford University'),
('ox.ac.uk', 'academic', 'tier_1', 9, true, 'Oxford University'),
('cam.ac.uk', 'academic', 'tier_1', 9, true, 'Cambridge University'),
('uam.es', 'academic', 'tier_1', 9, true, 'Autonomous University of Madrid'),
('ub.edu', 'academic', 'tier_1', 9, true, 'University of Barcelona'),
('ucm.es', 'academic', 'tier_1', 9, true, 'Complutense University'),

-- Major News Agencies
('efe.com', 'news', 'tier_1', 8, true, 'Spanish News Agency EFE'),
('bbc.com', 'news', 'tier_1', 8, true, 'BBC News'),
('reuters.com', 'news', 'tier_1', 8, true, 'Reuters'),
('apnews.com', 'news', 'tier_1', 8, true, 'Associated Press'),
('elpais.com', 'news', 'tier_2', 7, true, 'El País'),
('elmundo.es', 'news', 'tier_2', 7, true, 'El Mundo'),
('lavanguardia.com', 'news', 'tier_2', 7, true, 'La Vanguardia'),

-- Real Estate Industry Authorities
('apce.es', 'industry', 'tier_1', 8, true, 'Spanish Property Consultants Association'),
('idealista.com', 'industry', 'tier_2', 7, true, 'Leading Spanish Real Estate Portal'),
('fotocasa.es', 'industry', 'tier_2', 7, true, 'Major Real Estate Portal'),
('registradores.org', 'industry', 'tier_1', 9, true, 'Spanish Land Registry'),

-- Financial and Economic
('bankofspain.es', 'financial', 'tier_1', 9, true, 'Bank of Spain'),
('cnmv.es', 'financial', 'tier_1', 9, true, 'Spanish Securities Market Commission'),
('ecb.europa.eu', 'financial', 'tier_1', 9, true, 'European Central Bank'),

-- Legal and Regulatory
('boe.es', 'legal', 'tier_1', 10, true, 'Official Legal Publications'),
('noticias.juridicas.com', 'legal', 'tier_2', 7, true, 'Legal News and Information')
ON CONFLICT (domain) DO NOTHING;