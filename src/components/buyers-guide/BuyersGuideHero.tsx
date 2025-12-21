import React, { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Languages, FileCheck } from 'lucide-react';

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
      // Parse the value - handle ranges like "3-6" and numbers with suffixes like "15+"
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

      // Animate the number
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const animate = () => {
        currentStep++;
        const progress = currentStep / steps;
        // Ease out expo
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
      className="absolute rounded-full bg-prime-gold/40"
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
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const stats = [
    { icon: FileCheck, value: '8', label: 'Simple Steps', delay: 0 },
    { icon: Clock, value: '3-6', label: 'Month Timeline', delay: 100 },
    { icon: MapPin, value: '15+', label: 'Prime Locations', delay: 200 },
    { icon: Languages, value: '10+', label: 'Languages', delay: 300 },
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

  return (
    <section 
      ref={heroRef}
      className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-prime-900"
    >
      {/* Background Image with Ken Burns Effect */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${isVisible ? 'animate-ken-burns' : ''}`}
        style={{ backgroundImage: 'url(/assets/costa-del-sol-bg.jpg)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-prime-900/70 via-prime-900/50 to-prime-900/90" />
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-prime-gold/10 via-transparent to-prime-gold/5 animate-gradient-shift" 
          style={{ backgroundSize: '200% 200%' }}
        />
      </div>

      {/* Floating Particles */}
      <div className="particles-bg">
        {[...Array(30)].map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Main Headline */}
        <h1 
          className={`text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-white mb-8 leading-tight tracking-tight
            ${isVisible ? 'animate-hero-title-reveal' : 'opacity-0'}`}
          style={{ animationDelay: '200ms' }}
        >
          <span className="block speakable-summary">The Complete Guide to Buying Property on the</span>
          <span 
            className="block mt-2 bg-gradient-to-r from-prime-gold via-prime-goldLight to-prime-gold bg-[length:200%_auto] animate-text-shimmer"
            style={{ 
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Costa del Sol
          </span>
        </h1>

        {/* Subheadline */}
        <p 
          className={`text-lg md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto mb-16 leading-relaxed
            ${isVisible ? 'animate-hero-title-reveal' : 'opacity-0'}`}
          style={{ animationDelay: '400ms' }}
        >
          Everything you need to know about purchasing your dream home in Spain's most desirable region. 
          From legal requirements to hidden costs—we've got you covered.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group relative glass-dark rounded-2xl p-6 md:p-8 border border-white/10 
                hover:border-prime-gold/50 transition-all duration-500 cursor-default
                ${isVisible ? 'animate-stat-card-enter' : 'opacity-0'}
                hover:animate-glow-border-pulse hover:-translate-y-2 hover:shadow-2xl hover:shadow-prime-gold/20`}
              style={{ animationDelay: `${600 + stat.delay}ms` }}
            >
              {/* Icon with glow */}
              <div className="relative mb-4">
                <stat.icon 
                  className="w-10 h-10 md:w-12 md:h-12 text-prime-gold mx-auto transition-all duration-500
                    group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(197,160,89,0.6)]" 
                />
                <div className="absolute inset-0 bg-prime-gold/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              {/* Animated Number */}
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 font-serif">
                <AnimatedCounter 
                  value={stat.value} 
                  delay={800 + stat.delay}
                  isVisible={isVisible}
                />
              </div>

              {/* Label */}
              <div className="text-sm md:text-base text-slate-400 font-medium group-hover:text-slate-300 transition-colors duration-300">
                {stat.label}
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-prime-gold/0 via-prime-gold/5 to-prime-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div 
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ animationDelay: '1200ms' }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-widest">Scroll to explore</span>
            <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-2 hover:border-prime-gold/50 transition-colors duration-300">
              <div className="w-1.5 h-3 bg-prime-gold rounded-full animate-scroll-indicator" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
