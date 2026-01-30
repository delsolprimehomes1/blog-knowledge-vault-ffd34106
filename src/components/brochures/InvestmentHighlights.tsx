import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Sun, Home, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface InvestmentStat {
  value: string;
  label: string;
  suffix?: string;
  icon: 'yield' | 'sun' | 'price' | 'growth';
}

interface InvestmentHighlightsProps {
  cityName: string;
  stats?: InvestmentStat[];
}

const ICONS = {
  yield: TrendingUp,
  sun: Sun,
  price: Home,
  growth: BarChart3,
};

const AnimatedNumber: React.FC<{ value: string; suffix?: string; isVisible: boolean }> = ({ 
  value, 
  suffix = '', 
  isVisible 
}) => {
  const [displayValue, setDisplayValue] = useState('0');
  const numericValue = parseFloat(value);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, numericValue);
      
      // Format based on whether it's a decimal or integer
      if (value.includes('.')) {
        setDisplayValue(current.toFixed(1));
      } else {
        setDisplayValue(Math.floor(current).toString());
      }
      
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [isVisible, value, numericValue]);
  
  return (
    <span className="tabular-nums">
      {displayValue}{suffix}
    </span>
  );
};

export const InvestmentHighlights: React.FC<InvestmentHighlightsProps> = ({ 
  cityName, 
  stats
}) => {
  const { t } = useTranslation();
  const ui = (t.brochures as any)?.ui || {};

  const DEFAULT_STATS: InvestmentStat[] = [
    { value: '8.5', suffix: '%', label: ui.rentalYield || 'Rental Yield', icon: 'yield' },
    { value: '320', suffix: '+', label: ui.daysOfSunshine || 'Days of Sunshine', icon: 'sun' },
    { value: '1.2', suffix: 'M€', label: ui.averagePrice || 'Average Price', icon: 'price' },
    { value: '12', suffix: '%', label: ui.valueGrowth || 'Value Growth 2026', icon: 'growth' },
  ];

  const displayStats = stats || DEFAULT_STATS;
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="py-20 md:py-28 bg-prime-950 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--prime-gold)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-prime-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-prime-gold/5 rounded-full blur-2xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 bg-prime-gold/20 border border-prime-gold/30 rounded-full text-prime-goldLight text-sm font-nav tracking-wider uppercase mb-6">
            {ui.investmentPotential || 'Investment Potential'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {(ui.whyInvestIn || 'Why Invest in {city}?').replace('{city}', cityName)}
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            {ui.investmentDescription || "Discover the compelling numbers behind one of Europe's most sought-after property markets."}
          </p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {displayStats.map((stat, index) => {
            const Icon = ICONS[stat.icon] || TrendingUp;
            return (
              <div
                key={index}
                className={`
                  relative group p-6 md:p-8 rounded-2xl
                  bg-white/5 backdrop-blur-sm border border-white/10
                  hover:bg-white/10 hover:border-prime-gold/30
                  transition-all duration-500 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Icon */}
                <div className="mb-4 inline-flex p-3 rounded-xl bg-prime-gold/20 text-prime-gold group-hover:bg-prime-gold group-hover:text-prime-950 transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                
                {/* Value */}
                <div className="text-4xl md:text-5xl font-serif font-bold text-white mb-2 group-hover:text-prime-goldLight transition-colors">
                  <AnimatedNumber 
                    value={stat.value} 
                    suffix={stat.suffix} 
                    isVisible={isVisible}
                  />
                </div>
                
                {/* Label */}
                <div className="text-white/60 font-nav text-sm tracking-wide uppercase">
                  {stat.label}
                </div>
                
                {/* Decorative line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-prime-gold/0 via-prime-gold/50 to-prime-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};