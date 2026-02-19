import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Bed, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const TRANSLATIONS: Record<string, { featured: string; subtitle: string; view: string; from: string }> = {
  en: { featured: "Featured Properties", subtitle: "Handpicked residences on the Costa del Sol", view: "View", from: "From" },
  nl: { featured: "Uitgelichte Woningen", subtitle: "Zorgvuldig geselecteerde woningen aan de Costa del Sol", view: "Bekijk", from: "Vanaf" },
  fr: { featured: "Propriétés en Vedette", subtitle: "Résidences sélectionnées sur la Costa del Sol", view: "Voir", from: "À partir de" },
  de: { featured: "Ausgewählte Immobilien", subtitle: "Handverlesene Residenzen an der Costa del Sol", view: "Ansehen", from: "Ab" },
  fi: { featured: "Esittelyssä Olevat Kohteet", subtitle: "Huolella valitut asunnot Costa del Solilla", view: "Katso", from: "Alkaen" },
  pl: { featured: "Wyróżniające się Nieruchomości", subtitle: "Starannie wybrane rezydencje na Costa del Sol", view: "Zobacz", from: "Od" },
  da: { featured: "Udvalgte Ejendomme", subtitle: "Håndplukkede boliger på Costa del Sol", view: "Se", from: "Fra" },
  hu: { featured: "Kiemelt Ingatlanok", subtitle: "Válogatott rezidenciák a Costa del Solon", view: "Megtekintés", from: "Több mint" },
  sv: { featured: "Utvalda Fastigheter", subtitle: "Noggrant utvalda bostäder på Costa del Sol", view: "Visa", from: "Från" },
  no: { featured: "Utvalgte Eiendommer", subtitle: "Nøye utvalgte boliger på Costa del Sol", view: "Se", from: "Fra" },
};

interface Property {
  id: string;
  title: string;
  location: string;
  bedrooms: number;
  price: number;
  bedrooms_max: number | null;
  property_type: string | null;
  status: string | null;
  featured_image_url: string | null;
  short_description: string | null;
}

interface ApartmentsPropertiesSectionProps {
  language: string;
  onPropertyClick: (property: Property) => void;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const PropertyCard = ({ property, index, onClick, language }: { property: Property; index: number; onClick: () => void; language: string }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.05 });
  const imgSrc = property.featured_image_url?.startsWith('http') ? property.featured_image_url : FALLBACK_IMG;

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      style={{ transitionDelay: `${index * 75}ms` }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-all duration-500 cursor-pointer ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Image */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-gray-100">
        <img
          src={imgSrc}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Bedroom badge top-left */}
        <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-landing-navy/80 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1">
          <Bed size={11} className="sm:w-3 sm:h-3" />
          {property.bedrooms_max && property.bedrooms_max !== property.bedrooms ? `${property.bedrooms}-${property.bedrooms_max}` : property.bedrooms}
        </span>
        {/* Price overlay bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-10 pb-2 px-3 sm:pb-3 sm:px-4">
          <p className="text-white/80 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider">{t.from}</p>
          <p className="text-white font-bold text-sm sm:text-base">{formatPrice(property.price)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-landing-navy mb-1 line-clamp-1 group-hover:text-landing-gold transition-colors">
          {property.title}
        </h3>

        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-landing-text-secondary mb-2">
          <MapPin size={12} className="text-gray-400 sm:w-[14px] sm:h-[14px]" />
          <span className="truncate">{property.location}</span>
        </div>

        {/* Description */}
        {property.short_description && (
          <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3 line-clamp-2 leading-relaxed">
            {property.short_description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
          <div className="flex items-center gap-1">
              <Bed size={12} className="sm:w-[14px] sm:h-[14px]" /> <span>{property.bedrooms_max && property.bedrooms_max !== property.bedrooms ? `${property.bedrooms} - ${property.bedrooms_max}` : property.bedrooms}</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-landing-gold text-white text-[10px] sm:text-xs font-semibold rounded-md hover:bg-landing-gold/90 transition-colors"
          >
            <span>{t.view}</span>
            <ArrowRight size={10} className="sm:w-3 sm:h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ApartmentsPropertiesSection: React.FC<ApartmentsPropertiesSectionProps> = ({ language, onPropertyClick }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProps = async () => {
      const { data } = await supabase
        .from('apartments_properties')
        .select('id, title, location, bedrooms, bedrooms_max, price, property_type, status, featured_image_url, short_description')
        .eq('language', language)
        .eq('visible', true)
        .order('display_order', { ascending: true });
      setProperties((data as Property[]) || []);
      setLoading(false);
    };
    fetchProps();
  }, [language]);

  const handleClick = async (property: Property) => {
    // Increment views
    const { data } = await supabase.from('apartments_properties').select('views').eq('id', property.id).single();
    if (data) {
      supabase.from('apartments_properties').update({ views: (data.views || 0) + 1 }).eq('id', property.id);
    }
    onPropertyClick(property);
  };

  if (loading) {
    return (
      <section id="apartments-section" className="py-16 sm:py-20 lg:py-24 bg-gray-50/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl overflow-hidden bg-white border border-gray-100">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="apartments-section" className="py-16 sm:py-20 lg:py-24 bg-gray-50/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 lg:mb-10 gap-2 pb-3 sm:pb-4 border-b border-gray-100">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-landing-navy">
            {(TRANSLATIONS[language] || TRANSLATIONS.en).featured}
          </h2>
          <p className="text-xs sm:text-sm text-landing-text-secondary">
            {(TRANSLATIONS[language] || TRANSLATIONS.en).subtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {properties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              onClick={() => handleClick(property)}
              language={language}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ApartmentsPropertiesSection;
