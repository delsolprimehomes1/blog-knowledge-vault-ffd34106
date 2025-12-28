-- Add Finnish and Norwegian to site_languages table
INSERT INTO site_languages (language_code, language_name, hreflang_code, display_flag, url_prefix, is_active, sort_order) 
VALUES 
  ('fi', 'Finnish', 'fi-FI', '🇫🇮', '/fi', true, 9),
  ('no', 'Norwegian', 'no-NO', '🇳🇴', '/no', true, 10)
ON CONFLICT (language_code) DO UPDATE SET 
  is_active = true;