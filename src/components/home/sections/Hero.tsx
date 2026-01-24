import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Users, Star, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from '../../../i18n';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const [scrollY, setScrollY] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load video after LCP for better performance - delay increased to prioritize image
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.load();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative z-10 w-full min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        {/* High-priority poster image for LCP */}
        <img
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop"
          alt="Costa del Sol luxury property"
          width={2070}
          height={1380}
          loading="eager"
          decoding="sync"
          className={`absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-700 ${videoLoaded ? 'opacity-0' : 'opacity-100'}`}
          style={{ contentVisibility: 'auto' }}
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop"
          aria-label="Costa del Sol property showcase video"
          className={`absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
          onCanPlay={() => setVideoLoaded(true)}
        >
          <source src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/692d1c5b82f4c5ebf1442f43.mp4" type="video/mp4" />
        </video>
        {/* Subtle gradient overlay for text readability while keeping video visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
      </div>

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center pt-10 md:pt-32 pb-24 md:pb-40">
        
        {/* Trust Badges - Desktop: Pill shapes, Mobile: Compact */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-8 md:mb-12 reveal-on-scroll">
          {/* API Badge */}
          <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm">
            <ShieldCheck size={16} className="text-prime-gold md:w-5 md:h-5" />
            <span className="text-white text-xs md:text-sm font-medium [text-shadow:_0_1px_2px_rgb(0_0_0)]">
              <span className="hidden md:inline">{t.hero.trustBadges.api}</span>
              <span className="md:hidden">{(t.hero as any).trustBadgesMobile?.api || 'API'}</span>
            </span>
          </div>
          
          {/* Experience Badge */}
          <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm">
            <Star size={16} className="text-prime-gold md:w-5 md:h-5" />
            <span className="text-white text-xs md:text-sm font-medium [text-shadow:_0_1px_2px_rgb(0_0_0)]">
              <span className="hidden md:inline">{t.hero.trustBadges.experience}</span>
              <span className="md:hidden">{(t.hero as any).trustBadgesMobile?.experience || '35+'}</span>
            </span>
          </div>
          
          {/* Buyers Badge */}
          <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm">
            <Users size={16} className="text-prime-gold md:w-5 md:h-5" />
            <span className="text-white text-xs md:text-sm font-medium [text-shadow:_0_1px_2px_rgb(0_0_0)]">
              <span className="hidden md:inline">{t.hero.trustBadges.buyers}</span>
              <span className="md:hidden">{(t.hero as any).trustBadgesMobile?.buyers || '500+'}</span>
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 
          className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 leading-[1.1] max-w-[900px] reveal-on-scroll stagger-1 animate-zoom-in [text-shadow:_2px_2px_8px_rgb(0_0_0_/_50%)]" 
          style={{ letterSpacing: '-0.02em' }}
        >
          {t.hero.headline} <br className="hidden md:block" />
          <span className="text-prime-gold italic [text-shadow:_2px_2px_8px_rgb(0_0_0_/_50%)]">
            {t.hero.headlineHighlight}
          </span>
        </h1>

        {/* Tagline - No description, just the tagline */}
        <p 
          className="text-lg md:text-2xl text-white font-normal mb-10 md:mb-12 reveal-on-scroll stagger-2 animate-fade-in-up [text-shadow:_1px_1px_4px_rgb(0_0_0_/_40%)]"
          style={{ letterSpacing: '0.02em' }}
        >
          {t.hero.tagline}
        </p>

        {/* CTAs - Desktop: Side by side, Mobile: Stacked full width */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-[90%] md:w-auto reveal-on-scroll stagger-3 animate-slide-in-left">
          <Button 
            variant="secondary" 
            size="lg" 
            className="h-12 md:h-14 px-6 md:px-8 bg-prime-gold hover:bg-[#C19A2E] text-prime-900 font-semibold rounded-lg shadow-[0_4px_12px_rgb(0_0_0_/_15%)] transition-all duration-300"
          >
            {t.hero.ctaPrimary}
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="h-12 md:h-14 px-6 md:px-8 bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg transition-all duration-300"
          >
            {t.hero.ctaSecondary}
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <ChevronDown size={32} className="text-white/70" />
      </div>
    </div>
  );
};
