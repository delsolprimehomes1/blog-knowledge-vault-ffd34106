import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Expand, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PropertyHeroProps {
  images: string[];
  title: string;
  location: string;
  price: string;
  reference: string;
  bedrooms?: number;
  bathrooms?: number;
  builtArea?: number;
}

import { Bed, Bath, Maximize2 } from "lucide-react";

export const PropertyHero = ({ images, title, location, price, reference, bedrooms, bathrooms, builtArea }: PropertyHeroProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  // Parallax effect on mouse move (disabled on touch devices)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTouchDevice || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setMousePosition({ x, y });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") setIsLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (images.length === 0) {
    return (
      <div className="relative h-[50vh] min-h-[300px] md:h-[70vh] md:min-h-[500px] bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <div 
        ref={containerRef}
        className="relative h-[55vh] min-h-[350px] md:h-[70vh] md:min-h-[500px] lg:h-[75vh] lg:min-h-[600px] overflow-hidden"
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Image with Ken Burns */}
        <motion.div 
          className="absolute inset-0"
          animate={isTouchDevice ? {} : {
            x: mousePosition.x * -0.5,
            y: mousePosition.y * -0.5,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
        >
          <img
            src={images[currentIndex]}
            alt={`${title} - Image ${currentIndex + 1}`}
            className="w-full h-full object-cover animate-ken-burns scale-110"
          />
        </motion.div>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 image-overlay-luxury" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        {/* Premium Badge */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
          <div className="badge-luxury px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-1.5 md:gap-2 backdrop-blur-md">
            <Star className="w-3 h-3 md:w-4 md:h-4 fill-primary text-primary" />
            <span className="text-xs md:text-sm font-medium">Premium</span>
          </div>
        </div>

        {/* Navigation Arrows - Visible on mobile */}
        <button
          onClick={goToPrevious}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-14 md:h-14 rounded-full glass-luxury flex items-center justify-center opacity-70 md:opacity-0 hover:opacity-100 active:scale-95 transition-all duration-300 group touch-manipulation"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-foreground group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-14 md:h-14 rounded-full glass-luxury flex items-center justify-center opacity-70 md:opacity-0 hover:opacity-100 active:scale-95 transition-all duration-300 group touch-manipulation"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-foreground group-hover:scale-110 transition-transform" />
        </button>

        {/* Expand Button */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-4 left-4 md:top-6 md:left-6 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full glass-luxury flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation"
          aria-label="View fullscreen"
        >
          <Expand className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
        </button>

        {/* Swipe Indicator - Mobile only */}
        {isTouchDevice && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 md:hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-luxury text-xs text-foreground/70">
              <ChevronLeft className="w-3 h-3" />
              <span>Swipe</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* Bottom Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-12 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl"
          >
            {/* Location Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full glass-luxury mb-3 md:mb-4">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-white/90 text-xs md:text-sm font-medium">{location}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-white mb-2 md:mb-4 leading-tight">
              {title}
            </h1>

            {/* Price */}
            <div className="flex flex-wrap items-end gap-2 md:gap-4 mb-3 md:mb-4">
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-primary">
                {price}
              </span>
              <span className="text-white/60 text-xs md:text-sm mb-0.5 md:mb-1">Ref: {reference}</span>
            </div>

            {/* Inline Stats Pills */}
            {(bedrooms || bathrooms || builtArea) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6"
              >
                {bedrooms && (
                  <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full glass-luxury border border-white/10 hover:border-primary/30 transition-colors">
                    <Bed className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                    <span className="text-white text-xs md:text-sm font-medium">{bedrooms} Beds</span>
                  </div>
                )}
                {bathrooms && (
                  <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full glass-luxury border border-white/10 hover:border-primary/30 transition-colors">
                    <Bath className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                    <span className="text-white text-xs md:text-sm font-medium">{bathrooms} Baths</span>
                  </div>
                )}
                {builtArea && (
                  <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full glass-luxury border border-white/10 hover:border-primary/30 transition-colors">
                    <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                    <span className="text-white text-xs md:text-sm font-medium">{builtArea}m²</span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Thumbnail Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1"
          >
            {images.slice(0, 5).map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 w-14 h-10 md:w-20 md:h-14 rounded-lg overflow-hidden transition-all duration-300 touch-manipulation ${
                  currentIndex === index 
                    ? "ring-2 ring-primary ring-offset-1 md:ring-offset-2 ring-offset-black/50 scale-105" 
                    : "opacity-60 hover:opacity-100 active:opacity-100"
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {images.length > 5 && (
              <button
                onClick={() => setIsLightboxOpen(true)}
                className="flex-shrink-0 w-14 h-10 md:w-20 md:h-14 rounded-lg glass-luxury flex items-center justify-center text-white text-xs md:text-sm font-medium touch-manipulation"
              >
                +{images.length - 5}
              </button>
            )}
          </motion.div>
        </div>

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-20 hidden sm:block">
          <div className="glass-luxury px-3 py-1.5 md:px-4 md:py-2 rounded-full">
            <span className="text-foreground text-xs md:text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full glass-luxury flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full glass-luxury flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={images[currentIndex]}
              alt={`${title} - Image ${currentIndex + 1}`}
              className="max-w-[95vw] max-h-[75vh] md:max-w-[90vw] md:max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full glass-luxury flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            {/* Lightbox Thumbnails */}
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 overflow-x-auto max-w-[95vw] md:max-w-[90vw] pb-2 px-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                  className={`flex-shrink-0 w-12 h-9 md:w-16 md:h-12 rounded-lg overflow-hidden transition-all duration-300 touch-manipulation ${
                    currentIndex === index 
                      ? "ring-2 ring-primary scale-110" 
                      : "opacity-50 hover:opacity-100 active:opacity-100"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Counter */}
            <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 glass-luxury px-3 py-1.5 md:px-4 md:py-2 rounded-full">
              <span className="text-white text-xs md:text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
