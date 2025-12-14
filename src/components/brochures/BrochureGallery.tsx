import React from 'react';

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
  // Ensure we have exactly 3 slots
  const galleryItems: GalleryItem[] = [
    images[0] || { title: '', image: '' },
    images[1] || { title: '', image: '' },
    images[2] || { title: '', image: '' },
  ];

  const hasAnyContent = galleryItems.some(item => item.image) || features.length > 0;
  
  if (!hasAnyContent) return null;

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* First Image Card - Top Left */}
          {galleryItems[0].image && (
            <div className="space-y-3">
              {galleryItems[0].title && (
                <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  {galleryItems[0].title}
                </h3>
              )}
              <div className="overflow-hidden rounded-2xl shadow-lg">
                <img
                  src={galleryItems[0].image}
                  alt={galleryItems[0].title || `${cityName} - Image 1`}
                  className="w-full h-64 md:h-80 object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>
          )}

          {/* Second Image Card - Top Right */}
          {galleryItems[1].image && (
            <div className="space-y-3">
              {galleryItems[1].title && (
                <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  {galleryItems[1].title}
                </h3>
              )}
              <div className="overflow-hidden rounded-2xl shadow-lg">
                <img
                  src={galleryItems[1].image}
                  alt={galleryItems[1].title || `${cityName} - Image 2`}
                  className="w-full h-64 md:h-80 object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>
          )}

          {/* Third Image Card - Bottom Left */}
          {galleryItems[2].image && (
            <div className="space-y-3">
              {galleryItems[2].title && (
                <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  {galleryItems[2].title}
                </h3>
              )}
              <div className="overflow-hidden rounded-2xl shadow-lg">
                <img
                  src={galleryItems[2].image}
                  alt={galleryItems[2].title || `${cityName} - Image 3`}
                  className="w-full h-64 md:h-80 object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>
          )}

          {/* Features List - Bottom Right */}
          {features.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                Property Features
              </h3>
              <div className="bg-card rounded-2xl shadow-lg p-6 md:p-8 h-64 md:h-80 overflow-y-auto">
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-prime-gold mt-1">•</span>
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
