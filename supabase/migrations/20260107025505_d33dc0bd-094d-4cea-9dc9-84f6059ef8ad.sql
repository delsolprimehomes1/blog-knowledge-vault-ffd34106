-- Create property-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

-- Allow public read access to property images
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Allow authenticated users to upload property images
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Allow admin users to delete property images
CREATE POLICY "Admins can delete property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND public.is_admin(auth.uid()));