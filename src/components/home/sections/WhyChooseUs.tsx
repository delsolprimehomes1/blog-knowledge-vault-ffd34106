import React from 'react';
import { ShieldCheck, Star, Sparkles, Globe } from 'lucide-react';
import { useTranslation } from '../../../i18n';

const benefits = [
  {
    icon: ShieldCheck,
    titleKey: 'apiAccredited',
    descKey: 'apiAccreditedDesc',
    fallbackTitle: 'API-Accredited Advisors',
    fallbackDesc: 'We operate under strict Spanish standards of professionalism, ethics, and legal compliance.',
  },
  {
    icon: Star,
    titleKey: 'experience',
    descKey: 'experienceDesc',
    fallbackTitle: '35+ Years Experience',
    fallbackDesc: 'Our team has helped hundreds of families buy safely in Spain.',
  },
  {
    icon: Sparkles,
    titleKey: 'aiTools',
    descKey: 'aiToolsDesc',
    fallbackTitle: 'AI-Enhanced Selection',
    fallbackDesc: 'Advanced AI tools to match you with the perfect property.',
  },
  {
    icon: Globe,
    titleKey: 'multilingual',
    descKey: 'multilingualDesc',
    fallbackTitle: '10 Languages Supported',
    fallbackDesc: 'Full guidance in English, Dutch, French, German, and 6 more languages.',
  },
];

export const WhyChooseUs: React.FC = () => {
  const { t } = useTranslation();

  // Access whyChooseUs with type safety fallback
  const whyChooseUs = (t as any).whyChooseUs || {};

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block text-prime-gold text-sm font-semibold tracking-wider uppercase mb-3">
            {whyChooseUs.eyebrow || 'Why Choose Us'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {whyChooseUs.headline || 'Why DelSolPrimeHomes?'}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            {t.hero.description}
          </p>
        </div>

        {/* 4-Column Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const title = whyChooseUs.benefits?.[benefit.titleKey] || benefit.fallbackTitle;
            const desc = whyChooseUs.benefitsDesc?.[benefit.descKey] || benefit.fallbackDesc;
            
            return (
              <div 
                key={index}
                className="group text-center p-6 md:p-8 rounded-2xl bg-card border border-border hover:border-prime-gold/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-prime-gold/10 text-prime-gold mb-5 group-hover:bg-prime-gold group-hover:text-prime-900 transition-all duration-300">
                  <Icon size={28} />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
