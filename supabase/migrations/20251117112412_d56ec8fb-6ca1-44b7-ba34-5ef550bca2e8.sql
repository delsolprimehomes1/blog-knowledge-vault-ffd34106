-- Seed approved_domains table with comprehensive whitelist (300+ domains)
-- All domains marked as is_allowed = true for Perplexity citations
-- Categorized by tier and trust_score for quality control

-- Government & Official Sources (Tier 1, Trust Score 10)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('lamoncloa.gob.es', 'Government', 'tier_1', 10, true, 'Spanish Government - Official Portal'),
('administracion.gob.es', 'Government', 'tier_1', 10, true, 'Public Administration Portal'),
('sede.administracion.gob.es', 'Government', 'tier_1', 10, true, 'Electronic Office of Public Administration'),
('exteriores.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Foreign Affairs'),
('miteco.gob.es', 'Government', 'tier_1', 10, true, 'Ministry for Ecological Transition'),
('hacienda.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Finance'),
('mitma.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Transport'),
('seg-social.es', 'Government', 'tier_1', 10, true, 'Social Security'),
('aeat.es', 'Government', 'tier_1', 10, true, 'Tax Agency'),
('ine.es', 'Government', 'tier_1', 10, true, 'National Statistics Institute'),
('dgt.es', 'Government', 'tier_1', 10, true, 'Traffic Authority'),
('policia.es', 'Government', 'tier_1', 10, true, 'National Police'),
('guardiacivil.es', 'Government', 'tier_1', 10, true, 'Civil Guard'),
('inclusion.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Social Inclusion'),
('mscbs.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Health'),
('juntadeandalucia.es', 'Government', 'tier_1', 10, true, 'Andalusian Government'),
('turismoandaluz.com', 'Government', 'tier_1', 10, true, 'Andalusia Tourism'),
('malaga.es', 'Government', 'tier_1', 10, true, 'Malaga City Council'),
('malaga.eu', 'Government', 'tier_1', 10, true, 'Malaga City Portal'),
('estepona.es', 'Government', 'tier_1', 10, true, 'Estepona City Council'),
('marbella.es', 'Government', 'tier_1', 10, true, 'Marbella City Council'),
('mijas.es', 'Government', 'tier_1', 10, true, 'Mijas City Council'),
('benalmadena.es', 'Government', 'tier_1', 10, true, 'Benalmadena City Council'),
('fuengirola.es', 'Government', 'tier_1', 10, true, 'Fuengirola City Council'),
('torremolinos.es', 'Government', 'tier_1', 10, true, 'Torremolinos City Council'),
('benahavis.es', 'Government', 'tier_1', 10, true, 'Benahavis City Council'),
('dipucadiz.es', 'Government', 'tier_1', 10, true, 'Cadiz Provincial Council'),
('dipusevilla.es', 'Government', 'tier_1', 10, true, 'Seville Provincial Council'),
('dipucordoba.es', 'Government', 'tier_1', 10, true, 'Cordoba Provincial Council'),
('datos.gob.es', 'Government', 'tier_1', 10, true, 'Open Government Data'),
('mjusticia.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Justice'),
('poderjudicial.es', 'Government', 'tier_1', 10, true, 'Judicial Branch'),
('boe.es', 'Government', 'tier_1', 10, true, 'Official State Gazette'),
('aemet.es', 'Government', 'tier_1', 10, true, 'Meteorological Agency'),
('uma.es', 'Government', 'tier_1', 10, true, 'University of Malaga'),
('transportes.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Transport'),
('observatoriomovilidad.es', 'Government', 'tier_1', 10, true, 'Mobility Observatory'),
('otle.transportes.gob.es', 'Government', 'tier_1', 10, true, 'Land Transport Observatory'),
('imserso.es', 'Government', 'tier_1', 10, true, 'Institute for Seniors'),
('estadisticasdecriminalidad.ses.mir.es', 'Government', 'tier_1', 10, true, 'Crime Statistics'),
('interior.gob.es', 'Government', 'tier_1', 10, true, 'Ministry of Interior')
ON CONFLICT (domain) DO NOTHING;

-- Financial Institutions (Tier 1, Trust Score 9)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('bde.es', 'Financial', 'tier_1', 9, true, 'Bank of Spain'),
('cnmv.es', 'Financial', 'tier_1', 9, true, 'Securities Market Commission'),
('santander.com', 'Financial', 'tier_1', 9, true, 'Santander Bank'),
('bancosantander.es', 'Financial', 'tier_1', 9, true, 'Santander Spain'),
('bbva.es', 'Financial', 'tier_1', 9, true, 'BBVA Bank'),
('caixabank.es', 'Financial', 'tier_1', 9, true, 'CaixaBank'),
('bankinter.com', 'Financial', 'tier_1', 9, true, 'Bankinter'),
('unicajabanco.es', 'Financial', 'tier_1', 9, true, 'Unicaja Banco'),
('bancsabadell.com', 'Financial', 'tier_1', 9, true, 'Banco Sabadell'),
('ibercaja.es', 'Financial', 'tier_1', 9, true, 'Ibercaja'),
('abanca.com', 'Financial', 'tier_1', 9, true, 'Abanca'),
('kutxabank.es', 'Financial', 'tier_1', 9, true, 'Kutxabank'),
('cajarural.com', 'Financial', 'tier_1', 9, true, 'Caja Rural'),
('openbank.es', 'Financial', 'tier_1', 9, true, 'Openbank'),
('ing.es', 'Financial', 'tier_1', 9, true, 'ING Spain'),
('evobanco.com', 'Financial', 'tier_1', 9, true, 'EVO Banco'),
('n26.com', 'Financial', 'tier_1', 9, true, 'N26 Bank'),
('revolut.com', 'Financial', 'tier_1', 9, true, 'Revolut'),
('wise.com', 'Financial', 'tier_1', 9, true, 'Wise Transfer'),
('xe.com', 'Financial', 'tier_1', 9, true, 'XE Currency'),
('ecb.europa.eu', 'Financial', 'tier_1', 9, true, 'European Central Bank'),
('euribor-rates.eu', 'Financial', 'tier_1', 9, true, 'Euribor Rates'),
('worldbank.org', 'Financial', 'tier_1', 9, true, 'World Bank'),
('imf.org', 'Financial', 'tier_1', 9, true, 'International Monetary Fund'),
('oecd.org', 'Financial', 'tier_1', 9, true, 'OECD'),
('bolsamadrid.es', 'Financial', 'tier_1', 9, true, 'Madrid Stock Exchange'),
('cnmc.es', 'Financial', 'tier_1', 9, true, 'Markets & Competition Commission'),
('ahe.es', 'Financial', 'tier_1', 9, true, 'Spanish Economists Association'),
('finect.com', 'Financial', 'tier_1', 9, true, 'Finect'),
('rankia.com', 'Financial', 'tier_1', 9, true, 'Rankia Finance')
ON CONFLICT (domain) DO NOTHING;

-- Insurance (Tier 1, Trust Score 8)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('mapfre.es', 'Insurance', 'tier_1', 8, true, 'MAPFRE Insurance'),
('allianz.es', 'Insurance', 'tier_1', 8, true, 'Allianz Spain'),
('axa.es', 'Insurance', 'tier_1', 8, true, 'AXA Spain'),
('zurich.es', 'Insurance', 'tier_1', 8, true, 'Zurich Insurance'),
('libertyseguros.es', 'Insurance', 'tier_1', 8, true, 'Liberty Seguros'),
('lineadirecta.com', 'Insurance', 'tier_1', 8, true, 'Linea Directa'),
('generali.es', 'Insurance', 'tier_1', 8, true, 'Generali Spain'),
('santalucia.es', 'Insurance', 'tier_1', 8, true, 'Santa Lucia'),
('ocaso.es', 'Insurance', 'tier_1', 8, true, 'Ocaso Insurance'),
('caser.es', 'Insurance', 'tier_1', 8, true, 'Caser Seguros'),
('dkv.es', 'Insurance', 'tier_1', 8, true, 'DKV Health Insurance'),
('sanitas.es', 'Insurance', 'tier_1', 8, true, 'Sanitas Health'),
('segurcaixaadeslas.es', 'Insurance', 'tier_1', 8, true, 'SegurCaixa Adeslas'),
('asisa.es', 'Insurance', 'tier_1', 8, true, 'Asisa Health'),
('mutua.es', 'Insurance', 'tier_1', 8, true, 'Mutua Insurance'),
('race.es', 'Insurance', 'tier_1', 8, true, 'RACE'),
('racc.es', 'Insurance', 'tier_1', 8, true, 'RACC'),
('consorseguros.es', 'Insurance', 'tier_1', 8, true, 'Consor Seguros'),
('unespa.es', 'Insurance', 'tier_1', 8, true, 'Spanish Insurance Association')
ON CONFLICT (domain) DO NOTHING;

-- Health & Wellness (Tier 1, Trust Score 8)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('who.int', 'Health', 'tier_1', 8, true, 'World Health Organization'),
('cdc.gov', 'Health', 'tier_1', 8, true, 'CDC - Disease Control'),
('mayoclinic.org', 'Health', 'tier_1', 8, true, 'Mayo Clinic'),
('webmd.com', 'Health', 'tier_1', 8, true, 'WebMD'),
('nhs.uk', 'Health', 'tier_1', 8, true, 'UK National Health Service'),
('doctoralia.es', 'Health', 'tier_1', 8, true, 'Doctoralia Spain'),
('fundacionmapfre.org', 'Health', 'tier_1', 8, true, 'MAPFRE Foundation'),
('saludsinbulos.com', 'Health', 'tier_1', 8, true, 'Health Without Myths'),
('estilosdevidasaludable.sanidad.gob.es', 'Health', 'tier_1', 8, true, 'Healthy Lifestyles Ministry'),
('homeandlifestyle.es', 'Health', 'tier_2', 7, true, 'Home & Lifestyle')
ON CONFLICT (domain) DO NOTHING;

-- Travel & Tourism (Tier 2, Trust Score 7-8)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('spain.info', 'Travel', 'tier_1', 8, true, 'Official Spain Tourism'),
('andalucia.org', 'Travel', 'tier_1', 8, true, 'Andalusia Official Tourism'),
('andalucia.com', 'Travel', 'tier_2', 7, true, 'Andalucia Travel Guide'),
('visit-andalucia.com', 'Travel', 'tier_2', 7, true, 'Visit Andalucia'),
('spain-holiday.com', 'Travel', 'tier_2', 7, true, 'Spain Holiday'),
('nerjatoday.com', 'Travel', 'tier_2', 7, true, 'Nerja Today'),
('nerja-turismo.com', 'Travel', 'tier_2', 7, true, 'Nerja Tourism'),
('mappingspain.com', 'Travel', 'tier_2', 7, true, 'Mapping Spain'),
('malagatravelguide.net', 'Travel', 'tier_2', 7, true, 'Malaga Travel Guide'),
('spainonfoot.com', 'Travel', 'tier_2', 7, true, 'Spain on Foot'),
('lonelyplanet.com', 'Travel', 'tier_2', 7, true, 'Lonely Planet'),
('roughguides.com', 'Travel', 'tier_2', 7, true, 'Rough Guides'),
('cntraveler.com', 'Travel', 'tier_2', 7, true, 'Conde Nast Traveler'),
('theculturetrip.com', 'Travel', 'tier_2', 7, true, 'Culture Trip'),
('expatica.com', 'Travel', 'tier_2', 7, true, 'Expatica'),
('spaintraveller.com', 'Travel', 'tier_2', 7, true, 'Spain Traveller'),
('whereismyspain.com', 'Travel', 'tier_2', 7, true, 'Where is my Spain'),
('telegraph.co.uk', 'Travel', 'tier_2', 7, true, 'The Telegraph'),
('independent.co.uk', 'Travel', 'tier_2', 7, true, 'The Independent'),
('onthegotours.com', 'Travel', 'tier_2', 7, true, 'On The Go Tours'),
('tourtailors.com', 'Travel', 'tier_2', 7, true, 'Tour Tailors'),
('andaluciaexperiencetours.com', 'Travel', 'tier_2', 7, true, 'Andalucia Experience Tours'),
('tripadvisor.com', 'Travel', 'tier_2', 7, true, 'TripAdvisor'),
('airbnb.com', 'Travel', 'tier_2', 7, true, 'Airbnb'),
('visitcostadelsol.com', 'Travel', 'tier_2', 7, true, 'Visit Costa del Sol')
ON CONFLICT (domain) DO NOTHING;

-- Transportation (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('renfe.com', 'Transportation', 'tier_2', 7, true, 'Spanish Railways'),
('aena.es', 'Transportation', 'tier_2', 7, true, 'Spanish Airports'),
('alsa.es', 'Transportation', 'tier_2', 7, true, 'ALSA Bus'),
('blablacar.es', 'Transportation', 'tier_2', 7, true, 'BlaBlaCar'),
('omio.com', 'Transportation', 'tier_2', 7, true, 'Omio'),
('thetrainline.com', 'Transportation', 'tier_2', 7, true, 'Trainline'),
('rome2rio.com', 'Transportation', 'tier_2', 7, true, 'Rome2Rio'),
('viamichelin.com', 'Transportation', 'tier_2', 7, true, 'Via Michelin'),
('raileurope.com', 'Transportation', 'tier_2', 7, true, 'Rail Europe'),
('flixbus.es', 'Transportation', 'tier_2', 7, true, 'FlixBus'),
('uber.com', 'Transportation', 'tier_2', 7, true, 'Uber'),
('cabify.com', 'Transportation', 'tier_2', 7, true, 'Cabify'),
('skyscanner.net', 'Transportation', 'tier_2', 7, true, 'Skyscanner'),
('kayak.com', 'Transportation', 'tier_2', 7, true, 'Kayak'),
('momondo.com', 'Transportation', 'tier_2', 7, true, 'Momondo'),
('expedia.com', 'Transportation', 'tier_2', 7, true, 'Expedia'),
('edreams.com', 'Transportation', 'tier_2', 7, true, 'eDreams'),
('ryanair.com', 'Transportation', 'tier_2', 7, true, 'Ryanair'),
('iberia.com', 'Transportation', 'tier_2', 7, true, 'Iberia'),
('vueling.com', 'Transportation', 'tier_2', 7, true, 'Vueling'),
('easyjet.com', 'Transportation', 'tier_2', 7, true, 'EasyJet'),
('jet2.com', 'Transportation', 'tier_2', 7, true, 'Jet2'),
('lufthansa.com', 'Transportation', 'tier_2', 7, true, 'Lufthansa'),
('malagaairport.eu', 'Transportation', 'tier_2', 7, true, 'Malaga Airport'),
('malagaairportcarhire.com', 'Transportation', 'tier_2', 7, true, 'Malaga Airport Car Hire'),
('spainbycar.es', 'Transportation', 'tier_2', 7, true, 'Spain by Car'),
('seat61.com', 'Transportation', 'tier_2', 7, true, 'Seat 61'),
('busbud.com', 'Transportation', 'tier_2', 7, true, 'Busbud')
ON CONFLICT (domain) DO NOTHING;

-- Car Rental (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('malagacar.com', 'Car Rental', 'tier_2', 7, true, 'Malaga Car'),
('recordrentacar.com', 'Car Rental', 'tier_2', 7, true, 'Record Rent a Car'),
('goldcar.es', 'Car Rental', 'tier_2', 7, true, 'Goldcar'),
('europcar.es', 'Car Rental', 'tier_2', 7, true, 'Europcar Spain'),
('hertz.es', 'Car Rental', 'tier_2', 7, true, 'Hertz Spain'),
('avis.es', 'Car Rental', 'tier_2', 7, true, 'Avis Spain'),
('budget.es', 'Car Rental', 'tier_2', 7, true, 'Budget Spain'),
('sixt.es', 'Car Rental', 'tier_2', 7, true, 'Sixt Spain'),
('enterprise.es', 'Car Rental', 'tier_2', 7, true, 'Enterprise Spain'),
('fireflycarrental.com', 'Car Rental', 'tier_2', 7, true, 'Firefly Car Rental'),
('doyouspain.com', 'Car Rental', 'tier_2', 7, true, 'Do You Spain'),
('rentalcars.com', 'Car Rental', 'tier_2', 7, true, 'Rental Cars'),
('espacar.com', 'Car Rental', 'tier_2', 7, true, 'EspaCar'),
('hellehollis.com', 'Car Rental', 'tier_2', 7, true, 'Helle Hollis'),
('cargest.com', 'Car Rental', 'tier_2', 7, true, 'Cargest'),
('nizacars.es', 'Car Rental', 'tier_2', 7, true, 'Niza Cars'),
('autoeurope.eu', 'Car Rental', 'tier_2', 7, true, 'Auto Europe'),
('discovercars.com', 'Car Rental', 'tier_2', 7, true, 'Discover Cars'),
('economycarrentals.com', 'Car Rental', 'tier_2', 7, true, 'Economy Car Rentals'),
('centauro.net', 'Car Rental', 'tier_2', 7, true, 'Centauro'),
('marbesol.com', 'Car Rental', 'tier_2', 7, true, 'Marbesol'),
('solorentacar.com', 'Car Rental', 'tier_2', 7, true, 'Solo Rent a Car')
ON CONFLICT (domain) DO NOTHING;

-- Home & Lifestyle (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('ikea.com', 'Home & Lifestyle', 'tier_2', 7, true, 'IKEA'),
('conforama.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Conforama'),
('leroymerlin.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Leroy Merlin'),
('habitat.net', 'Home & Lifestyle', 'tier_2', 7, true, 'Habitat'),
('maisonsdumonde.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Maisons du Monde'),
('zarahome.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Zara Home'),
('kavehome.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Kave Home'),
('westwingnow.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Westwing Now'),
('becara.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Becara'),
('elcorteingles.es', 'Home & Lifestyle', 'tier_2', 7, true, 'El Corte Ingles'),
('casashops.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Casa Shops'),
('bricodepot.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Brico Depot'),
('bauhaus.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Bauhaus'),
('decoora.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Decoora'),
('elmueble.com', 'Home & Lifestyle', 'tier_2', 7, true, 'El Mueble'),
('revistaad.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Revista AD'),
('micasarevista.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Mi Casa Revista'),
('madaboutfurniture.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Mad About Furniture'),
('idealfurniture.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Ideal Furniture'),
('mabrideco.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Mabri Deco'),
('belladesign.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Bella Design'),
('portobellostreet.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Portobello Street'),
('boconcept.com', 'Home & Lifestyle', 'tier_2', 7, true, 'BoConcept'),
('roche-bobois.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Roche Bobois'),
('kettal.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Kettal'),
('vondom.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Vondom'),
('mueblesboom.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Muebles Boom'),
('gancedomuebles.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Gancedo Muebles'),
('decoist.com', 'Home & Lifestyle', 'tier_2', 7, true, 'Decoist'),
('houzz.es', 'Home & Lifestyle', 'tier_2', 7, true, 'Houzz Spain')
ON CONFLICT (domain) DO NOTHING;

-- Legal Services (Tier 1, Trust Score 8)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('abogacia.es', 'Legal', 'tier_1', 8, true, 'Spanish Bar Association'),
('curia.europa.eu', 'Legal', 'tier_1', 8, true, 'EU Court of Justice'),
('eur-lex.europa.eu', 'Legal', 'tier_1', 8, true, 'EU Law Portal'),
('echr.coe.int', 'Legal', 'tier_1', 8, true, 'European Court of Human Rights'),
('coe.int', 'Legal', 'tier_1', 8, true, 'Council of Europe'),
('icamalaga.es', 'Legal', 'tier_1', 8, true, 'Malaga Bar Association'),
('icab.es', 'Legal', 'tier_1', 8, true, 'Barcelona Bar Association'),
('icj.org', 'Legal', 'tier_1', 8, true, 'International Court of Justice'),
('un.org', 'Legal', 'tier_1', 8, true, 'United Nations'),
('lexology.com', 'Legal', 'tier_1', 8, true, 'Lexology'),
('chambers.com', 'Legal', 'tier_1', 8, true, 'Chambers Legal'),
('legal500.com', 'Legal', 'tier_1', 8, true, 'Legal 500'),
('hg.org', 'Legal', 'tier_1', 8, true, 'HG Legal Resources'),
('nolo.com', 'Legal', 'tier_1', 8, true, 'Nolo Legal'),
('lawsociety.org.uk', 'Legal', 'tier_1', 8, true, 'Law Society UK'),
('maelabogados.com', 'Legal', 'tier_2', 7, true, 'Mael Abogados'),
('martinezechevarria.es', 'Legal', 'tier_2', 7, true, 'Martinez Echevarria'),
('costaluzlawyers.es', 'Legal', 'tier_2', 7, true, 'Costa Luz Lawyers'),
('white-baos.com', 'Legal', 'tier_2', 7, true, 'White & Baos'),
('balms.es', 'Legal', 'tier_2', 7, true, 'Balms Abogados'),
('gvlaw.es', 'Legal', 'tier_2', 7, true, 'GV Law'),
('decuria.es', 'Legal', 'tier_2', 7, true, 'Decuria Legal'),
('lexlife.es', 'Legal', 'tier_2', 7, true, 'Lexlife'),
('blacktowerfm.com', 'Legal', 'tier_2', 7, true, 'Blacktower Financial'),
('gov.uk', 'Legal', 'tier_1', 8, true, 'UK Government'),
('europa.eu', 'Legal', 'tier_1', 8, true, 'European Union')
ON CONFLICT (domain) DO NOTHING;

-- News & Media (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('elplural.com', 'News', 'tier_2', 7, true, 'El Plural'),
('diezminutos.es', 'News', 'tier_2', 7, true, 'Diez Minutos'),
('20minutos.es', 'News', 'tier_2', 7, true, '20 Minutos'),
('elmundo.es', 'News', 'tier_2', 7, true, 'El Mundo'),
('abc.es', 'News', 'tier_2', 7, true, 'ABC'),
('elpais.com', 'News', 'tier_2', 7, true, 'El País'),
('lavanguardia.com', 'News', 'tier_2', 7, true, 'La Vanguardia'),
('elespanol.com', 'News', 'tier_2', 7, true, 'El Español'),
('europapress.es', 'News', 'tier_2', 7, true, 'Europa Press'),
('andaluciainformacion.es', 'News', 'tier_2', 7, true, 'Andalucia Informacion'),
('surinenglish.com', 'News', 'tier_2', 7, true, 'SUR in English'),
('typicallyspanish.co.uk', 'News', 'tier_2', 7, true, 'Typically Spanish'),
('nationalgeographic.com', 'News', 'tier_2', 7, true, 'National Geographic'),
('theolivepress.es', 'News', 'tier_2', 7, true, 'The Olive Press'),
('spanishnewsdaily.com', 'News', 'tier_2', 7, true, 'Spanish News Daily'),
('spainenglishnewspaper.com', 'News', 'tier_2', 7, true, 'Spain English Newspaper'),
('euroweeklynews.com', 'News', 'tier_2', 7, true, 'Euro Weekly News'),
('bbc.com', 'News', 'tier_2', 7, true, 'BBC'),
('reuters.com', 'News', 'tier_2', 7, true, 'Reuters'),
('elconfidencial.com', 'News', 'tier_2', 7, true, 'El Confidencial'),
('huffingtonpost.es', 'News', 'tier_2', 7, true, 'Huffington Post Spain'),
('elcorreo.com', 'News', 'tier_2', 7, true, 'El Correo'),
('expansion.com', 'News', 'tier_2', 7, true, 'Expansion'),
('malagahoy.es', 'News', 'tier_2', 7, true, 'Malaga Hoy'),
('diariosur.es', 'News', 'tier_2', 7, true, 'Diario Sur'),
('ideal.es', 'News', 'tier_2', 7, true, 'Ideal'),
('larioja.com', 'News', 'tier_2', 7, true, 'La Rioja'),
('elperiodico.com', 'News', 'tier_2', 7, true, 'El Periodico'),
('elfarodevigo.es', 'News', 'tier_2', 7, true, 'El Faro de Vigo'),
('lavozdegalicia.es', 'News', 'tier_2', 7, true, 'La Voz de Galicia'),
('investigacorrupcion.es', 'News', 'tier_2', 7, true, 'Investiga Corrupcion'),
('elnortedecastilla.es', 'News', 'tier_2', 7, true, 'El Norte de Castilla'),
('laprovincia.es', 'News', 'tier_2', 7, true, 'La Provincia'),
('andalucesdiario.es', 'News', 'tier_2', 7, true, 'Andaluces Diario'),
('elconfidencialdigital.com', 'News', 'tier_2', 7, true, 'El Confidencial Digital')
ON CONFLICT (domain) DO NOTHING;

-- Sustainability & Environment (Tier 1, Trust Score 8)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('appa.es', 'Sustainability', 'tier_1', 8, true, 'Renewable Energy Association'),
('dirse.es', 'Sustainability', 'tier_1', 8, true, 'CSR Association'),
('tierra.org', 'Sustainability', 'tier_1', 8, true, 'Tierra'),
('reds-sdsn.es', 'Sustainability', 'tier_1', 8, true, 'REDS Network'),
('wwf.es', 'Sustainability', 'tier_1', 8, true, 'WWF Spain'),
('greenpeace.org', 'Sustainability', 'tier_1', 8, true, 'Greenpeace'),
('vidasostenible.org', 'Sustainability', 'tier_1', 8, true, 'Sustainable Life'),
('unef.es', 'Sustainability', 'tier_1', 8, true, 'Solar Energy Union'),
('aemer.org', 'Sustainability', 'tier_1', 8, true, 'Wind Energy Association'),
('institutodesostenibilidad.es', 'Sustainability', 'tier_1', 8, true, 'Sustainability Institute'),
('sostenibilidadyprogreso.org', 'Sustainability', 'tier_1', 8, true, 'Sustainability & Progress'),
('idae.es', 'Sustainability', 'tier_1', 8, true, 'Energy Diversification Institute'),
('clubdesostenibilidad.es', 'Sustainability', 'tier_1', 8, true, 'Sustainability Club'),
('energias-renovables.com', 'Sustainability', 'tier_1', 8, true, 'Renewable Energies'),
('thenergia.com', 'Sustainability', 'tier_1', 8, true, 'The Energia'),
('guiaongs.org', 'Sustainability', 'tier_1', 8, true, 'NGO Guide'),
('fundacionrenovables.org', 'Sustainability', 'tier_1', 8, true, 'Renewables Foundation'),
('enerclub.es', 'Sustainability', 'tier_1', 8, true, 'Ener Club'),
('suelosolar.com', 'Sustainability', 'tier_1', 8, true, 'Solar Ground'),
('icaen.gencat.cat', 'Sustainability', 'tier_1', 8, true, 'Catalonia Energy Institute'),
('agenciaandaluzadelaenergia.es', 'Sustainability', 'tier_1', 8, true, 'Andalusian Energy Agency')
ON CONFLICT (domain) DO NOTHING;

-- Food & Wine (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('foodswinesfromspain.com', 'Food & Wine', 'tier_2', 7, true, 'Foods & Wines from Spain'),
('exclusivespain.es', 'Food & Wine', 'tier_2', 7, true, 'Exclusive Spain'),
('eatandwalkabout.com', 'Food & Wine', 'tier_2', 7, true, 'Eat and Walk About'),
('spainismore.com', 'Food & Wine', 'tier_2', 7, true, 'Spain is More'),
('winetourismspain.com', 'Food & Wine', 'tier_2', 7, true, 'Wine Tourism Spain'),
('mediterraneanhomes.eu', 'Food & Wine', 'tier_2', 7, true, 'Mediterranean Homes'),
('devourtours.com', 'Food & Wine', 'tier_2', 7, true, 'Devour Tours'),
('designerjourneys.com', 'Food & Wine', 'tier_2', 7, true, 'Designer Journeys'),
('showmb.es', 'Food & Wine', 'tier_2', 7, true, 'ShowMB'),
('vibrantsoulful.com', 'Food & Wine', 'tier_2', 7, true, 'Vibrant Soulful'),
('bestschoolsinspain.com', 'Food & Wine', 'tier_2', 7, true, 'Best Schools in Spain'),
('piccavey.com', 'Food & Wine', 'tier_2', 7, true, 'Piccavey'),
('investinspain.org', 'Food & Wine', 'tier_2', 7, true, 'Invest in Spain'),
('movetotraveling.com', 'Food & Wine', 'tier_2', 7, true, 'Move to Traveling'),
('vanguard-student-housing.com', 'Food & Wine', 'tier_2', 7, true, 'Vanguard Student Housing'),
('blog.abacoadvisers.com', 'Food & Wine', 'tier_2', 7, true, 'Abaco Advisers Blog'),
('gerrydawesspain.com', 'Food & Wine', 'tier_2', 7, true, 'Gerry Dawes Spain'),
('15bodegas.com', 'Food & Wine', 'tier_2', 7, true, '15 Bodegas'),
('spaininfo.com', 'Food & Wine', 'tier_2', 7, true, 'Spain Info')
ON CONFLICT (domain) DO NOTHING;

-- Education (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('spaineasy.com', 'Education', 'tier_2', 7, true, 'Spain Easy'),
('stepsintospain.es', 'Education', 'tier_2', 7, true, 'Steps into Spain'),
('bishopsmove.es', 'Education', 'tier_2', 7, true, 'Bishops Move Spain'),
('gogoespana.com', 'Education', 'tier_2', 7, true, 'Go Go España')
ON CONFLICT (domain) DO NOTHING;

-- Architecture & Construction (Tier 1, Trust Score 8)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('codigotecnico.org', 'Architecture', 'tier_1', 8, true, 'Technical Building Code'),
('breeam.es', 'Architecture', 'tier_1', 8, true, 'BREEAM Spain'),
('gbce.es', 'Architecture', 'tier_1', 8, true, 'Green Building Council Spain'),
('consumoresponde.es', 'Architecture', 'tier_1', 8, true, 'Consumer Response'),
('cgate.es', 'Architecture', 'tier_1', 8, true, 'CGATE'),
('cscae.com', 'Architecture', 'tier_1', 8, true, 'Architects Association'),
('arquitectura-sostenible.es', 'Architecture', 'tier_1', 8, true, 'Sustainable Architecture'),
('archdaily.com', 'Architecture', 'tier_1', 8, true, 'ArchDaily'),
('smartechcluster.org', 'Architecture', 'tier_1', 8, true, 'Smartech Cluster'),
('casadomo.com', 'Architecture', 'tier_1', 8, true, 'Casa Domo'),
('notariado.org', 'Architecture', 'tier_1', 8, true, 'Notary Council'),
('registradores.org', 'Architecture', 'tier_1', 8, true, 'Property Registrars')
ON CONFLICT (domain) DO NOTHING;

-- Travel Blogs (Tier 2, Trust Score 6)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('danasdolcevita.com', 'Travel Blog', 'tier_2', 6, true, 'Dana''s Dolce Vita'),
('travelynnfamily.com', 'Travel Blog', 'tier_2', 6, true, 'Travelynn Family'),
('snapsbyfox.com', 'Travel Blog', 'tier_2', 6, true, 'Snaps by Fox'),
('bbqboy.net', 'Travel Blog', 'tier_2', 6, true, 'BBQ Boy'),
('goaskalocal.com', 'Travel Blog', 'tier_2', 6, true, 'Go Ask a Local'),
('amoureux-du-monde.com', 'Travel Blog', 'tier_2', 6, true, 'Amoureux du Monde'),
('clickandgo.com', 'Travel Blog', 'tier_2', 6, true, 'Click and Go'),
('traverse-blog.com', 'Travel Blog', 'tier_2', 6, true, 'Traverse Blog'),
('runningtotravel.wordpress.com', 'Travel Blog', 'tier_2', 6, true, 'Running to Travel'),
('dancingtheearth.com', 'Travel Blog', 'tier_2', 6, true, 'Dancing the Earth'),
('charlotteplansatrip.com', 'Travel Blog', 'tier_2', 6, true, 'Charlotte Plans a Trip'),
('oliverstravels.com', 'Travel Blog', 'tier_2', 6, true, 'Olivers Travels'),
('petitesuitcase.com', 'Travel Blog', 'tier_2', 6, true, 'Petite Suitcase'),
('rebeccaandtheworld.com', 'Travel Blog', 'tier_2', 6, true, 'Rebecca and the World'),
('gabriellaviola.com', 'Travel Blog', 'tier_2', 6, true, 'Gabriella Viola'),
('vamospanish.com', 'Travel Blog', 'tier_2', 6, true, 'Vamos Spanish'),
('my-luxurytravel.fr', 'Travel Blog', 'tier_2', 6, true, 'My Luxury Travel'),
('theprofessionalhobo.com', 'Travel Blog', 'tier_2', 6, true, 'The Professional Hobo'),
('mylittleworldoftravelling.com', 'Travel Blog', 'tier_2', 6, true, 'My Little World of Travelling'),
('rossiwrites.com', 'Travel Blog', 'tier_2', 6, true, 'Rossi Writes'),
('thewanderlustwithin.com', 'Travel Blog', 'tier_2', 6, true, 'The Wanderlust Within'),
('whereangiewanders.com', 'Travel Blog', 'tier_2', 6, true, 'Where Angie Wanders'),
('travelinmad.com', 'Travel Blog', 'tier_2', 6, true, 'Travel in Mad'),
('earthtrekkers.com', 'Travel Blog', 'tier_2', 6, true, 'Earth Trekkers'),
('theplanetd.com', 'Travel Blog', 'tier_2', 6, true, 'The Planet D'),
('kimkim.com', 'Travel Blog', 'tier_2', 6, true, 'KimKim'),
('handluggageonly.co.uk', 'Travel Blog', 'tier_2', 6, true, 'Hand Luggage Only')
ON CONFLICT (domain) DO NOTHING;

-- Senior Living (Tier 2, Trust Score 7)
INSERT INTO approved_domains (domain, category, tier, trust_score, is_allowed, notes) VALUES
('jubilares.es', 'Senior Living', 'tier_2', 7, true, 'Jubilares'),
('comunidad.madrid', 'Senior Living', 'tier_2', 7, true, 'Madrid Community')
ON CONFLICT (domain) DO NOTHING;