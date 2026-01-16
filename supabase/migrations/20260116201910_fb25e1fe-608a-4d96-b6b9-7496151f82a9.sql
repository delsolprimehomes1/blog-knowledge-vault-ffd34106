-- Create public storage bucket for glossary translations
INSERT INTO storage.buckets (id, name, public)
VALUES ('glossary-translations', 'glossary-translations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view glossary translations"
ON storage.objects FOR SELECT
USING (bucket_id = 'glossary-translations');

-- Allow authenticated users to upload (for admin/edge functions)
CREATE POLICY "Authenticated users can upload glossary translations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'glossary-translations');

CREATE POLICY "Authenticated users can update glossary translations"
ON storage.objects FOR UPDATE
USING (bucket_id = 'glossary-translations');

CREATE POLICY "Authenticated users can delete glossary translations"
ON storage.objects FOR DELETE
USING (bucket_id = 'glossary-translations');