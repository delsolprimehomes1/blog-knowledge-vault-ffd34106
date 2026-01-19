import React from 'react';
import { CheckCircle2, FileText, Building2, CreditCard, Users, Shield, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

const checklistItems = [
  {
    icon: FileText,
    title: 'NIE Number',
    description: 'Your Spanish tax identification number - required for all financial transactions',
    status: 'essential',
    timeline: '1-2 weeks',
    tips: ['Apply at Spanish consulate or in Spain', 'Bring passport and proof of reason (property interest letter)']
  },
  {
    icon: Building2,
    title: 'Spanish Bank Account',
    description: 'Required for paying taxes, utilities, and community fees',
    status: 'essential',
    timeline: '1 week',
    tips: ['Many banks offer non-resident accounts', 'Bring NIE, passport, proof of address, and proof of income']
  },
  {
    icon: CreditCard,
    title: 'Proof of Funds',
    description: 'Bank statements showing sufficient funds for purchase and costs',
    status: 'essential',
    timeline: 'Immediate',
    tips: ['Last 6 months of statements', 'Include investment accounts if applicable']
  },
  {
    icon: Users,
    title: 'Power of Attorney (Optional)',
    description: 'Allows a representative to act on your behalf if you cannot attend completion',
    status: 'optional',
    timeline: '1-2 days',
    tips: ['Must be notarized', 'Can be done at Spanish consulate abroad']
  },
  {
    icon: Shield,
    title: 'Independent Lawyer',
    description: 'Essential for protecting your interests throughout the purchase',
    status: 'essential',
    timeline: 'Before making offer',
    tips: ['Choose English-speaking property specialist', 'Should be independent from seller/agent']
  }
];

const dueDiligenceChecks = [
  'Verify seller owns the property (Nota Simple from Land Registry)',
  'Check for outstanding debts or mortgages on property',
  'Confirm property is free of legal charges or embargoes',
  'Verify building/planning licenses are in order',
  'Check First Occupation License (for new builds)',
  'Confirm community fees are up to date',
  'Review IBI (property tax) receipts',
  'Check for any pending urban planning actions',
  'Verify exact boundaries match cadastral records',
  'Review energy performance certificate'
];

export const LegalChecklist: React.FC = () => {
  return (
    <section id="legal" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20 reveal-on-scroll">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-6">
            <FileText className="w-4 h-4 text-prime-gold" />
            <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase">Legal Requirements</span>
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
            Your Legal Checklist
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to prepare before and during your property purchase in Spain.
          </p>
        </div>

        {/* Requirements Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {checklistItems.map((item, index) => (
            <div
              key={index}
              className="reveal-on-scroll group relative bg-card rounded-3xl overflow-hidden border hover:border-prime-gold/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-prime-gold/0 via-prime-gold/5 to-prime-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Status Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                  item.status === 'essential' 
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                    : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                }`}>
                  {item.status}
                </span>
              </div>

              <div className="relative p-6">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-prime-gold/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-prime-gold/20 transition-all duration-300">
                  <item.icon className="w-8 h-8 text-prime-gold" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3 pr-20">{item.title}</h3>
                <p className="text-muted-foreground mb-5">{item.description}</p>

                {/* Timeline */}
                <div className="flex items-center gap-2 mb-5 p-3 bg-muted/50 rounded-xl">
                  <Clock className="w-4 h-4 text-prime-gold" />
                  <span className="text-sm text-muted-foreground">Timeline:</span>
                  <span className="text-sm font-semibold text-prime-gold">{item.timeline}</span>
                </div>

                {/* Tips */}
                <div className="border-t pt-5">
                  <p className="text-xs font-semibold text-prime-gold uppercase tracking-wide mb-3">Pro Tips</p>
                  <ul className="space-y-2">
                    {item.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Due Diligence Section */}
        <div className="reveal-on-scroll">
          <div className="relative overflow-hidden bg-prime-900 rounded-3xl p-8 md:p-12">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-prime-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl" />
            
            {/* Animated border */}
            <div className="absolute inset-0 rounded-3xl border-2 border-prime-gold/20" />
            
            <div className="relative">
              <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
                <div className="w-16 h-16 rounded-2xl bg-prime-gold/20 border border-prime-gold/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-8 h-8 text-prime-gold" />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">
                    Due Diligence Checklist
                  </h3>
                  <p className="text-white/70 text-lg max-w-2xl">
                    Your lawyer should verify all of the following before you sign any contracts. 
                    This protects you from potential issues and hidden problems.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {dueDiligenceChecks.map((check, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-4 p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-prime-gold/30 transition-all duration-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-prime-gold/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle2 className="w-5 h-5 text-prime-gold" />
                    </div>
                    <span className="text-white/90 leading-relaxed">{check}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-10 pt-8 border-t border-white/10 text-center">
                <p className="text-white/60 mb-4">Need help finding a trusted lawyer?</p>
                <a 
                  href="/#contact"
                  className="inline-flex items-center gap-2 text-prime-gold font-semibold hover:gap-3 transition-all duration-300"
                >
                  Get Our Recommended Legal Partners
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
