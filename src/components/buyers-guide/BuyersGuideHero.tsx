import React, { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Languages, FileCheck } from 'lucide-react';
import heroImage from '@/assets/buyers-guide/hero-coastline.jpg';
import { useBuyersGuideTranslation } from '@/hooks/useBuyersGuideTranslation';

// Animated counter component
const AnimatedCounter: React.FC<{
  value: string;
  delay?: number;
  isVisible: boolean;
}> = ({ value, delay = 0, isVisible }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!isVisible || hasAnimated) return;

    const timer = setTimeout(() => {
      const rangeMatch = value.match(/^(\d+)-(\d+)$/);
      const numberMatch = value.match(/^(\d+)(.*)$/);
      
      let endNumber: number;
      let suffix = '';
      
      if (rangeMatch) {
        endNumber = parseInt(rangeMatch[1]);
        suffix = `-${rangeMatch[2]}`;
      } else if (numberMatch) {
        endNumber = parseInt(numberMatch[1]);
        suffix = numberMatch[2] || '';
      } else {
        setDisplayValue(value);
        setHasAnimated(true);
        return;
      }

      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const animate = () => {
        currentStep++;
        const progress = currentStep / steps;
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentValue = Math.round(endNumber * easeProgress);
        
        setDisplayValue(`${currentValue}${suffix}`);

        if (currentStep < steps) {
          requestAnimationFrame(() => setTimeout(animate, stepDuration));
        } else {
          setDisplayValue(`${endNumber}${suffix}`);
          setHasAnimated(true);
        }
      };

      animate();
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, value, delay, hasAnimated]);

  return (
    <span className={`inline-block transition-transform duration-300 ${hasAnimated ? 'animate-counter-pop' : ''}`}>
      {displayValue}
    </span>
  );
};

// Floating particle component
const FloatingParticle: React.FC<{
  index: number;
}> = ({ index }) => {
  const size = 2 + Math.random() * 4;
  const left = Math.random() * 100;
  const top = Math.random() * 100;
  const delay = index * 0.5;
  const duration = 6 + Math.random() * 4;

  return (
    <div
      className="absolute rounded-full bg-prime-gold/30"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${left}%`,
        top: `${top}%`,
        animation: `float-particle ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
};

export const BuyersGuideHero: React.FC = () => {
  const { t } = useBuyersGuideTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  const stats = [
    { icon: FileCheck, value: t.hero.stats.steps.value, label: t.hero.stats.steps.label, delay: 0 },
    { icon: Clock, value: t.hero.stats.timeline.value, label: t.hero.stats.timeline.label, delay: 100 },
    { icon: MapPin, value: t.hero.stats.locations.value, label: t.hero.stats.locations.label, delay: 200 },
    { icon: Languages, value: t.hero.stats.languages.value, label: t.hero.stats.languages.label, delay: 300 },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section 
      ref={heroRef}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-100"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          transform: `translateY(${scrollY * 0.3}px) scale(1.1)`,
        }}
      >
        {/* Multi-layer gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-prime-900/80 via-prime-900/40 to-prime-900/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-prime-900/60 via-transparent to-prime-900/60" />
        
        {/* Animated golden shimmer overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-prime-gold/10 via-transparent to-prime-gold/5 animate-gradient-shift" 
          style={{ backgroundSize: '200% 200%' }}
        />
        
        {/* Vignette effect */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Floating Particles */}
      <div className="particles-bg">
        {[...Array(40)].map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-prime-gold/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Badge */}
        <div 
          className={`inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8
            ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ animationDelay: '100ms' }}
        >
          <span className="w-2 h-2 bg-prime-gold rounded-full animate-pulse" />
          <span className="text-white/90 text-sm font-medium tracking-wide">{t.hero.badge}</span>
        </div>

        {/* Main Headline */}
        <h1 
          className={`text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-white mb-8 leading-tight tracking-tight
            ${isVisible ? 'animate-hero-title-reveal' : 'opacity-0'}`}
          style={{ animationDelay: '200ms' }}
        >
          <span className="block speakable-summary">{t.hero.headline}</span>
          <span 
            className="block mt-3 bg-gradient-to-r from-prime-gold via-prime-goldLight to-prime-gold bg-[length:200%_auto] animate-text-shimmer"
            style={{ 
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {t.hero.headlineHighlight}
          </span>
        </h1>

        {/* Subheadline */}
        <p 
          className={`text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-16 leading-relaxed
            ${isVisible ? 'animate-hero-title-reveal' : 'opacity-0'}`}
          style={{ animationDelay: '400ms' }}
        >
          {t.hero.subheadline}
        </p>

        {/* Stats Grid with Glassmorphism */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group relative rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-white/10 border border-white/20
                hover:bg-white/15 hover:border-prime-gold/40 transition-all duration-500 cursor-default
                ${isVisible ? 'animate-stat-card-enter' : 'opacity-0'}
                hover:-translate-y-3 hover:shadow-2xl hover:shadow-prime-gold/20`}
              style={{ animationDelay: `${600 + stat.delay}ms` }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-prime-gold/0 via-prime-gold/10 to-prime-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              
              {/* Icon with enhanced glow */}
              <div className="relative mb-4">
                <stat.icon 
                  className="w-10 h-10 md:w-12 md:h-12 text-prime-gold mx-auto transition-all duration-500
                    group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(197,160,89,0.8)]" 
                />
                <div className="absolute inset-0 bg-prime-gold/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Animated Number */}
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 font-serif relative z-10">
                <AnimatedCounter 
                  value={stat.value} 
                  delay={800 + stat.delay}
                  isVisible={isVisible}
                />
              </div>

              {/* Label */}
              <div className="text-sm md:text-base text-white/70 font-medium group-hover:text-white/90 transition-colors duration-300 relative z-10">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div 
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ animationDelay: '1200ms' }}
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs text-white/50 uppercase tracking-widest font-medium">{t.hero.scrollText}</span>
            <div className="w-7 h-12 border-2 border-white/30 rounded-full flex items-start justify-center p-2 hover:border-prime-gold/60 transition-colors duration-300">
              <div className="w-1.5 h-3 bg-prime-gold rounded-full animate-scroll-indicator" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
