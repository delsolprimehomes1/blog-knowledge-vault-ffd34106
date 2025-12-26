import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bed, Bath, Maximize2, MapPin, ArrowRight, Heart, Camera } from "lucide-react";
import type { Property } from "@/types/property";
import { Language } from "@/types/home";
import { getHighResImageUrl } from "@/lib/imageUrlTransformer";

interface PropertyCardProps {
  property: Property;
  lang?: Language | string;
}

export const PropertyCard = ({ property, lang = Language.EN }: PropertyCardProps) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const propertyLink = `/${lang}/property/${property.reference}`;

  // Simulate image count (you can get this from actual data if available)
  const imageCount = property.images?.length || Math.floor(Math.random() * 10) + 3;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Link 
        to={propertyLink}
        className="group block bg-white rounded-2xl overflow-hidden 
          border border-border/50
          shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]
          hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)]
          transition-shadow duration-500"
      >
        {/* Property Image Container */}
        <div className="relative overflow-hidden aspect-[4/3]">
          {/* Image Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
          )}
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-50 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <img
            src={getHighResImageUrl(property.mainImage, 'card')}
            alt={`${property.propertyType} in ${property.location}`}
            className={`w-full h-full object-cover transition-all duration-700 ease-out ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            } group-hover:scale-110`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
              setImageLoaded(true);
            }}
          />
          
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between">
            {/* Property Type Badge */}
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold
                bg-white/95 backdrop-blur-md text-foreground
                shadow-lg shadow-black/10
                border border-white/50"
            >
              {property.propertyType}
            </motion.span>

            {/* Favorite Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={handleFavoriteClick}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                isFavorited 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                  : 'bg-white/95 backdrop-blur-md text-muted-foreground hover:text-red-500 shadow-lg shadow-black/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          {/* Image Count Badge */}
          <div className="absolute bottom-4 right-4 z-20">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
              bg-black/60 backdrop-blur-md text-white">
              <Camera className="w-3.5 h-3.5" />
              {imageCount}
            </span>
          </div>
          
          {/* Price on Image */}
          <div className="absolute bottom-4 left-4 z-20">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white/80 mb-0.5">Price</span>
              <span className="text-2xl md:text-3xl font-display font-bold text-white drop-shadow-lg">
                {formatPrice(property.price, property.currency)}
              </span>
            </div>
          </div>

          {/* Gallery Indicator Dots */}
          {imageCount > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {[...Array(Math.min(5, imageCount))].map((_, i) => (
                <span 
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
              {imageCount > 5 && (
                <span className="text-[10px] text-white/80 ml-1">+{imageCount - 5}</span>
              )}
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="p-5">
          {/* Location */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{property.location}, {property.province}</span>
          </div>

          {/* Features Grid */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300">
              <Bed className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{property.bedrooms}</span>
              <span className="text-xs text-muted-foreground">beds</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300">
              <Bath className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{property.bathrooms}</span>
              <span className="text-xs text-muted-foreground">baths</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300">
              <Maximize2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{property.builtArea}</span>
              <span className="text-xs text-muted-foreground">m²</span>
            </div>
          </div>

          {/* View Details Link */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
              View Details
            </span>
            <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center
              group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-amber-600 
              group-hover:shadow-lg group-hover:shadow-primary/25
              transition-all duration-300">
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
