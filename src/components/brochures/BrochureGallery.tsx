import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Check } from 'lucide-react';
import { getHighResImageUrl } from "@/lib/imageUrlTransformer";

interface GalleryItem {
  title: string;
  image: string;
}

interface BrochureGalleryProps {
  images: GalleryItem[];
  features: string[];
  cityName: string;
}

export const BrochureGallery: React.FC<BrochureGalleryProps> = ({ images, features, cityName }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Filter out empty items
  const validImages = images.filter(item => item.image);
  
  const hasAnyContent = validImages.length > 0 || features.length > 0;
  
  if (!hasAnyContent) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setLightboxIndex(prev => (prev - 1 + validImages.length) % validImages.length);
    } else {
      setLightboxIndex(prev => (prev + 1) % validImages.length);
    }
  };

  return (
    <>
      <section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
        {/* Section Header */}
        <div className="container mx-auto px-4 md:px-6 mb-12">
          <div className="text-center max-w-3xl mx-auto reveal-on-scroll">
            <span className="inline-block text-prime-gold font-nav text-sm tracking-wider uppercase mb-4">
              Visual Journey
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              Experience {cityName}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Explore the exceptional properties and lifestyle that await you.
            </p>
          </div>
        </div>

        {/* Magazine-Style Asymmetric Grid */}
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Large Featured Image - Spans 2 columns */}
            {validImages[0] && (
              <div 
                className="lg:col-span-2 lg:row-span-2 group cursor-pointer reveal-on-scroll"
                onClick={() => openLightbox(0)}
              >
                <div className="relative h-[400px] lg:h-full min-h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                  {/* Image with Ken Burns Effect */}
                  <img
                    src={validImages[0].image}
                    alt={validImages[0].title || `${cityName} - Featured`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] ease-out group-hover:scale-110"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-prime-950/80 via-prime-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    {validImages[0].title && (
                      <h3 className="font-serif text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-prime-goldLight transition-colors">
                        {validImages[0].title}
                      </h3>
                    )}
                    <p className="text-white/70 text-sm">Click to expand</p>
                  </div>
                  
                  {/* Expand Icon */}
                  <div className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Decorative Border */}
                  <div className="absolute inset-0 border-2 border-white/10 rounded-2xl group-hover:border-prime-gold/30 transition-colors duration-500" />
                </div>
              </div>
            )}

            {/* Smaller Images */}
            {validImages.slice(1, 3).map((item, index) => (
              <div 
                key={index}
                className="group cursor-pointer reveal-on-scroll"
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
                onClick={() => openLightbox(index + 1)}
              >
                <div className="relative h-[280px] rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={item.image}
                    alt={item.title || `${cityName} - Image ${index + 2}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-prime-950/70 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                  
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    {item.title && (
                      <h3 className="font-serif text-xl font-bold text-white group-hover:text-prime-goldLight transition-colors">
                        {item.title}
                      </h3>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 border border-white/10 rounded-2xl group-hover:border-prime-gold/30 transition-colors" />
                </div>
              </div>
            ))}

            {/* Features Card - Premium Style */}
            {features.length > 0 && (
              <div className="lg:col-span-1 reveal-on-scroll" style={{ transitionDelay: '300ms' }}>
                <div className="h-full min-h-[280px] rounded-2xl bg-gradient-to-br from-prime-950 to-prime-950/90 border border-white/10 p-8 flex flex-col shadow-xl">
                  <div className="mb-6">
                    <span className="text-prime-gold font-nav text-xs tracking-wider uppercase">What's Included</span>
                    <h3 className="font-serif text-2xl font-bold text-white mt-2">
                      Premium Features
                    </h3>
                  </div>
                  
                  <ul className="space-y-4 flex-1">
                    {features.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 group">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-prime-gold/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-prime-gold" />
                        </div>
                        <span className="text-white/80 leading-tight group-hover:text-white transition-colors">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  {features.length > 5 && (
                    <p className="text-prime-gold/70 text-sm mt-4">
                      +{features.length - 5} more features
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && validImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button 
            onClick={closeLightbox}
            className="absolute top-6 right-6 p-3 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation Buttons */}
          {validImages.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                className="absolute left-4 md:left-8 p-3 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                className="absolute right-4 md:right-8 p-3 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Image */}
          <div 
            className="w-[95vw] h-[90vh] flex flex-col items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={validImages[lightboxIndex].image}
              alt={validImages[lightboxIndex].title || ''}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
            />
            {validImages[lightboxIndex].title && (
              <p className="text-center text-white/80 mt-4 font-serif text-xl">
                {validImages[lightboxIndex].title}
              </p>
            )}
          </div>

          {/* Dots Indicator */}
          {validImages.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {validImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === lightboxIndex ? 'bg-prime-gold w-6' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
