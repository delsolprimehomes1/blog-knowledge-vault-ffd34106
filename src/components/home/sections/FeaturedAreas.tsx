import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Section } from '../ui/Section';
import { FEATURED_AREAS } from '../../../constants/home';

export const FeaturedAreas: React.FC = () => {
  return (
    <Section background="white">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-950 mb-4">
          Explore <span className="text-prime-gold italic">Prime Locations</span>
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          From Málaga to Sotogrande, discover the diverse lifestyle offerings of the Costa del Sol.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {FEATURED_AREAS.map((area, index) => (
          <div 
            key={area.id}
            className={`group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 h-96 reveal-on-scroll stagger-${index + 1}`}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${area.image})` }}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-prime-950/90 via-prime-950/40 to-transparent"></div>
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h3 className="text-3xl font-serif font-bold mb-3">{area.name}</h3>
              <p className="text-slate-200 mb-4 leading-relaxed">{area.description}</p>
              <a 
                href={`/areas/${area.id}`}
                className="inline-flex items-center space-x-2 text-prime-gold hover:text-prime-goldLight transition-colors group/link"
              >
                <span className="font-medium">Learn More</span>
                <ArrowRight className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};