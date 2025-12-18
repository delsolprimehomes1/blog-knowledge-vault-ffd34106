-- Add 54 Nordic language domains for Finnish, Norwegian, and Danish
-- All non-real-estate, authoritative sources

-- FINNISH (fi) - 20 domains
INSERT INTO public.approved_domains (domain, category, tier, trust_score, language, region, is_allowed, source_type, notes)
VALUES
  -- Tier 1 (trust 95-100)
  ('stat.fi', 'Statistics', 'tier_1', 100, 'fi', 'FI', true, 'Government', 'Statistics Finland - Official national statistics'),
  ('helsinki.fi', 'Academic', 'tier_1', 98, 'fi', 'FI', true, 'Academic', 'University of Helsinki'),
  ('aalto.fi', 'Academic', 'tier_1', 97, 'fi', 'FI', true, 'Academic', 'Aalto University'),
  ('finlex.fi', 'Legal', 'tier_1', 100, 'fi', 'FI', true, 'Government', 'Finnish legislation database'),
  ('kela.fi', 'Government Authority', 'tier_1', 98, 'fi', 'FI', true, 'Government', 'Social Insurance Institution of Finland'),
  ('vero.fi', 'Government Authority', 'tier_1', 100, 'fi', 'FI', true, 'Government', 'Finnish Tax Administration'),
  ('thl.fi', 'Health', 'tier_1', 98, 'fi', 'FI', true, 'Government', 'Finnish Institute for Health and Welfare'),
  ('oph.fi', 'Education', 'tier_1', 97, 'fi', 'FI', true, 'Government', 'Finnish National Agency for Education'),
  ('stm.fi', 'Government Authority', 'tier_1', 98, 'fi', 'FI', true, 'Government', 'Ministry of Social Affairs and Health'),
  ('tem.fi', 'Government Authority', 'tier_1', 97, 'fi', 'FI', true, 'Government', 'Ministry of Economic Affairs and Employment'),
  -- Tier 2 (trust 85-90)
  ('yle.fi', 'News & Media', 'tier_2', 90, 'fi', 'FI', true, 'Media', 'Finnish Broadcasting Company - National broadcaster'),
  ('traficom.fi', 'Government Authority', 'tier_2', 88, 'fi', 'FI', true, 'Government', 'Transport and Communications Agency'),
  ('dvv.fi', 'Government Authority', 'tier_2', 88, 'fi', 'FI', true, 'Government', 'Digital and Population Data Services'),
  ('businessfinland.fi', 'Business', 'tier_2', 87, 'fi', 'FI', true, 'Government', 'Business Finland - Innovation funding'),
  ('oulu.fi', 'Academic', 'tier_2', 86, 'fi', 'FI', true, 'Academic', 'University of Oulu'),
  ('utu.fi', 'Academic', 'tier_2', 86, 'fi', 'FI', true, 'Academic', 'University of Turku'),
  ('hs.fi', 'News & Media', 'tier_2', 85, 'fi', 'FI', true, 'Media', 'Helsingin Sanomat - Leading newspaper'),
  -- Tier 3 (trust 80-85)
  ('visitfinland.com', 'Tourism', 'tier_3', 82, 'fi', 'FI', true, 'Tourism', 'Official tourism board'),
  ('tampere.fi', 'Government Authority', 'tier_3', 80, 'fi', 'FI', true, 'Government', 'City of Tampere'),
  ('mtv.fi', 'News & Media', 'tier_3', 80, 'fi', 'FI', true, 'Media', 'MTV Finland - Commercial broadcaster')
ON CONFLICT (domain) DO NOTHING;

-- NORWEGIAN (no) - 18 domains
INSERT INTO public.approved_domains (domain, category, tier, trust_score, language, region, is_allowed, source_type, notes)
VALUES
  -- Tier 1 (trust 95-100)
  ('stortinget.no', 'Government Authority', 'tier_1', 100, 'no', 'NO', true, 'Government', 'Norwegian Parliament'),
  ('lovdata.no', 'Legal', 'tier_1', 100, 'no', 'NO', true, 'Government', 'Norwegian law database'),
  ('nav.no', 'Government Authority', 'tier_1', 98, 'no', 'NO', true, 'Government', 'Norwegian Labour and Welfare Administration'),
  ('skatteetaten.no', 'Government Authority', 'tier_1', 100, 'no', 'NO', true, 'Government', 'Norwegian Tax Administration'),
  ('helsenorge.no', 'Health', 'tier_1', 98, 'no', 'NO', true, 'Government', 'Official health portal'),
  ('fhi.no', 'Health', 'tier_1', 98, 'no', 'NO', true, 'Government', 'Norwegian Institute of Public Health'),
  ('helsedirektoratet.no', 'Health', 'tier_1', 97, 'no', 'NO', true, 'Government', 'Norwegian Directorate of Health'),
  ('ntnu.no', 'Academic', 'tier_1', 96, 'no', 'NO', true, 'Academic', 'Norwegian University of Science and Technology'),
  -- Tier 2 (trust 85-90)
  ('uit.no', 'Academic', 'tier_2', 88, 'no', 'NO', true, 'Academic', 'UiT The Arctic University of Norway'),
  ('nmbu.no', 'Academic', 'tier_2', 87, 'no', 'NO', true, 'Academic', 'Norwegian University of Life Sciences'),
  ('mattilsynet.no', 'Government Authority', 'tier_2', 88, 'no', 'NO', true, 'Government', 'Norwegian Food Safety Authority'),
  ('yr.no', 'Weather', 'tier_2', 86, 'no', 'NO', true, 'Government', 'Norwegian weather service'),
  ('miljodirektoratet.no', 'Environment', 'tier_2', 88, 'no', 'NO', true, 'Government', 'Norwegian Environment Agency'),
  ('aftenposten.no', 'News & Media', 'tier_2', 85, 'no', 'NO', true, 'Media', 'Major Norwegian newspaper'),
  ('dn.no', 'News & Media', 'tier_2', 85, 'no', 'NO', true, 'Media', 'Dagens Næringsliv - Business newspaper'),
  -- Tier 3 (trust 80-85)
  ('visitnorway.com', 'Tourism', 'tier_3', 82, 'no', 'NO', true, 'Tourism', 'Official tourism board'),
  ('vg.no', 'News & Media', 'tier_3', 80, 'no', 'NO', true, 'Media', 'VG - Major tabloid'),
  ('dagbladet.no', 'News & Media', 'tier_3', 80, 'no', 'NO', true, 'Media', 'Dagbladet newspaper')
ON CONFLICT (domain) DO NOTHING;

-- DANISH (da) - 16 domains
INSERT INTO public.approved_domains (domain, category, tier, trust_score, language, region, is_allowed, source_type, notes)
VALUES
  -- Tier 1 (trust 95-100)
  ('dst.dk', 'Statistics', 'tier_1', 100, 'da', 'DK', true, 'Government', 'Statistics Denmark'),
  ('dr.dk', 'News & Media', 'tier_1', 95, 'da', 'DK', true, 'Media', 'Danish Broadcasting Corporation'),
  ('sst.dk', 'Health', 'tier_1', 98, 'da', 'DK', true, 'Government', 'Danish Health Authority'),
  ('dtu.dk', 'Academic', 'tier_1', 97, 'da', 'DK', true, 'Academic', 'Technical University of Denmark'),
  ('au.dk', 'Academic', 'tier_1', 96, 'da', 'DK', true, 'Academic', 'Aarhus University'),
  ('borger.dk', 'Government Authority', 'tier_1', 100, 'da', 'DK', true, 'Government', 'Official citizen portal'),
  ('skat.dk', 'Government Authority', 'tier_1', 100, 'da', 'DK', true, 'Government', 'Danish Tax Authority'),
  ('retsinformation.dk', 'Legal', 'tier_1', 100, 'da', 'DK', true, 'Government', 'Danish legal database'),
  ('sundhed.dk', 'Health', 'tier_1', 97, 'da', 'DK', true, 'Government', 'Danish health portal'),
  ('fm.dk', 'Government Authority', 'tier_1', 98, 'da', 'DK', true, 'Government', 'Ministry of Finance'),
  ('um.dk', 'Government Authority', 'tier_1', 98, 'da', 'DK', true, 'Government', 'Ministry of Foreign Affairs'),
  -- Tier 2 (trust 85-90)
  ('sdu.dk', 'Academic', 'tier_2', 88, 'da', 'DK', true, 'Academic', 'University of Southern Denmark'),
  ('digst.dk', 'Government Authority', 'tier_2', 88, 'da', 'DK', true, 'Government', 'Agency for Digital Government'),
  ('virk.dk', 'Business', 'tier_2', 87, 'da', 'DK', true, 'Government', 'Business portal'),
  ('tv2.dk', 'News & Media', 'tier_2', 85, 'da', 'DK', true, 'Media', 'TV2 Denmark'),
  -- Tier 3 (trust 80-85)
  ('visitdenmark.com', 'Tourism', 'tier_3', 82, 'da', 'DK', true, 'Tourism', 'Official tourism board'),
  ('jyllands-posten.dk', 'News & Media', 'tier_3', 80, 'da', 'DK', true, 'Media', 'Jyllands-Posten newspaper'),
  ('kk.dk', 'Government Authority', 'tier_3', 80, 'da', 'DK', true, 'Government', 'City of Copenhagen')
ON CONFLICT (domain) DO NOTHING;