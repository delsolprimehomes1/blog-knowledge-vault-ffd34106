-- Create storage bucket for navbar images
INSERT INTO storage.buckets (id, name, public)
VALUES ('navbar-images', 'navbar-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to navbar images
CREATE POLICY "Public read access for navbar images"
ON storage.objects FOR SELECT
USING (bucket_id = 'navbar-images');

-- Allow authenticated users to upload navbar images
CREATE POLICY "Authenticated users can upload navbar images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'navbar-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update navbar images
CREATE POLICY "Authenticated users can update navbar images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'navbar-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete navbar images
CREATE POLICY "Authenticated users can delete navbar images"
ON storage.objects FOR DELETE
USING (bucket_id = 'navbar-images' AND auth.role() = 'authenticated');