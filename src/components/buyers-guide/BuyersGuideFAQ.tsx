import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { defaultFAQs } from '@/lib/buyersGuideSchemaGenerator';

export const BuyersGuideFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 reveal-on-scroll">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">
            Common Questions
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Get quick answers to the most common questions about buying property in Spain.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4 reveal-on-scroll">
          {defaultFAQs.map((faq, index) => (
            <div
              key={index}
              className={`bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${
                openIndex === index ? 'shadow-lg border-prime-gold/30' : 'hover:shadow-md'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-start gap-4 p-6 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                  openIndex === index ? 'bg-prime-gold text-white' : 'bg-prime-gold/10 text-prime-gold'
                }`}>
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg pr-8">{faq.question}</h3>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 mt-2 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              
              <div className={`transition-all duration-300 overflow-hidden ${
                openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="px-6 pb-6">
                  <div className="pl-14">
                    <p className="text-muted-foreground leading-relaxed quick-answer">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center reveal-on-scroll">
          <div className="inline-flex items-center gap-3 bg-card rounded-full px-6 py-3 border">
            <MessageCircle className="w-5 h-5 text-prime-gold" />
            <span className="text-muted-foreground">Still have questions?</span>
            <a 
              href="/#contact" 
              className="text-prime-gold font-medium hover:underline"
            >
              Contact us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
