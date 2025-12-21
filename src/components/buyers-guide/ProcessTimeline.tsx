import React from 'react';
import { 
  Search, 
  FileText, 
  Building2, 
  Eye, 
  HandCoins, 
  Scale, 
  FileSignature, 
  Key,
  CheckCircle2
} from 'lucide-react';
import { defaultBuyingSteps } from '@/lib/buyersGuideSchemaGenerator';

const stepIcons = [Search, FileText, Building2, Eye, HandCoins, Scale, FileSignature, Key];

export const ProcessTimeline: React.FC = () => {
  return (
    <section id="process" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 reveal-on-scroll">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">
            Step-by-Step Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
            Your Journey to Ownership
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Follow these eight essential steps to successfully purchase your property on the Costa del Sol.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-prime-gold via-prime-gold/50 to-prime-gold hidden md:block" />

          <div className="space-y-8 md:space-y-0">
            {defaultBuyingSteps.map((step, index) => {
              const Icon = stepIcons[index];
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  id={`step-${index + 1}`}
                  className={`relative reveal-on-scroll stagger-${(index % 6) + 1}`}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-prime-gold/10 border-2 border-prime-gold/30 flex items-center justify-center relative">
                        <Icon className="w-7 h-7 text-prime-gold" />
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-prime-900 text-prime-gold rounded-full text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 bg-card rounded-2xl p-6 border shadow-sm">
                      <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-2 md:gap-8 items-center py-8">
                    {/* Left Side */}
                    <div className={`${isEven ? 'text-right pr-16' : 'order-2 pl-16'}`}>
                      <div className={`bg-card rounded-3xl p-8 border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${isEven ? 'ml-auto' : 'mr-auto'} max-w-md`}>
                        <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                        {step.documents && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-prime-gold font-medium mb-2">Required Documents:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {step.documents.map((doc, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center Icon */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-10">
                      <div className="w-20 h-20 rounded-full bg-card border-4 border-prime-gold/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 group">
                        <Icon className="w-8 h-8 text-prime-gold group-hover:scale-110 transition-transform duration-300" />
                        <span className="absolute -top-3 -right-3 w-8 h-8 bg-prime-900 text-prime-gold rounded-full text-sm font-bold flex items-center justify-center border-2 border-prime-gold/50">
                          {index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Right Side (empty for alternating layout) */}
                    <div className={`${isEven ? 'order-2' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
