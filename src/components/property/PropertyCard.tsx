import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, MapPin } from "lucide-react";
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
      className="group block bg-card rounded-lg overflow-hidden border border-border hover:shadow-xl transition-all duration-300"
    >
      {/* Property Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={property.mainImage || '/placeholder.svg'}
          alt={`${property.propertyType} in ${property.location}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
          {property.propertyType}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5">
        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{property.location}, {property.province}</span>
        </div>

        {/* Price */}
        <div className="text-2xl font-display font-bold text-foreground mb-4">
          {formatPrice(property.price, property.currency)}
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize2 className="w-4 h-4" />
            <span>{property.builtArea}m²</span>
          </div>
        </div>

        {/* View Details Link */}
        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-sm font-semibold text-primary group-hover:underline">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
};
