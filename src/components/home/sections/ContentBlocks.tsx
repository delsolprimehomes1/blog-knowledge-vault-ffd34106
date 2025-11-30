import React from 'react';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { Shield, Award, Brain, FileCheck, ArrowRight } from 'lucide-react';

export const MiniAbout: React.FC = () => {
  return (
    <Section background="light" className="pt-24 md:pt-32">
      <div className="max-w-5xl mx-auto text-center reveal-on-scroll">
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-prime-900 mb-8">Expertise You Can <span className="text-prime-gold underline decoration-prime-gold/30 underline-offset-8">Trust</span></h2>
        <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-10 max-w-4xl mx-auto font-light">
          DelSolPrimeHomes was founded by <strong className="text-prime-900 font-semibold">Hans Beeckman</strong>, <strong className="text-prime-900 font-semibold">Cédric Van Hecke</strong>, and <strong className="text-prime-900 font-semibold">Steven Roberts</strong> — three API-accredited real estate professionals with decades of experience helping international buyers purchase safely on the Costa del Sol.
        </p>
        <p className="text-slate-600 text-lg md:text-xl leading-relaxed mb-10 max-w-4xl mx-auto font-light">
          Together with a multilingual team that earned their reputation at respected agencies across the region, we offer full guidance in English, Dutch, French, German, Finnish, Polish, Danish, Hungarian, Swedish, and Norwegian.
        </p>
        
        <div>
          <Button variant="outline" className="group">
            Meet the Team <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </Section>
  );
};

export const USPSection: React.FC = () => {
  // Use Components (functions) instead of Elements (JSX) for safer rendering
  const usps = [
    {
      Icon: Shield,
      title: "API-Accredited Advisors",
      desc: "We operate under strict Spanish standards of professionalism, ethics, and legal compliance."
    },
    {
      Icon: Award,
      title: "35+ Years of Experience",
      desc: "Our team members have helped hundreds of families and individuals buy safely in Spain, using the expertise they gained at leading real estate offices before joining DelSolPrimeHomes."
    },
    {
      Icon: Brain,
      title: "AI-Enhanced Property Selection",
      desc: "We analyse and compare new-build projects between Málaga and Sotogrande using advanced AI tools — so you only see the opportunities that truly fit your needs."
    },
    {
      Icon: FileCheck,
      title: "Full Legal & Document Support",
      desc: "We guide you through licences, contracts, payment schedules, and bank guarantees, ensuring clarity and legal security at every step."
    }
  ];

  return (
    <Section background="white" id="usps" className="relative">
      <div className="text-center mb-16 reveal-on-scroll">
        <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">Why Choose Us</span>
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-900">Why Buyers Trust DelSolPrimeHomes</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {usps.map((usp, idx) => (
          <div key={idx} className={`bg-slate-50 p-8 rounded-2xl border border-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200/50 hover:bg-white group reveal-on-scroll stagger-${idx + 1}`}>
            <div className="mb-8 bg-white w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center group-hover:bg-prime-900 group-hover:rotate-0 transition-all duration-500 shadow-sm">
              <div className="text-prime-gold group-hover:text-white transition-colors duration-500">
                <usp.Icon className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-prime-900 mb-4 group-hover:text-prime-goldDark transition-colors">{usp.title}</h3>
            <p className="text-slate-600 leading-relaxed text-sm font-light">{usp.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
};