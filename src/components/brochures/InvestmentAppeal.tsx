import React from 'react';
import { TrendingUp, Shield, Globe, Building2, Banknote, Users } from 'lucide-react';
import { CityBrochureData } from '@/constants/brochures';
import { useTranslation } from '@/i18n';

interface InvestmentAppealProps {
  city: CityBrochureData;
}

export const InvestmentAppeal: React.FC<InvestmentAppealProps> = ({ city }) => {
  const { t } = useTranslation();
  const brochureT = t.brochures?.[city.slug as keyof typeof t.brochures] || t.brochures?.marbella;

  const investmentPoints = [
    {
      icon: TrendingUp,
      title: brochureT?.investment?.points?.[0]?.title || 'Strong Capital Growth',
      description: brochureT?.investment?.points?.[0]?.description || 'Consistent appreciation in premium locations with proven track record.',
    },
    {
      icon: Banknote,
      title: brochureT?.investment?.points?.[1]?.title || 'Rental Income Potential',
      description: brochureT?.investment?.points?.[1]?.description || 'High-yield opportunities in the tourist and long-term rental market.',
    },
    {
      icon: Globe,
      title: brochureT?.investment?.points?.[2]?.title || 'International Demand',
      description: brochureT?.investment?.points?.[2]?.description || 'Buyers from across Europe and beyond ensure sustained market liquidity.',
    },
    {
      icon: Shield,
      title: brochureT?.investment?.points?.[3]?.title || 'Legal Security',
      description: brochureT?.investment?.points?.[3]?.description || 'Spanish property law protects buyers with clear title and guarantees.',
    },
    {
      icon: Building2,
      title: brochureT?.investment?.points?.[4]?.title || 'New-Build Quality',
      description: brochureT?.investment?.points?.[4]?.description || 'Modern construction with 10-year structural warranties and energy efficiency.',
    },
    {
      icon: Users,
      title: brochureT?.investment?.points?.[5]?.title || 'Expert Guidance',
      description: brochureT?.investment?.points?.[5]?.description || 'API-accredited advisors guide you through every step of the process.',
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-prime-950 text-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-prime-gold rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-prime-gold rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <span className="inline-block text-prime-gold font-nav text-sm tracking-wider uppercase mb-4">
            {brochureT?.investment?.eyebrow || 'Investment Opportunity'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {brochureT?.investment?.headline || `Why Investors Choose ${city.name}`}
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            {brochureT?.investment?.description || 
              `${city.name} combines lifestyle appeal with solid investment fundamentals. Discover why discerning buyers consistently choose this exceptional destination.`
            }
          </p>
        </div>

        {/* Investment Points Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {investmentPoints.map((point, index) => (
            <div
              key={index}
              className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-prime-gold/50 hover:bg-white/10 transition-all duration-300 reveal-on-scroll"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-prime-gold/20 flex items-center justify-center mb-6 group-hover:bg-prime-gold/30 transition-colors">
                <point.icon className="w-7 h-7 text-prime-gold" />
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-prime-gold transition-colors">
                {point.title}
              </h3>
              <p className="text-white/60 leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Tagline */}
        <div className="mt-16 text-center reveal-on-scroll">
          <p className="text-white/50 text-sm font-nav tracking-wider uppercase">
            API-Accredited • 35+ Years Experience • Multilingual Support
          </p>
        </div>
      </div>
    </section>
  );
};
