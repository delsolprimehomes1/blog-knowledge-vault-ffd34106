import { useState, useCallback } from 'react';

export interface GalleryProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string | null;
  status: string | null;
  featured_image_url: string | null;
  gallery_images: string[] | null;
  partner_source: string | null;
  partner_logo: string | null;
  short_description: string | null;
  bedrooms: number;
  bathrooms: number;
  sqm: number;
}

export function usePropertyGallery(properties: GalleryProperty[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [propertyIndex, setPropertyIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  const currentProperty = properties[propertyIndex] || null;
  const galleryImages = currentProperty?.gallery_images?.length
    ? currentProperty.gallery_images
    : currentProperty?.featured_image_url
      ? [currentProperty.featured_image_url]
      : [];
  const currentImage = galleryImages[imageIndex] || '';

  const openLightbox = useCallback((propIndex: number, imgIndex = 0) => {
    setPropertyIndex(propIndex);
    setImageIndex(imgIndex);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setIsOpen(false), []);

  const nextImage = useCallback(() => {
    setImageIndex(prev => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    setImageIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  const goToImage = useCallback((idx: number) => setImageIndex(idx), []);

  return {
    isOpen,
    currentProperty,
    currentImage,
    imageIndex,
    galleryImages,
    openLightbox,
    closeLightbox,
    nextImage,
    prevImage,
    goToImage,
  };
}
