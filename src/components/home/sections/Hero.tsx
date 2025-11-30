import React from 'react';
import { Language } from '../../../types/home';

interface HeroProps {
  lang: Language;
}

export const Hero: React.FC<HeroProps> = ({ lang }) => {
  return (
    <section className="relative h-[90vh] md:h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://picsum.photos/id/1031/1920/1080)',
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-prime-950/70 via-prime-950/50 to-prime-950/80"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 md:px-8 max-w-5xl mx-auto">
        <div className="reveal-on-scroll">
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight leading-tight">
            Your Dream Home on the <span className="text-gradient-gold">Costa del Sol</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-200 mb-8 font-light max-w-3xl mx-auto leading-relaxed">
            Expert guidance in new-build and off-plan properties. Transparent, AI-enhanced, and in your language.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="/property-finder" className="px-8 py-4 bg-prime-gold text-prime-950 rounded-lg hover:bg-prime-goldLight transition-all duration-300 font-semibold text-lg shadow-lg shadow-prime-gold/30 hover:shadow-prime-gold/50 hover:scale-105 transform">
              Explore Properties
            </a>
            <a href="/contact" className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-prime-950 transition-all duration-300 font-semibold text-lg">
              Book a Call
            </a>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-float">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};