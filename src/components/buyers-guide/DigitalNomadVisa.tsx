import React, { useState, useEffect, useRef } from 'react';
import { Laptop, Globe, Users, TrendingUp, CheckCircle2, ArrowRight, Plane, Wifi, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import lifestyleImage from '@/assets/buyers-guide/digital-nomad-lifestyle.jpg';
import { useBuyersGuideTranslation } from '@/hooks/useBuyersGuideTranslation';

const benefitIcons = [Laptop, Globe, Users, TrendingUp];

export const DigitalNomadVisa: React.FC = () => {
  const { t } = useBuyersGuideTranslation();
  const [animatedIncome, setAnimatedIncome] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const incomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          // Animate the income number
          const duration = 2000;
          const steps = 60;
          const stepDuration = duration / steps;
          const endValue = 2520;
          let currentStep = 0;

          const animate = () => {
            currentStep++;
            const progress = currentStep / steps;
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setAnimatedIncome(Math.round(endValue * easeProgress));

            if (currentStep < steps) {
              setTimeout(animate, stepDuration);
            }
          };

          animate();
        }
      },
      { threshold: 0.5 }
    );

    if (incomeRef.current) {
      observer.observe(incomeRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section id="digital-nomad-visa" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Background Image with Parallax effect */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${lifestyleImage})` }}
        />
      </div>
      
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-prime-gold/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-prime-gold/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-20 reveal-on-scroll">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-6">
            <Laptop className="w-4 h-4 text-prime-gold" />
            <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase">{t.digitalNomad.badge}</span>
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
            {t.digitalNomad.headline}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t.digitalNomad.subheadline}
          </p>
        </div>

        {/* Lifestyle Image Hero */}
        <div className="relative rounded-3xl overflow-hidden mb-20 reveal-on-scroll">
          <div className="aspect-[21/9] relative">
            <img 
              src={lifestyleImage} 
              alt="Digital nomad working from luxury Costa del Sol villa"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-prime-900/80 via-prime-900/40 to-transparent" />
            
            {/* Overlay content */}
            <div className="absolute inset-0 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
                  {t.digitalNomad.lifestyleTitle}
                </h3>
                <p className="text-white/80 text-lg mb-6">
                  {t.digitalNomad.lifestyleDescription}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <Wifi className="w-4 h-4 text-prime-gold" />
                    <span className="text-white text-sm">{t.digitalNomad.fastInternet}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <Plane className="w-4 h-4 text-prime-gold" />
                    <span className="text-white text-sm">{t.digitalNomad.airports}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Benefits - Bento Grid Style */}
          <div className="reveal-on-scroll">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8">
              {t.digitalNomad.benefits.title}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {t.digitalNomad.benefits.items.map((benefit, index) => {
                const Icon = benefitIcons[index] || Laptop;
                return (
                  <div
                    key={index}
                    className={`group relative bg-card rounded-2xl p-6 border hover:border-prime-gold/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl overflow-hidden ${
                      index === 0 ? 'sm:col-span-2' : ''
                    }`}
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-prime-gold/0 via-prime-gold/5 to-prime-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-prime-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-prime-gold/20 transition-all duration-300">
                        <Icon className="w-7 h-7 text-prime-gold" />
                      </div>
                      <h4 className="font-bold text-foreground text-lg mb-2">{benefit.title}</h4>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Income Requirement Highlight */}
            <div 
              ref={incomeRef}
              className="mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-prime-gold/10 via-prime-gold/20 to-prime-gold/10 p-8 border border-prime-gold/20"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-prime-gold/10 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-6">
                <div className="text-5xl md:text-6xl font-bold text-prime-gold font-serif">
                  €{animatedIncome.toLocaleString()}
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{t.digitalNomad.income.label}</p>
                  <p className="text-muted-foreground">{t.digitalNomad.income.sublabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="reveal-on-scroll stagger-2">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8">
              {t.digitalNomad.requirements.title}
            </h3>
            <div className="bg-card rounded-3xl p-8 border shadow-lg">
              <ul className="space-y-4">
                {t.digitalNomad.requirements.items.map((requirement, index) => (
                  <li 
                    key={index} 
                    className="flex items-start gap-4 group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-muted-foreground leading-relaxed">{requirement}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t">
                <Link
                  to="/blog?search=digital+nomad+visa"
                  className="inline-flex items-center gap-2 text-prime-gold font-semibold hover:gap-3 transition-all duration-300 group"
                >
                  {t.digitalNomad.learnMore}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="mt-6 relative overflow-hidden bg-prime-900 rounded-2xl p-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-prime-gold/10 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-6 h-6 text-prime-gold" />
                  <h4 className="font-bold text-white text-xl">{t.digitalNomad.timeline.title}</h4>
                </div>
                
                <div className="space-y-4">
                  {t.digitalNomad.timeline.items.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10"
                    >
                      <span className="text-white/70">{item.label}</span>
                      <span className="text-prime-gold font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
