-- Add image metadata columns to location_pages
ALTER TABLE public.location_pages 
ADD COLUMN IF NOT EXISTS featured_image_caption text,
ADD COLUMN IF NOT EXISTS featured_image_width integer DEFAULT 1200,
ADD COLUMN IF NOT EXISTS featured_image_height integer DEFAULT 630;

-- Create storage bucket for location images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('location-images', 'location-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for location images
CREATE POLICY "Public can view location images"
ON storage.objects FOR SELECT
USING (bucket_id = 'location-images');

CREATE POLICY "Authenticated users can upload location images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'location-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update location images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'location-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete location images"
ON storage.objects FOR DELETE
USING (bucket_id = 'location-images' AND auth.uid() IS NOT NULL);