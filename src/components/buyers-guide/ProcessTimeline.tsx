import React, { useEffect, useRef, useState } from 'react';
import { 
  ClipboardList,
  Search, 
  CalendarCheck,
  Scale, 
  FileText, 
  Building2, 
  FileSignature, 
  Key,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useBuyersGuideTranslation } from '@/hooks/useBuyersGuideTranslation';

// Icons matching the correct 8-step process:
// 1. Define Requirements, 2. Property Search, 3. Reservation, 4. Lawyer/POA,
// 5. NIE Number, 6. Bank Account, 7. Private Contract, 8. Complete at Notary
const stepIcons = [ClipboardList, Search, CalendarCheck, Scale, FileText, Building2, FileSignature, Key];

const stepImages = [
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80', // Property search
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80', // NIE/documents
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80', // Property viewing
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80', // Property inspection
  'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=400&q=80', // Offer/negotiation
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80', // Legal
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80', // Signing
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&q=80', // Keys
];

export const ProcessTimeline: React.FC = () => {
  const { t } = useBuyersGuideTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const steps = t.process.steps;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepIndex = parseInt(entry.target.getAttribute('data-step') || '0');
            setActiveStep(stepIndex);
          }
        });
      },
      { threshold: 0.5, rootMargin: '-100px 0px' }
    );

    const stepElements = document.querySelectorAll('[data-step]');
    stepElements.forEach((step) => observer.observe(step));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="process" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20 reveal-on-scroll">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-6">
            <span className="w-2 h-2 bg-prime-gold rounded-full animate-pulse" />
            <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase">{t.process.badge}</span>
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
            {t.process.headline}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.process.subheadline}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="hidden lg:flex items-center justify-center gap-2 mb-16 reveal-on-scroll">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                  index <= activeStep 
                    ? 'bg-prime-gold text-white shadow-lg shadow-prime-gold/30' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className="w-12 h-1 mx-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      index < activeStep ? 'bg-prime-gold' : 'bg-muted'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="relative">
          {/* Connecting Line - Desktop */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-b from-prime-gold via-prime-gold/50 to-prime-gold rounded-full" />
            <div 
              className="absolute top-0 left-0 w-full bg-prime-gold rounded-full transition-all duration-700"
              style={{ height: `${(activeStep / (steps.length - 1)) * 100}%` }}
            />
          </div>

          <div className="space-y-6 md:space-y-0">
            {steps.map((step, index) => {
              const Icon = stepIcons[index];
              const isEven = index % 2 === 0;
              const isActive = index === activeStep;

              return (
                <div
                  key={index}
                  id={`step-${index + 1}`}
                  data-step={index}
                  className="relative reveal-on-scroll"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className={`flex gap-4 p-4 rounded-2xl transition-all duration-500 ${
                      isActive ? 'bg-card shadow-xl border border-prime-gold/20' : 'bg-card/50'
                    }`}>
                      <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center relative transition-all duration-500 ${
                          isActive 
                            ? 'bg-prime-gold text-white shadow-lg shadow-prime-gold/30' 
                            : 'bg-prime-gold/10 border-2 border-prime-gold/30'
                        }`}>
                          <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-prime-gold'}`} />
                          <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                            isActive ? 'bg-prime-900 text-prime-gold' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                        {step.documents && step.documents.length > 0 && isActive && (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <p className="text-xs text-prime-gold font-semibold mb-2 uppercase tracking-wide">{t.process.requiredDocuments}</p>
                            <ul className="space-y-1">
                              {step.documents.map((doc, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-2 md:gap-12 items-center py-10">
                    {/* Left Side */}
                    <div className={`${isEven ? 'text-right pr-20' : 'order-2 pl-20'}`}>
                      <div 
                        className={`group relative overflow-hidden rounded-3xl transition-all duration-500 cursor-pointer
                          ${isEven ? 'ml-auto' : 'mr-auto'} max-w-lg
                          ${isActive 
                            ? 'shadow-2xl shadow-prime-gold/20 -translate-y-2' 
                            : 'hover:shadow-xl hover:-translate-y-1'
                          }`}
                        style={{ perspective: '1000px' }}
                      >
                        {/* Image background */}
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${stepImages[index]})` }}
                        />
                        <div className={`absolute inset-0 transition-opacity duration-500 ${
                          isActive 
                            ? 'bg-gradient-to-br from-prime-900/90 via-prime-900/80 to-prime-gold/20' 
                            : 'bg-prime-900/85 group-hover:bg-prime-900/75'
                        }`} />
                        
                        {/* Content */}
                        <div className="relative p-8">
                          <div className={`flex items-center gap-3 mb-4 ${isEven ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-prime-gold/60 text-sm font-medium ${isActive ? 'text-prime-gold' : ''}`}>
                              Step {index + 1}
                            </span>
                          </div>
                          
                          <h3 className={`text-2xl font-serif font-bold text-white mb-3 transition-colors duration-300 ${
                            isActive ? 'text-prime-gold' : ''
                          }`}>
                            {step.title}
                          </h3>
                          
                          <p className="text-white/80 leading-relaxed text-base">
                            {step.description}
                          </p>
                          
                          {step.documents && step.documents.length > 0 && (
                            <div className={`mt-6 pt-6 border-t border-white/10 overflow-hidden transition-all duration-500 ${
                              isActive ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                              <p className="text-prime-gold font-semibold text-sm mb-3 uppercase tracking-wide">{t.process.requiredDocuments}</p>
                              <ul className="space-y-2">
                                {step.documents.map((doc, i) => (
                                  <li key={i} className="flex items-center gap-2 text-white/70 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    {doc}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Arrow indicator */}
                          <div className={`absolute bottom-4 right-4 transition-all duration-300 ${
                            isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                          }`}>
                            <ChevronRight className="w-6 h-6 text-prime-gold" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center Icon */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-10">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 ${
                        isActive 
                          ? 'bg-prime-gold border-4 border-white scale-110 shadow-prime-gold/40' 
                          : 'bg-card border-4 border-prime-gold/30 hover:scale-105'
                      }`}>
                        <Icon className={`w-8 h-8 transition-all duration-300 ${
                          isActive ? 'text-white' : 'text-prime-gold'
                        }`} />
                        <span className={`absolute -top-3 -right-3 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'bg-prime-900 text-prime-gold border-2 border-prime-gold' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
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
