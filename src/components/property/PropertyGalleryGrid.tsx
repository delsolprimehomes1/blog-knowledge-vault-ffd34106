import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Images, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyGalleryGridProps {
  images: string[];
  title: string;
}

export const PropertyGalleryGrid = ({ images, title }: PropertyGalleryGridProps) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayImages = images.slice(0, 5);
  const remainingCount = Math.max(0, images.length - 5);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => setIsLightboxOpen(false);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "ArrowLeft") goToPrevious();
  };

  if (images.length === 0) {
    return (
      <div className="w-full aspect-video bg-muted rounded-2xl flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Images className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="w-full">
        {/* Desktop Bento Grid */}
        <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 gap-2 md:gap-3 h-[400px] lg:h-[480px]">
          {/* Main featured image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded-2xl"
            onClick={() => openLightbox(0)}
          >
            <img
              src={displayImages[0]}
              alt={`${title} - Main view`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button size="sm" variant="secondary" className="gap-2 glass-luxury">
                <Expand className="w-4 h-4" />
                View
              </Button>
            </div>
          </motion.div>

          {/* Secondary images */}
          {displayImages.slice(1, 5).map((image, index) => (
            <motion.div
              key={index + 1}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              className="relative group cursor-pointer overflow-hidden rounded-xl"
              onClick={() => openLightbox(index + 1)}
            >
              <img
                src={image}
                alt={`${title} - View ${index + 2}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              
              {/* Show remaining count on last visible image */}
              {index === 3 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-display text-2xl font-bold">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden relative">
          <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-2 pb-3">
            {images.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex-shrink-0 snap-center first:ml-0 last:mr-0"
                onClick={() => openLightbox(index)}
              >
                <div className="relative w-[280px] h-[200px] rounded-xl overflow-hidden cursor-pointer">
                  <img
                    src={image}
                    alt={`${title} - View ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Scroll indicator */}
          <div className="flex justify-center gap-1.5 mt-2">
            {images.slice(0, Math.min(images.length, 6)).map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
            {images.length > 6 && (
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            )}
          </div>
        </div>

        {/* View all photos button */}
        {images.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex justify-center mt-4 md:mt-6"
          >
            <Button
              variant="outline"
              className="gap-2 rounded-full px-6"
              onClick={() => openLightbox(0)}
            >
              <Images className="w-4 h-4" />
              View all {images.length} photos
            </Button>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/10 rounded-full w-12 h-12"
              onClick={closeLightbox}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 rounded-full w-12 h-12"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 rounded-full w-12 h-12"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>

            {/* Main image */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-[90vw] max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[currentIndex]}
                alt={`${title} - Photo ${currentIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            </motion.div>

            {/* Image counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-luxury rounded-full px-4 py-2">
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>

            {/* Thumbnail strip */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto scrollbar-hide px-4">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
                    index === currentIndex
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-black scale-110'
                      : 'opacity-50 hover:opacity-80'
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
