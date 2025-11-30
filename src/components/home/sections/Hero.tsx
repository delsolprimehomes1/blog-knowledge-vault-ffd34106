import React from 'react';
import { ShieldCheck, Users, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { Language } from '../../../types/home';

interface HeroProps {
  lang: Language;
}

export const Hero: React.FC<HeroProps> = ({ lang }) => {
  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed scale-105"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/50 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center pt-24 md:pt-32 pb-40">
        
        {/* Trust Line */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-10 reveal-on-scroll">
          <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium tracking-wide">
             <ShieldCheck size={16} className="text-prime-gold" />
             <span>API-accredited team</span>
          </div>
          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-prime-gold/50"></span>
          <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium tracking-wide">
             <Star size={16} className="text-prime-gold" />
             <span>35+ years combined experience</span>
          </div>
          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-prime-gold/50"></span>
          <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium tracking-wide">
             <Users size={16} className="text-prime-gold" />
             <span>Hundreds of guided buyers</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-[1.1] max-w-6xl drop-shadow-2xl reveal-on-scroll stagger-1">
          Find Your New-Build Home on the <br className="hidden md:block" />
          <span className="text-gradient-gold italic pr-2">Costa del Sol</span>
        </h1>

        {/* Subheadline */}
         <div className="mb-10 reveal-on-scroll stagger-2">
            <span className="inline-block text-2xl md:text-3xl lg:text-4xl font-light text-white/90 border-b border-prime-gold/50 pb-2 mb-6">
              Safely. Transparently. In Your Language.
            </span>
            <p className="text-slate-300 text-lg md:text-xl max-w-4xl mx-auto font-light leading-relaxed">
              DelSolPrimeHomes guides international buyers through high-quality new-build and off-plan real estate from Málaga to Sotogrande — with API-accredited advisors, 35+ years of combined experience, and advanced AI tools to help you make the right decision.
            </p>
         </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto reveal-on-scroll stagger-4">
          <Button variant="secondary" size="lg" className="shadow-2xl shadow-prime-gold/20 min-w-[240px]">
            Start Your Property Search
          </Button>
          <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-prime-900 backdrop-blur-sm min-w-[240px]">
            Book a Call With an Advisor
          </Button>
        </div>
      </div>
    </div>
  );
};