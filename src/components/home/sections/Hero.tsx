import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from '../../../i18n';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop"
          className="absolute inset-0 w-full h-full object-cover scale-110"
        >
          <source src="https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/692ced3382f4c567c43c328f.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-900/50 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center pt-24 md:pt-32 pb-32 md:pb-40">
        
        {/* Trust Line */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-10 reveal-on-scroll">
          <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium tracking-wide">
             <ShieldCheck size={16} className="text-prime-gold" />
             <span>{t.hero.trustBadges.api}</span>
          </div>
          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-prime-gold/50"></span>
          <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium tracking-wide">
             <Star size={16} className="text-prime-gold" />
             <span>{t.hero.trustBadges.experience}</span>
          </div>
          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-prime-gold/50"></span>
          <div className="flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium tracking-wide">
             <Users size={16} className="text-prime-gold" />
             <span>{t.hero.trustBadges.buyers}</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-8 leading-[1.05] tracking-tight max-w-6xl drop-shadow-2xl reveal-on-scroll stagger-1 animate-zoom-in" style={{ letterSpacing: '-0.02em' }}>
          {t.hero.headline} <br className="hidden md:block" />
          <span className="text-gradient-gold italic pr-2">{t.hero.headlineHighlight}</span>
        </h1>

        {/* Subheadline */}
         <div className="mb-8 md:mb-10 reveal-on-scroll stagger-2 animate-fade-in-up">
            <span className="inline-block text-xl md:text-2xl lg:text-3xl font-light text-white/90 border-b border-prime-gold/50 pb-2 mb-4 md:mb-6">
              {t.hero.tagline}
            </span>
            <p className="text-slate-300 text-base md:text-lg lg:text-xl max-w-4xl mx-auto font-light leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.75' }}>
              {t.hero.description}
            </p>
         </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-5 w-full sm:w-auto reveal-on-scroll stagger-4 animate-slide-in-left">
          <Button variant="secondary" size="lg" className="shadow-2xl shadow-prime-gold/20 min-w-[200px] md:min-w-[240px]">
            {t.hero.ctaPrimary}
          </Button>
          <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-prime-900 backdrop-blur-sm min-w-[200px] md:min-w-[240px]">
            {t.hero.ctaSecondary}
          </Button>
        </div>
      </div>
    </div>
  );
};
