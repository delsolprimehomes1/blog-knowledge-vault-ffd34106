-- Add multilingual i18n columns to city_brochures
ALTER TABLE city_brochures
ADD COLUMN IF NOT EXISTS hero_headline_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hero_subtitle_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS features_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meta_title_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meta_description_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gallery_images_i18n JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_hero_image TEXT,
ADD COLUMN IF NOT EXISTS ai_gallery_images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS content_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS images_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ;

-- Migrate existing English content to new i18n structure
UPDATE city_brochures
SET 
  hero_headline_i18n = CASE 
    WHEN hero_headline IS NOT NULL AND hero_headline != '' 
    THEN jsonb_build_object('en', hero_headline) 
    ELSE '{}' 
  END,
  hero_subtitle_i18n = CASE 
    WHEN hero_subtitle IS NOT NULL AND hero_subtitle != '' 
    THEN jsonb_build_object('en', hero_subtitle) 
    ELSE '{}' 
  END,
  description_i18n = CASE 
    WHEN description IS NOT NULL AND description != '' 
    THEN jsonb_build_object('en', description) 
    ELSE '{}' 
  END,
  features_i18n = CASE 
    WHEN features IS NOT NULL 
    THEN jsonb_build_object('en', features) 
    ELSE '{}' 
  END,
  meta_title_i18n = CASE 
    WHEN meta_title IS NOT NULL AND meta_title != '' 
    THEN jsonb_build_object('en', meta_title) 
    ELSE '{}' 
  END,
  meta_description_i18n = CASE 
    WHEN meta_description IS NOT NULL AND meta_description != '' 
    THEN jsonb_build_object('en', meta_description) 
    ELSE '{}' 
  END,
  gallery_images_i18n = CASE 
    WHEN gallery_images IS NOT NULL 
    THEN jsonb_build_object('en', gallery_images) 
    ELSE '{}' 
  END
WHERE hero_headline_i18n = '{}' OR hero_headline_i18n IS NULL;