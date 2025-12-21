import React from 'react';
import { CheckCircle2, FileText, Building2, CreditCard, Users, Shield, AlertTriangle } from 'lucide-react';

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
    <section id="legal" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 reveal-on-scroll">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">
            Legal Requirements
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
            Your Legal Checklist
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to prepare before and during your property purchase in Spain.
          </p>
        </div>

        {/* Requirements Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {checklistItems.map((item, index) => (
            <div
              key={index}
              className={`reveal-on-scroll stagger-${(index % 6) + 1} bg-card rounded-3xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}
            >
              {/* Status Badge */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                item.status === 'essential' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {item.status === 'essential' ? 'Essential' : 'Optional'}
              </div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-prime-gold/10 flex items-center justify-center mb-4">
                <item.icon className="w-7 h-7 text-prime-gold" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2 pr-16">{item.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{item.description}</p>

              {/* Timeline */}
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="text-muted-foreground">Timeline:</span>
                <span className="font-medium text-prime-gold">{item.timeline}</span>
              </div>

              {/* Tips */}
              <div className="border-t pt-4">
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
          ))}
        </div>

        {/* Due Diligence Section */}
        <div className="reveal-on-scroll">
          <div className="bg-prime-900 rounded-3xl p-8 md:p-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-prime-gold/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-prime-gold" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-white mb-2">
                  Due Diligence Checklist
                </h3>
                <p className="text-slate-400">
                  Your lawyer should verify all of the following before you sign any contracts:
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {dueDiligenceChecks.map((check, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="w-6 h-6 rounded-full bg-prime-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-prime-gold" />
                  </div>
                  <span className="text-slate-300 text-sm">{check}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
