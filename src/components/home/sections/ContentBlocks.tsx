import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { Shield, Award, Brain, FileCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../i18n';

export const MiniAbout: React.FC = () => {
  const { t, currentLanguage } = useTranslation();
  
  return (
    <Section background="light" className="pt-24 md:pt-32">
      <div className="max-w-5xl mx-auto text-center reveal-on-scroll animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-prime-900 mb-6 md:mb-8 leading-tight tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          {t.miniAbout.headline} <span className="text-prime-gold underline decoration-prime-gold/30 underline-offset-8">{t.miniAbout.headlineHighlight}</span>
        </h2>
        <p className="text-slate-600 text-base md:text-lg lg:text-xl leading-relaxed mb-8 md:mb-10 max-w-4xl mx-auto font-light" style={{ letterSpacing: '0.01em', lineHeight: '1.75' }}>
          {t.miniAbout.paragraph1}
        </p>
        <p className="text-slate-600 text-base md:text-lg lg:text-xl leading-relaxed mb-8 md:mb-10 max-w-4xl mx-auto font-light" style={{ letterSpacing: '0.01em', lineHeight: '1.75' }}>
          {t.miniAbout.paragraph2}
        </p>
        
        <div>
          <Link to={`/${currentLanguage}/about`}>
            <Button variant="outline" className="group">
              {t.miniAbout.cta} <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
};

export const USPSection: React.FC = () => {
  const { t } = useTranslation();
  
  const usps = [
    { Icon: Shield },
    { Icon: Award },
    { Icon: Brain },
    { Icon: FileCheck }
  ];

  return (
    <Section background="white" id="usps" className="relative">
      <div className="text-center mb-16 reveal-on-scroll">
        <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">{t.usps.eyebrow}</span>
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-900">{t.usps.headline}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {t.usps.items.map((item, idx) => (
          <div key={idx} className={`bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200/50 hover:bg-white group reveal-on-scroll stagger-${idx + 1}`}>
            <div className="mb-6 md:mb-8 bg-white w-14 h-14 md:w-16 md:h-16 rounded-2xl rotate-3 flex items-center justify-center group-hover:bg-prime-900 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 shadow-sm">
              <div className="text-prime-gold group-hover:text-white transition-colors duration-500">
                {React.createElement(usps[idx].Icon, { className: "w-7 h-7 md:w-8 md:h-8" })}
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-prime-900 mb-3 md:mb-4 group-hover:text-prime-goldDark transition-colors tracking-tight">{item.title}</h3>
            <p className="text-slate-600 leading-relaxed text-sm font-light" style={{ lineHeight: '1.75' }}>{item.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
};
