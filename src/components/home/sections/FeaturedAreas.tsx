import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Section } from '../ui/Section';
import { FEATURED_AREAS } from '../../../constants/home';
import { Button } from '../ui/Button';
import { ArrowRight, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { cn } from '@/lib/utils';

// Map area IDs to brochure slugs
const AREA_SLUG_MAP: Record<string, string> = {
  'marbella': 'marbella',
  'estepona': 'estepona',
  'fuengirola': 'fuengirola',
  'benalmadena': 'benalmadena',
  'mijas': 'mijas',
  'sotogrande': 'sotogrande',
  'malaga-city': 'malaga-city',
  'casares': 'casares',
  'manilva': 'manilva',
  'torremolinos': 'torremolinos'
};

export const FeaturedAreas: React.FC = () => {
  const { t, currentLanguage } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      slidesToScroll: 1,
      containScroll: 'trimSnaps'
    },
    [
      Autoplay({ 
        delay: 4000, 
        stopOnInteraction: false, 
        stopOnMouseEnter: true 
      })
    ]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Get area description based on area ID
  const getAreaDescription = (areaId: string): string => {
    const descriptionMap: Record<string, string> = {
      'marbella': t.featuredAreas.areas.marbella,
      'estepona': t.featuredAreas.areas.estepona,
      'fuengirola': t.featuredAreas.areas.fuengirola || 'Family-friendly beach town with vibrant promenade and excellent amenities.',
      'benalmadena': t.featuredAreas.areas.benalmadena || 'Marina lifestyle and hillside charm with stunning coastal panoramas.',
      'mijas': t.featuredAreas.areas.mijas || 'Authentic white village with panoramic views and traditional Andalusian character.',
      'sotogrande': t.featuredAreas.areas.sotogrande,
      'malaga-city': t.featuredAreas.areas.malaga,
      'casares': t.featuredAreas.areas.casares || 'Traditional pueblo blanco perched on a hillside with breathtaking valley views.',
      'manilva': t.featuredAreas.areas.manilva || 'Marina and vineyard lifestyle where the mountains meet the Mediterranean.',
      'torremolinos': t.featuredAreas.areas.torremolinos || 'Classic beach promenade destination with a vibrant entertainment scene.'
    };
    return descriptionMap[areaId] || '';
  };

  return (
    <Section background="light">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 md:mb-16 reveal-on-scroll animate-fade-in-down">
        <div className="max-w-2xl mb-6 md:mb-0">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">{t.featuredAreas.eyebrow}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-prime-900 mb-4 md:mb-6 leading-tight tracking-tight" style={{ letterSpacing: '-0.02em' }}>{t.featuredAreas.headline}</h2>
          <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.75' }}>
            {t.featuredAreas.description}
          </p>
        </div>
        <Link to={`/${currentLanguage}/properties`}>
          <Button variant="ghost" className="hidden md:flex text-prime-gold font-bold hover:bg-white/50 group">
            {t.featuredAreas.cta} <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Carousel Container */}
      <div className="relative group/carousel">
        {/* Navigation Arrows - Desktop */}
        <button
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/95 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-prime-gold hover:text-white -translate-x-1/2 md:-translate-x-6"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} className="text-prime-900" />
        </button>
        
        <button
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/95 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-prime-gold hover:text-white translate-x-1/2 md:translate-x-6"
          aria-label="Next slide"
        >
          <ChevronRight size={24} className="text-prime-900" />
        </button>

        {/* Embla Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -ml-4 md:-ml-5">
            {FEATURED_AREAS.map((area) => (
              <div 
                key={area.id}
                className="flex-shrink-0 pl-4 md:pl-5 basis-[85%] sm:basis-[48%] lg:basis-[24%]"
              >
                <Link 
                  to={`/${currentLanguage}/brochure/${AREA_SLUG_MAP[area.id] || area.id}`}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-2 transition-all duration-500 aspect-[3/4] block"
                >
                  <img 
                    src={area.image} 
                    alt={`${area.name} - Costa del Sol property area`}
                    width={400}
                    height={533}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full transform transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-y-2 group-hover:translate-y-0">
                      <MapPin size={14} className="text-prime-gold" />
                      <span className="text-xs text-prime-gold uppercase tracking-widest font-bold">Costa del Sol</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3 group-hover:text-prime-goldLight transition-colors tracking-tight">{area.name}</h3>
                    <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-500">
                      <p className="text-slate-200 text-sm font-light leading-relaxed mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100" style={{ lineHeight: '1.75' }}>
                        {getAreaDescription(area.id)}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white group-hover:bg-prime-gold group-hover:border-prime-gold group-hover:text-prime-900 group-hover:scale-110 transition-all duration-300">
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {FEATURED_AREAS.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === selectedIndex 
                ? "bg-prime-gold w-8" 
                : "bg-slate-300 hover:bg-slate-400 w-2"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-12 md:hidden text-center reveal-on-scroll">
        <Link to={`/${currentLanguage}/properties`}>
          <Button variant="ghost" className="text-prime-gold font-bold">
            {t.featuredAreas.cta}
          </Button>
        </Link>
      </div>
    </Section>
  );
};
