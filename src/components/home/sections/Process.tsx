import React from 'react';
import { Search, FileText, Home, Key } from 'lucide-react';
import { Section } from '../ui/Section';

export const Process: React.FC = () => {
  const steps = [
    {
      icon: Search,
      title: 'Discovery Call',
      description: 'We discuss your needs, budget, and timeline in your preferred language.'
    },
    {
      icon: FileText,
      title: 'Property Selection',
      description: 'Our AI analyzes the market to shortlist properties that match your criteria and offer fair value.'
    },
    {
      icon: Home,
      title: 'Viewings & Due Diligence',
      description: 'We arrange visits, review legal documents, and explain every clause of your contract.'
    },
    {
      icon: Key,
      title: 'Completion & Beyond',
      description: 'From reservation to keys and beyond—after-sales support for utilities, taxes, and community management.'
    }
  ];

  return (
    <Section background="light">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-950 mb-4">
          Our <span className="text-prime-gold italic">Simple Process</span>
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          From first call to final handover, we're with you every step of the way.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`relative reveal-on-scroll stagger-${index + 1}`}
          >
            {/* Connecting Line (hidden on mobile, shown on larger screens) */}
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-prime-gold via-prime-goldLight to-transparent -translate-x-8"></div>
            )}
            
            <div className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 h-full">
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-prime-gold rounded-full flex items-center justify-center font-bold text-prime-950 text-lg shadow-lg">
                {index + 1}
              </div>
              
              <div className="inline-flex items-center justify-center w-16 h-16 bg-prime-gold/10 rounded-2xl mb-6">
                <step.icon className="w-8 h-8 text-prime-gold" />
              </div>
              <h3 className="text-xl font-bold text-prime-950 mb-3">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};