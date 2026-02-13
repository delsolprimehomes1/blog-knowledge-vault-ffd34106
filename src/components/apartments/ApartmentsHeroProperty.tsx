import React from 'react';
import { GalleryProperty } from '@/hooks/usePropertyGallery';
import { getGalleryTranslation } from '@/i18n/translations/apartmentsGallery';
import { Share2, Bookmark } from 'lucide-react';

interface Props {
  property: GalleryProperty;
  language: string;
  onVisit: () => void;
}

const ApartmentsHeroProperty: React.FC<Props> = ({ property, language, onVisit }) => {
  const t = getGalleryTranslation(language);
  const heroImage = property.featured_image_url || '';
  const formattedPrice = new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price);

  return (
    <section className="pt-16">
      {/* Hero Image */}
      <div className="relative w-full h-[400px] md:h-[550px] lg:h-[700px]">
        <img
          src={heroImage}
          alt={`${property.title} - ${property.location}`}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Title overlay */}
        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-10">
          <h1 className="text-white text-2xl md:text-4xl lg:text-5xl font-serif font-bold leading-tight">
            {property.title}
          </h1>
          <p className="text-white/80 text-sm md:text-lg mt-1">
            {property.location} · {property.status?.replace(/_/g, ' ')}
          </p>
        </div>

        {/* Visit button */}
        <button
          onClick={onVisit}
          className="absolute top-20 right-4 md:top-24 md:right-8 bg-landing-gold hover:bg-landing-goldDark text-white px-5 py-2 rounded-full font-semibold transition-colors text-sm"
        >
          {t.visit}
        </button>

        {/* Price badge */}
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-bold text-lg">
          {formattedPrice}
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-muted border-b border-border px-4 md:px-8 py-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t.imagesCopyright}</p>
        <div className="flex gap-3">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Share2 size={14} /> {t.share}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Bookmark size={14} /> {t.save}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ApartmentsHeroProperty;
