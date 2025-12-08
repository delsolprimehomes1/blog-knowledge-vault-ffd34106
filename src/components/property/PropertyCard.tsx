import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, MapPin, ArrowRight } from "lucide-react";
import type { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard = ({ property }: PropertyCardProps) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Link 
      to={`/property/${property.reference}`}
      className="group block bg-white rounded-2xl overflow-hidden 
        border border-slate-100
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.08)]
        hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12),0_20px_50px_-10px_rgba(0,0,0,0.15)]
        transform hover:-translate-y-2
        transition-all duration-500 ease-out"
    >
      {/* Property Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
        
        <img
          src={property.mainImage || '/placeholder.svg'}
          alt={`${property.propertyType} in ${property.location}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        
        {/* Property Type Badge */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold
            bg-white/90 backdrop-blur-sm text-foreground
            shadow-lg shadow-black/10
            border border-white/50">
            {property.propertyType}
          </span>
        </div>
        
        {/* Price on Image */}
        <div className="absolute bottom-4 left-4 z-20">
          <span className="text-2xl font-display font-bold text-white drop-shadow-lg">
            {formatPrice(property.price, property.currency)}
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5">
        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">{property.location}, {property.province}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <Bed className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <Bath className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <Maximize2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{property.builtArea}m²</span>
          </div>
        </div>

        {/* View Details Link */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-sm font-semibold text-primary group-hover:text-amber-600 transition-colors duration-300">
            View Details
          </span>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center
            group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25
            transition-all duration-300">
            <ArrowRight className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
          </div>
        </div>
      </div>
    </Link>
  );
};
