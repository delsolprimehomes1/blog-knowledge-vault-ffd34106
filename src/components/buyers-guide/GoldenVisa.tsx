import React from 'react';
import { Crown, Globe, Users, Plane, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const benefits = [
  {
    icon: Globe,
    title: 'Schengen Access',
    description: 'Visa-free travel to all 26 Schengen countries'
  },
  {
    icon: Users,
    title: 'Family Inclusion',
    description: 'Spouse, children, and dependent parents included'
  },
  {
    icon: Plane,
    title: 'No Minimum Stay',
    description: 'No requirement to live in Spain full-time'
  },
  {
    icon: Clock,
    title: 'Path to Citizenship',
    description: 'Eligible for permanent residency after 5 years'
  }
];

const requirements = [
  'Minimum €500,000 investment in Spanish real estate',
  'Property must be free from any encumbrances up to €500,000',
  'Clean criminal record in Spain and country of origin',
  'Valid health insurance covering Spain',
  'Sufficient financial means to support yourself and family',
  'No previous Schengen visa rejections'
];

export const GoldenVisa: React.FC = () => {
  return (
    <section id="golden-visa" className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-prime-gold/5 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16 reveal-on-scroll">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-6">
            <Crown className="w-4 h-4 text-prime-gold" />
            <span className="text-prime-gold text-sm font-medium">Investment Residency</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
            Spain's Golden Visa Program
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Invest €500,000 or more in Spanish property and gain residency rights for you and your family.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Benefits */}
          <div className="reveal-on-scroll">
            <h3 className="text-2xl font-serif font-bold text-foreground mb-8">
              Key Benefits
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="group bg-card rounded-2xl p-6 border hover:border-prime-gold/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-prime-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <benefit.icon className="w-6 h-6 text-prime-gold" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>

            {/* Investment Highlight */}
            <div className="mt-8 bg-gradient-to-r from-prime-gold/10 to-prime-gold/5 rounded-2xl p-6 border border-prime-gold/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-prime-gold">€500K</div>
                <div>
                  <p className="font-medium text-foreground">Minimum Investment</p>
                  <p className="text-sm text-muted-foreground">In Spanish real estate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="reveal-on-scroll stagger-2">
            <h3 className="text-2xl font-serif font-bold text-foreground mb-8">
              Requirements
            </h3>
            <div className="bg-card rounded-3xl p-8 border">
              <ul className="space-y-4">
                {requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-muted-foreground">{requirement}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t">
                <Link
                  to="/blog?search=golden+visa"
                  className="inline-flex items-center gap-2 text-prime-gold font-medium hover:gap-3 transition-all duration-300"
                >
                  Learn more about Golden Visa
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="mt-6 bg-prime-900 rounded-2xl p-6">
              <h4 className="font-bold text-white mb-4">Processing Timeline</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Initial application</span>
                  <span className="text-prime-gold font-medium">2-3 months</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Visa validity</span>
                  <span className="text-prime-gold font-medium">2 years (renewable)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Permanent residency</span>
                  <span className="text-prime-gold font-medium">After 5 years</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Citizenship eligibility</span>
                  <span className="text-prime-gold font-medium">After 10 years</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
