-- Configure article-images bucket with proper limits
UPDATE storage.buckets
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'article-images';