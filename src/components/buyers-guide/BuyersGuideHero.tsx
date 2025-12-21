import React from 'react';
import { Clock, MapPin, Languages, FileCheck } from 'lucide-react';

export const BuyersGuideHero: React.FC = () => {
  const stats = [
    { icon: FileCheck, value: '8', label: 'Simple Steps' },
    { icon: Clock, value: '3-6', label: 'Month Timeline' },
    { icon: MapPin, value: '15+', label: 'Prime Locations' },
    { icon: Languages, value: '10+', label: 'Languages' },
  ];

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-prime-900">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/assets/costa-del-sol-bg.jpg)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-prime-900/80 via-prime-900/60 to-prime-900/90" />
      </div>

      {/* Animated Particles */}
      <div className="particles-bg">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/20 border border-prime-gold/30 rounded-full mb-6 backdrop-blur-sm">
          <span className="text-prime-gold text-sm font-medium tracking-wide uppercase">
            Your Complete Resource
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight tracking-tight speakable-summary">
          The Complete Guide to Buying Property on the{' '}
          <span className="text-gradient-gold">Costa del Sol</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed">
          Everything you need to know about purchasing your dream home in Spain's most desirable region. 
          From legal requirements to hidden costs—we've got you covered.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="glass-dark rounded-2xl p-6 border border-white/10 hover:border-prime-gold/30 transition-all duration-300 group"
            >
              <stat.icon className="w-8 h-8 text-prime-gold mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-prime-gold rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
};
