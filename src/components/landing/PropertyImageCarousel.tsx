import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getHighResImageUrl } from '@/lib/imageUrlTransformer';

interface PropertyImageCarouselProps {
  images: string[];
  alt: string;
}

export const PropertyImageCarousel: React.FC<PropertyImageCarouselProps> = ({ images, alt }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollTo(index);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Fallback for no images
  if (!images || images.length === 0) {
    return (
      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }


  // Single image - no carousel needed
  if (images.length === 1) {
    return (
      <img
        src={getHighResImageUrl(images[0], 'card')}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div className="absolute inset-0 group/carousel">
      {/* Carousel Container */}
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {images.map((src, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 h-full">
              <img
                src={getHighResImageUrl(src, 'card')}
                alt={`${alt} ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prev/Next Arrows (visible on hover) */}
      <button
        onClick={scrollPrev}
        className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 z-10"
        aria-label="Previous image"
      >
        <ChevronLeft size={14} className="text-gray-700" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 z-10"
        aria-label="Next image"
      >
        <ChevronRight size={14} className="text-gray-700" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => scrollTo(idx, e)}
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
              idx === selectedIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to image ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PropertyImageCarousel;
