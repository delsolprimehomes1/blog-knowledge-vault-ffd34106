import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MessageCircle, Play, Pause, Shield, Award, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_DISPLAY, COMPANY_FACTS, COMPANY_CONTACT } from '@/constants/company';
import { useTranslation } from '@/i18n';

interface BrochureHeroProps {
  city: {
    id?: string;
    slug: string;
    name: string;
    heroImage: string;
    heroVideoUrl?: string | null;
    hero_headline?: string | null;
    hero_subtitle?: string | null;
  };
  onViewBrochure?: () => void;
  onChat?: () => void;
}

export const BrochureHero: React.FC<BrochureHeroProps> = ({ 
  city, 
  onViewBrochure,
  onChat,
}) => {
  const { t, currentLanguage } = useTranslation();
  const ui = (t.brochures as any)?.ui || {};
  
  const headline = city.hero_headline || `Luxury Living in ${city.name}`;
  const subtitle = city.hero_subtitle || 'Where Luxury Meets the Mediterranean';
  const hasVideo = !!city.heroVideoUrl;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Build trust signals with translations
  const TRUST_SIGNALS = [
    { icon: Shield, text: ui.apiRegistered || 'API Registered' },
    { icon: Award, text: (ui.yearsExperience || '{years}+ Years Experience').replace('{years}', String(COMPANY_FACTS.yearsExperience)) },
    { icon: Users, text: (ui.happyBuyers || '{count}+ Happy Buyers').replace('{count}', String(COMPANY_FACTS.happyClients)) },
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' });
  };

  const handleWhatsAppClick = () => {
    // Track WhatsApp click
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'whatsapp_click', { 
        category: 'Contact', 
        location: 'brochure_hero',
        city: city.name
      });
    }
  };

  return (
    <section className="brochure-hero relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 w-full h-[120%] -top-[10%] bg-cover bg-center transform transition-transform duration-1000"
          style={{ 
            backgroundImage: `url(${city.heroImage})`,
            transform: isLoaded ? 'scale(1.05)' : 'scale(1.1)'
          }}
        />
        {/* Gradient Overlays for Depth */}
        <div className="absolute inset-0 bg-prime-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-prime-950 via-prime-950/40 to-prime-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-prime-950/70 via-transparent to-prime-950/30" />
        
        {/* Animated Particles/Dots */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(212, 175, 55, 0.3) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }} />
        </div>
      </div>

      {/* Trust Signals Bar - Top (hidden on mobile to avoid overlap) */}
      <div className={`absolute top-24 left-0 right-0 z-20 transition-all duration-700 hidden md:block ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-10">
            {TRUST_SIGNALS.map((signal, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-white/80 text-sm font-nav"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <signal.icon size={16} className="text-prime-gold" />
                <span>{signal.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className={`absolute top-20 md:top-36 left-0 right-0 z-20 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-white/60">
            <Link to={`/${currentLanguage}`} className="hover:text-white transition-colors">
              {ui.home || 'Home'}
            </Link>
            <ChevronRight size={14} />
            <Link to={`/${currentLanguage}/properties`} className="hover:text-white transition-colors">
              {ui.locations || 'Locations'}
            </Link>
            <ChevronRight size={14} />
            <span className="text-prime-gold font-medium">{city.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 text-center pt-32 md:pt-48 pb-24 md:pb-32">
        {/* Eyebrow Badge */}
        <div className={`mb-8 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-prime-gold/10 border border-prime-gold/30 rounded-full text-prime-goldLight text-sm font-nav tracking-wider uppercase backdrop-blur-sm">
            <span className="w-2 h-2 bg-prime-gold rounded-full animate-pulse" />
            {ui.costaDelSolSpain || 'Costa del Sol, Spain'}
          </span>
        </div>

        {/* Headline with Animated Reveal */}
        <h1 className={`font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="block">{headline}</span>
        </h1>

        {/* Subtitle with Decorative Elements */}
        <div className={`max-w-3xl mx-auto mb-10 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-prime-gold/50" />
            <span className="text-prime-gold text-lg">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-prime-gold/50" />
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-light text-white/90 font-serif italic">
            {subtitle}
          </p>
        </div>

        {/* Video Player - Magazine Style */}
        {hasVideo && (
          <div className={`max-w-4xl mx-auto mb-12 transition-all duration-1000 delay-600 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 group">
              {/* Video Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-prime-gold/30 via-white/10 to-prime-gold/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative bg-black rounded-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  src={city.heroVideoUrl!}
                  poster={city.heroImage}
                  className="w-full aspect-video object-cover"
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
                
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                >
                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-prime-gold/90 hover:bg-prime-gold flex items-center justify-center shadow-2xl shadow-prime-gold/30 transition-all duration-300 hover:scale-110 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                    {isPlaying ? (
                      <Pause className="w-8 h-8 md:w-10 md:h-10 text-prime-950" />
                    ) : (
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-prime-950 ml-1" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto max-w-md mx-auto sm:max-w-none transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Button
            onClick={onViewBrochure}
            size="lg"
            className="group bg-prime-gold hover:bg-prime-goldDark text-prime-950 font-nav font-semibold px-6 sm:px-10 py-5 sm:py-7 text-sm sm:text-base shadow-2xl shadow-prime-gold/30 hover:shadow-prime-gold/50 transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto"
          >
            <span>{ui.downloadBrochure || 'Download Brochure'}</span>
            <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
          </Button>
          <a
            href={COMPANY_CONTACT.whatsappWithMessage(`Hi, I'm interested in properties in ${city.name}. Can you help?`)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="w-full sm:w-auto"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-white/30 bg-white/5 text-white hover:bg-white hover:text-prime-950 backdrop-blur-sm font-nav font-semibold px-6 sm:px-10 py-5 sm:py-7 text-sm sm:text-base transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto"
            >
              <MessageCircle className="mr-2" size={18} />
              <span>{ui.speakWithExpert || 'Speak With Expert'}</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button 
        onClick={scrollToContent}
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-20 transition-all duration-1000 delay-1000 hover:scale-110 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors">
          <span className="text-xs font-nav tracking-widest uppercase">{ui.explore || 'Explore'}</span>
          <div className="w-8 h-12 border-2 border-current rounded-full flex items-start justify-center p-2">
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </button>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};
