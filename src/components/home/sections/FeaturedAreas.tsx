import React from 'react';
import { Section } from '../ui/Section';
import { FEATURED_AREAS } from '../../../constants/home';
import { Button } from '../ui/Button';
import { ArrowRight, MapPin } from 'lucide-react';

export const FeaturedAreas: React.FC = () => {
  return (
    <Section background="light">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 md:mb-16 reveal-on-scroll animate-fade-in-down">
        <div className="max-w-2xl mb-6 md:mb-0">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">Locations</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-prime-900 mb-4 md:mb-6 leading-tight tracking-tight" style={{ letterSpacing: '-0.02em' }}>From Málaga to Sotogrande — Carefully Selected Areas</h2>
          <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.75' }}>
            Each area on the Costa del Sol has its own character, lifestyle, and investment potential. We help you understand which locations best match your goals.
          </p>
        </div>
        <Button variant="ghost" className="hidden md:flex text-prime-gold font-bold hover:bg-white/50 group">
          Explore All Areas <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {FEATURED_AREAS.map((area, idx) => (
          <div key={area.id} className={`group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-2 transition-all duration-500 aspect-[3/4] reveal-on-scroll stagger-${idx + 1}`}>
            <img 
              src={area.image} 
              alt={area.name} 
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
                  {area.description}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white group-hover:bg-prime-gold group-hover:border-prime-gold group-hover:text-prime-900 group-hover:scale-110 transition-all duration-300">
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 md:hidden text-center reveal-on-scroll">
        <Button variant="ghost" className="text-prime-gold font-bold">
          Explore All Areas
        </Button>
      </div>
    </Section>
  );
};