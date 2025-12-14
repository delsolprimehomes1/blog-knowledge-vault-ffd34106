import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import { getOtherCities, CityBrochureData } from '@/constants/brochures';
import { useTranslation } from '@/i18n';

interface CrossCityDiscoveryProps {
  currentCity: string;
}

export const CrossCityDiscovery: React.FC<CrossCityDiscoveryProps> = ({ currentCity }) => {
  const { t } = useTranslation();
  const otherCities = getOtherCities(currentCity);

  return (
    <section className="py-24 md:py-32 bg-background relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <span className="inline-block text-primary font-nav text-sm tracking-wider uppercase mb-4">
            More Destinations
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            Explore Other Prime Locations
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The Costa del Sol offers diverse opportunities across its stunning coastline. Discover what each unique destination has to offer.
          </p>
        </div>

        {/* City Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherCities.map((city, index) => (
            <Link
              key={city.id}
              to={`/brochures/${city.slug}`}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] reveal-on-scroll"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <img
                src={city.heroImage}
                alt={city.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-prime-950/90 via-prime-950/40 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center gap-2 text-prime-gold text-sm mb-2">
                  <MapPin size={14} />
                  <span className="font-nav tracking-wider uppercase">Costa del Sol</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-white mb-2 group-hover:text-prime-goldLight transition-colors">
                  {city.name}
                </h3>
                <p className="text-white/70 text-sm line-clamp-2 mb-3">
                  {city.lifestyleKeywords.slice(0, 3).join(' • ')}
                </p>
                <span className="inline-flex items-center text-prime-gold font-medium text-sm group-hover:gap-2 transition-all">
                  Explore {city.name} <ChevronRight size={16} className="ml-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
