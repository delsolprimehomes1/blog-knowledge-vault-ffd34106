-- Create public sitemaps storage bucket for sitemap XML files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sitemaps', 
  'sitemaps', 
  true, 
  10485760, -- 10MB limit
  ARRAY['application/xml', 'text/xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/xml', 'text/xml'];

-- Allow public read access to all sitemap files
CREATE POLICY "Public read access for sitemaps"
ON storage.objects FOR SELECT
USING (bucket_id = 'sitemaps');

-- Allow service role to upload/update sitemaps
CREATE POLICY "Service role can manage sitemaps"
ON storage.objects FOR ALL
USING (bucket_id = 'sitemaps')
WITH CHECK (bucket_id = 'sitemaps');