import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle, Search } from 'lucide-react';
import { defaultFAQs } from '@/lib/buyersGuideSchemaGenerator';

export const BuyersGuideFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = defaultFAQs.filter(
    faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="faq" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-prime-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16 reveal-on-scroll">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-6">
            <HelpCircle className="w-4 h-4 text-prime-gold" />
            <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase">Common Questions</span>
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get quick answers to the most common questions about buying property in Spain.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative max-w-xl mx-auto mb-12 reveal-on-scroll">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-card border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-prime-gold/50 focus:border-prime-gold/50 transition-all duration-300"
          />
        </div>

        {/* FAQ Items */}
        <div className="space-y-4 reveal-on-scroll">
          {filteredFAQs.map((faq, index) => {
            const isOpen = openIndex === index;
            
            return (
              <div
                key={index}
                className={`group bg-card rounded-2xl border overflow-hidden transition-all duration-500 ${
                  isOpen 
                    ? 'shadow-xl border-prime-gold/30 ring-1 ring-prime-gold/10' 
                    : 'hover:shadow-lg hover:border-border'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-start gap-4 p-6 text-left"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isOpen 
                      ? 'bg-prime-gold text-white shadow-lg shadow-prime-gold/30' 
                      : 'bg-prime-gold/10 text-prime-gold group-hover:bg-prime-gold/20'
                  }`}>
                    <span className="font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className={`font-bold text-lg pr-8 transition-colors duration-300 ${
                      isOpen ? 'text-prime-gold' : 'text-foreground'
                    }`}>
                      {faq.question}
                    </h3>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 mt-1 ${
                    isOpen ? 'bg-prime-gold/20 rotate-180' : 'bg-muted'
                  }`}>
                    <ChevronDown className={`w-5 h-5 transition-colors duration-300 ${
                      isOpen ? 'text-prime-gold' : 'text-muted-foreground'
                    }`} />
                  </div>
                </button>
                
                <div className={`transition-all duration-500 ease-out overflow-hidden ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-6 pb-6">
                    <div className="pl-16 border-l-2 border-prime-gold/20">
                      <p className="text-muted-foreground leading-relaxed quick-answer">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* No results message */}
        {filteredFAQs.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions found matching "{searchQuery}"</p>
          </div>
        )}

        {/* Still Have Questions */}
        <div className="mt-16 text-center reveal-on-scroll">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-card rounded-2xl px-8 py-6 border shadow-lg">
            <div className="w-14 h-14 rounded-full bg-prime-gold/10 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-prime-gold" />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-semibold text-foreground mb-1">Still have questions?</p>
              <p className="text-muted-foreground text-sm">Our team is here to help you.</p>
            </div>
            <a 
              href="/#contact" 
              className="px-6 py-3 bg-prime-gold text-white font-medium rounded-xl hover:bg-prime-gold/90 transition-colors duration-300 shadow-lg shadow-prime-gold/30"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
