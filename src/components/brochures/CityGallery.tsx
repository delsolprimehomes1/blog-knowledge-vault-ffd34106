import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { CityBrochureData } from '@/constants/brochures';
import { useTranslation } from '@/i18n';

interface CityGalleryProps {
  city: CityBrochureData;
}

export const CityGallery: React.FC<CityGalleryProps> = ({ city }) => {
  const { t } = useTranslation();
  const brochureT = t.brochures?.[city.slug as keyof typeof t.brochures] || t.brochures?.marbella;
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % city.gallery.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + city.gallery.length) % city.gallery.length);
  };

  return (
    <section className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <span className="inline-block text-primary font-nav text-sm tracking-wider uppercase mb-4">
            {brochureT?.gallery?.eyebrow || 'Visual Journey'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {brochureT?.gallery?.headline || `Discover ${city.name}`}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {brochureT?.gallery?.description || 
              `Experience the beauty and lifestyle that awaits you in ${city.name} through our carefully curated visual gallery.`
            }
          </p>
        </div>

        {/* Masonry Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {city.gallery.map((image, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-2xl cursor-pointer reveal-on-scroll ${
                index === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
              onClick={() => openLightbox(index)}
            >
              <div className={`aspect-square ${index === 0 ? 'md:aspect-[4/3]' : ''}`}>
                <img
                  src={image}
                  alt={`${city.name} - Image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-prime-950/0 group-hover:bg-prime-950/40 transition-colors duration-300 flex items-center justify-center">
                <span className="text-white text-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  View
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Neighborhood Tags */}
        <div className="flex flex-wrap justify-center gap-3 mt-12 reveal-on-scroll">
          {city.neighborhoods.slice(0, 6).map((neighborhood, index) => (
            <span
              key={index}
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-default"
            >
              {neighborhood}
            </span>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-prime-950/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50"
          >
            <X size={32} />
          </button>

          {/* Navigation */}
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 md:left-8 text-white/70 hover:text-white transition-colors z-50"
          >
            <ChevronLeft size={48} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 md:right-8 text-white/70 hover:text-white transition-colors z-50"
          >
            <ChevronRight size={48} />
          </button>

          {/* Image */}
          <div 
            className="max-w-5xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={city.gallery[currentIndex]}
              alt={`${city.name} - Image ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {currentIndex + 1} / {city.gallery.length}
          </div>
        </div>
      )}
    </section>
  );
};
