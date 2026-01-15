import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, ChevronLeft } from 'lucide-react';
import { getOtherCities } from '@/constants/brochures';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

interface CrossCityDiscoveryProps {
  currentCity: string;
}

export const CrossCityDiscovery: React.FC<CrossCityDiscoveryProps> = ({ currentCity }) => {
  const { currentLanguage } = useTranslation();
  const otherCities = getOtherCities(currentCity);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      {/* Decorative Line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 reveal-on-scroll">
          <div>
            <span className="inline-block text-prime-gold font-nav text-sm tracking-wider uppercase mb-4">
              Explore More
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Other Prime Locations
            </h2>
          </div>
          
          {/* Desktop Navigation Arrows */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="rounded-full border-prime-gold/30 hover:bg-prime-gold hover:text-prime-950 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="rounded-full border-prime-gold/30 hover:bg-prime-gold hover:text-prime-950 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Horizontal Scroll Carousel */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {otherCities.map((city, index) => (
            <Link
              key={city.id}
              to={`/${currentLanguage}/brochure/${city.slug}`}
              className="group relative flex-shrink-0 w-[320px] md:w-[380px] snap-start reveal-on-scroll"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl">
                {/* Background Image */}
                <img
                  src={city.heroImage}
                  alt={city.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-prime-950 via-prime-950/50 to-transparent" />
                
                {/* Decorative Border */}
                <div className="absolute inset-0 border border-white/10 rounded-2xl group-hover:border-prime-gold/30 transition-colors duration-500" />
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  {/* Location Badge */}
                  <div className="flex items-center gap-2 text-prime-gold text-sm mb-3">
                    <MapPin size={14} />
                    <span className="font-nav tracking-wider uppercase">Costa del Sol</span>
                  </div>
                  
                  {/* City Name */}
                  <h3 className="text-3xl font-serif font-bold text-white mb-3 group-hover:text-prime-goldLight transition-colors">
                    {city.name}
                  </h3>
                  
                  {/* Keywords */}
                  <p className="text-white/60 text-sm mb-4 line-clamp-2">
                    {city.lifestyleKeywords.slice(0, 3).join(' • ')}
                  </p>
                  
                  {/* CTA */}
                  <div className="flex items-center gap-2 text-prime-gold font-nav text-sm group-hover:gap-3 transition-all">
                    <span>Explore {city.name}</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-prime-gold/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </Link>
          ))}
        </div>
        
        {/* Mobile Scroll Hint */}
        <div className="flex justify-center mt-6 md:hidden">
          <p className="text-sm text-muted-foreground">Swipe to explore more →</p>
        </div>
      </div>
    </section>
  );
};
