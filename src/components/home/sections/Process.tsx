import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { Phone, Search, FileText, Plane, Key } from 'lucide-react';
import { useTranslation } from '../../../i18n';

export const Process: React.FC = () => {
  const { t } = useTranslation();
  
  const icons = [Phone, Search, FileText, Plane, Key];

  return (
    <Section background="white" className="relative overflow-hidden py-24 md:py-32">
      <div className="text-center mb-16 md:mb-20 reveal-on-scroll animate-fade-in-down">
        <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">{t.process.eyebrow}</span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-prime-900 leading-tight tracking-tight" style={{ letterSpacing: '-0.02em' }}>{t.process.headline}</h2>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Connecting Line (Desktop) */}
        <div className="hidden lg:block absolute top-10 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
        <div className="hidden lg:block absolute top-10 left-0 w-0 h-0.5 bg-prime-gold transition-all duration-[2s] ease-out reveal-on-scroll visible:w-full -z-0"></div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:gap-12 lg:gap-8 relative z-10">
          {t.process.steps.map((step, idx) => {
            const Icon = icons[idx];
            return (
              <div key={idx} className={`flex flex-col items-center text-center group reveal-on-scroll stagger-${idx + 1}`}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center mb-6 md:mb-8 shadow-lg group-hover:border-prime-gold/30 group-hover:scale-110 transition-all duration-500 relative">
                   <div className="absolute inset-0 bg-prime-gold/5 rounded-full scale-0 group-hover:scale-100 animate-glow-pulse transition-transform duration-500"></div>
                  
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-prime-900 group-hover:text-prime-gold transition-colors duration-300" />
                  
                  {/* Step Number Badge */}
                  <div className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 bg-prime-900 text-prime-gold rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-2 border-white group-hover:scale-110 transition-transform duration-300">
                    {idx + 1}
                  </div>
                </div>
                
                <div className="bg-white lg:bg-transparent p-5 md:p-6 lg:p-0 rounded-2xl border border-slate-100 lg:border-none shadow-sm lg:shadow-none w-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <h3 className="text-base md:text-lg font-bold text-prime-900 mb-2 md:mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-light" style={{ lineHeight: '1.75' }}>{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-20 text-center reveal-on-scroll">
        <Link to="/buyers-guide">
          <Button variant="primary">{t.process.cta}</Button>
        </Link>
      </div>
    </Section>
  );
};
