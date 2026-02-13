import React, { useState } from 'react';
import { GalleryProperty } from '@/hooks/usePropertyGallery';
import ApartmentsPropertyTile from './ApartmentsPropertyTile';
import { getGalleryTranslation } from '@/i18n/translations/apartmentsGallery';

const ITEMS_PER_PAGE = 20;

interface Props {
  properties: GalleryProperty[];
  language: string;
  onPropertyClick: (index: number) => void;
}

const ApartmentsMasonryGrid: React.FC<Props> = ({ properties, language, onPropertyClick }) => {
  const t = getGalleryTranslation(language);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const visibleProperties = properties.slice(0, visibleCount);
  const hasMore = visibleCount < properties.length;

  return (
    <section id="properties-section" className="py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <h2 className="text-2xl lg:text-3xl font-serif font-bold text-foreground mb-6">
        {t.properties}
      </h2>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-3">
        {visibleProperties.map((property, idx) => (
          <ApartmentsPropertyTile
            key={property.id}
            property={property}
            onClick={() => onPropertyClick(idx)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
            className="px-8 py-3 bg-landing-gold text-white rounded-lg font-semibold hover:bg-landing-goldDark transition-colors"
          >
            {t.seeMore}
          </button>
        </div>
      )}
    </section>
  );
};

export default ApartmentsMasonryGrid;
