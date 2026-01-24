import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Users, Star } from 'lucide-react';
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
          className={`absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
          onCanPlay={() => setVideoLoaded(true)}
        >
          <source src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/692d1c5b82f4c5ebf1442f43.mp4" type="video/mp4" />
        </video>
        {/* No overlay - full video brightness */}
      </div>

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center pt-24 md:pt-32 pb-32 md:pb-40">
        
        {/* Trust Line */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-10 reveal-on-scroll [text-shadow:_0_0_8px_rgb(0_0_0),_0_0_20px_rgb(0_0_0_/_80%),_0_2px_4px_rgb(0_0_0)]">
          <div className="flex items-center gap-2 text-white text-xs md:text-sm font-medium tracking-wide">
             <ShieldCheck size={16} className="text-prime-gold drop-shadow-lg" />
             <span>{t.hero.trustBadges.api}</span>
          </div>
          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-prime-gold/50"></span>
          <div className="flex items-center gap-2 text-white text-xs md:text-sm font-medium tracking-wide">
             <Star size={16} className="text-prime-gold drop-shadow-lg" />
             <span>{t.hero.trustBadges.experience}</span>
          </div>
          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-prime-gold/50"></span>
          <div className="flex items-center gap-2 text-white text-xs md:text-sm font-medium tracking-wide">
             <Users size={16} className="text-prime-gold drop-shadow-lg" />
             <span>{t.hero.trustBadges.buyers}</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-8 leading-[1.05] tracking-tight max-w-6xl reveal-on-scroll stagger-1 animate-zoom-in [text-shadow:_0_0_10px_rgb(0_0_0),_0_0_30px_rgb(0_0_0),_0_0_60px_rgb(0_0_0_/_80%),_0_4px_4px_rgb(0_0_0)]" style={{ letterSpacing: '-0.02em' }}>
          {t.hero.headline} <br className="hidden md:block" />
          <span className="text-prime-gold italic pr-2 [text-shadow:_0_0_15px_rgb(0_0_0),_0_0_30px_rgb(0_0_0),_0_4px_4px_rgb(0_0_0)]">{t.hero.headlineHighlight}</span>
        </h1>

        {/* Subheadline */}
         <div className="mb-8 md:mb-10 reveal-on-scroll stagger-2 animate-fade-in-up [text-shadow:_0_0_8px_rgb(0_0_0),_0_0_20px_rgb(0_0_0),_0_2px_4px_rgb(0_0_0)]">
            <span className="inline-block text-xl md:text-2xl lg:text-3xl font-medium text-white border-b border-prime-gold/50 pb-2 mb-4 md:mb-6">
              {t.hero.tagline}
            </span>
            <p className="text-white text-base md:text-lg lg:text-xl max-w-4xl mx-auto font-normal leading-relaxed [text-shadow:_0_0_6px_rgb(0_0_0),_0_0_15px_rgb(0_0_0),_0_1px_3px_rgb(0_0_0)]" style={{ letterSpacing: '0.01em', lineHeight: '1.75' }}>
              {t.hero.description}
            </p>
         </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-5 w-full sm:w-auto reveal-on-scroll stagger-4 animate-slide-in-left">
          <Button variant="secondary" size="lg" className="shadow-2xl shadow-prime-gold/30 min-w-[200px] md:min-w-[240px]">
            {t.hero.ctaPrimary}
          </Button>
          <Button variant="outline" size="lg" className="border-white/50 text-white hover:bg-white hover:text-prime-900 backdrop-blur-md bg-black/20 shadow-[0_0_20px_rgb(0_0_0_/_40%)] min-w-[200px] md:min-w-[240px]">
            {t.hero.ctaSecondary}
          </Button>
        </div>
      </div>
    </div>
  );
};
