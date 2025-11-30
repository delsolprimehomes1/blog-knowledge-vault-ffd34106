import React from 'react';
import { Shield, Award, Users, TrendingUp } from 'lucide-react';
import { Section } from '../ui/Section';

export const MiniAbout: React.FC = () => {
  return (
    <Section background="white">
      <div className="text-center max-w-4xl mx-auto reveal-on-scroll">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-950 mb-6">
          Your <span className="text-prime-gold italic">Trusted Partner</span> on the Costa del Sol
        </h2>
        <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
          Founded by three professionals—a Belgian estate agent, a French-speaking legal expert, and a UK property specialist—DelSolPrimeHomes was born from firsthand experience of the frustrations faced by international buyers. We cut through the noise, combining local market expertise with AI-driven property analysis to ensure you find the right home at the right price—clearly, honestly, and in your language.
        </p>
      </div>
    </Section>
  );
};

export const USPSection: React.FC = () => {
  const usps = [
    {
      icon: Shield,
      title: 'API-Accredited Advisors',
      description: 'Licensed real estate professionals registered with the Andalusian Property Institute.'
    },
    {
      icon: Award,
      title: 'AI-Enhanced Valuation',
      description: 'Proprietary algorithms analyze market data to ensure you pay a fair price.'
    },
    {
      icon: Users,
      title: 'Multilingual Support',
      description: 'Guidance available in 10 languages: English, Dutch, French, German, Finnish, Polish, Swedish, Danish, Hungarian, and Norwegian.'
    },
    {
      icon: TrendingUp,
      title: 'Transparent Process',
      description: 'No hidden fees. No surprises. We explain every step, from reservation to keys.'
    }
  ];

  return (
    <Section background="light">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-950 mb-4">
          Why Choose <span className="text-prime-gold italic">DelSolPrimeHomes?</span>
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          More than agents—we're your advocates in the Costa del Sol property market.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {usps.map((usp, index) => (
          <div 
            key={index}
            className={`text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 reveal-on-scroll stagger-${index + 1}`}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-prime-gold/10 rounded-2xl mb-6">
              <usp.icon className="w-8 h-8 text-prime-gold" />
            </div>
            <h3 className="text-xl font-bold text-prime-950 mb-3">{usp.title}</h3>
            <p className="text-slate-600 leading-relaxed">{usp.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
};