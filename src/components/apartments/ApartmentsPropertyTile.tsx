import React from 'react';
import { GalleryProperty } from '@/hooks/usePropertyGallery';

interface Props {
  property: GalleryProperty;
  onClick: () => void;
}

const ApartmentsPropertyTile: React.FC<Props> = ({ property, onClick }) => {
  const image = property.featured_image_url || '';
  const formattedPrice = new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price);

  return (
    <div
      className="break-inside-avoid mb-3 relative group cursor-pointer rounded-lg overflow-hidden"
      onClick={onClick}
    >
      <img
        src={image}
        alt={`${property.title} - ${property.location}`}
        className="w-full block group-hover:brightness-90 transition-all duration-200"
        loading="lazy"
      />

      {/* Partner badge */}
      {property.partner_source && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
          {property.partner_logo && (
            <img src={property.partner_logo} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
          )}
          <span className="text-[10px] font-medium text-gray-700 leading-none">{property.partner_source}</span>
        </div>
      )}

      {/* Price badge */}
      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded">
        {formattedPrice}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
        {property.partner_source && (
          <p className="text-white/80 text-xs font-medium">{property.partner_source}</p>
        )}
        <p className="text-white text-sm font-semibold line-clamp-2">{property.title}</p>
        <p className="text-white/70 text-xs mt-0.5">{property.location}</p>
      </div>
    </div>
  );
};

export default ApartmentsPropertyTile;
