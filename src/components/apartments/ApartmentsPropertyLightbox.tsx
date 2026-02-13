import React, { useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GalleryProperty } from '@/hooks/usePropertyGallery';
import { getGalleryTranslation } from '@/i18n/translations/apartmentsGallery';
import { X, ChevronLeft, ChevronRight, Share2, Bookmark } from 'lucide-react';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  property: GalleryProperty | null;
  currentImage: string;
  imageIndex: number;
  galleryImages: string[];
  onNextImage: () => void;
  onPrevImage: () => void;
  onGoToImage: (idx: number) => void;
  onVisit: () => void;
  language: string;
}

const ApartmentsPropertyLightbox: React.FC<Props> = ({
  isOpen,
  onClose,
  property,
  currentImage,
  imageIndex,
  galleryImages,
  onNextImage,
  onPrevImage,
  onGoToImage,
  onVisit,
  language,
}) => {
  const t = getGalleryTranslation(language);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowRight') onNextImage();
    if (e.key === 'ArrowLeft') onPrevImage();
  }, [isOpen, onNextImage, onPrevImage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!property) return null;

  const formattedPrice = new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-gray-950 border-gray-800 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">{property.title}</DialogTitle>
        <div className="relative h-full flex flex-col">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
            aria-label={t.close}
          >
            <X size={20} />
          </button>

          {/* Main image */}
          <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
            <img
              src={currentImage}
              alt={`${property.title} - ${property.location}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Nav arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={onPrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  aria-label={t.previousImage}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={onNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  aria-label={t.nextImage}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Info bar */}
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-white text-lg font-semibold truncate">{property.title}</h3>
              <p className="text-gray-400 text-sm">{property.location} · {formattedPrice}</p>
            </div>
            <button
              onClick={onVisit}
              className="shrink-0 bg-landing-gold hover:bg-landing-goldDark text-white px-5 py-2 rounded-full font-semibold transition-colors text-sm"
            >
              {t.visit}
            </button>
          </div>

          {/* Actions */}
          <div className="bg-gray-900 px-4 py-2 flex gap-3 border-t border-gray-800">
            <button className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded transition-colors text-sm">
              <Share2 size={14} /> {t.share}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded transition-colors text-sm">
              <Bookmark size={14} /> {t.save}
            </button>
          </div>

          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <div className="bg-gray-900 p-2 flex gap-2 overflow-x-auto border-t border-gray-800">
              {galleryImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  onClick={() => onGoToImage(idx)}
                  className={`h-14 w-20 object-cover rounded cursor-pointer transition-opacity shrink-0 ${
                    idx === imageIndex ? 'ring-2 ring-landing-gold opacity-100' : 'opacity-60 hover:opacity-80'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Copyright */}
          <div className="bg-gray-900 px-4 py-1.5 border-t border-gray-800">
            <p className="text-gray-500 text-xs">{t.imagesCopyright}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApartmentsPropertyLightbox;
