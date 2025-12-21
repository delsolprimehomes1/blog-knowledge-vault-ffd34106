import React from 'react';
import { ArrowRight, Phone, Mail, Calendar, Download, Shield, Award, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const trustSignals = [
  { icon: Shield, label: 'API Accredited' },
  { icon: Award, label: '15+ Years Experience' },
  { icon: Users, label: '500+ Satisfied Buyers' },
];

export const BuyersGuideCTA: React.FC = () => {
  return (
    <section id="contact-cta" className="py-20 md:py-28 bg-prime-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-prime-gold rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-prime-gold rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="reveal-on-scroll">
            <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-4 block">
              Ready to Start?
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white mb-6 leading-tight">
              Let Us Guide You Home
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Our multilingual team has helped hundreds of international buyers find their perfect property 
              on the Costa del Sol. Book a free consultation to discuss your requirements.
            </p>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-4 mb-8">
              {trustSignals.map((signal, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2"
                >
                  <signal.icon className="w-4 h-4 text-prime-gold" />
                  <span className="text-sm text-slate-300">{signal.label}</span>
                </div>
              ))}
            </div>

            {/* Contact Options */}
            <div className="space-y-4">
              <a 
                href="tel:+34951234567"
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-prime-gold/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-prime-gold" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Call us directly</p>
                  <p className="text-white font-medium group-hover:text-prime-gold transition-colors">+34 951 234 567</p>
                </div>
              </a>
              
              <a 
                href="mailto:info@delsolprimehomes.com"
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-prime-gold/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-prime-gold" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email us</p>
                  <p className="text-white font-medium group-hover:text-prime-gold transition-colors">info@delsolprimehomes.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* Right Card */}
          <div className="reveal-on-scroll stagger-2">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl">
              <h3 className="text-2xl font-serif font-bold text-prime-900 mb-4">
                Book a Free Consultation
              </h3>
              <p className="text-slate-600 mb-8">
                Discuss your requirements with our property experts. No obligation, no pressure.
              </p>

              <div className="space-y-4">
                <Link
                  to="/#contact"
                  className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-prime-gold text-white font-medium rounded-xl hover:bg-prime-gold/90 transition-all duration-300 hover:gap-3 shadow-lg shadow-prime-gold/30"
                >
                  <Calendar className="w-5 h-5" />
                  Schedule a Call
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/property-finder"
                  className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-prime-900 text-white font-medium rounded-xl hover:bg-prime-900/90 transition-all duration-300"
                >
                  Browse Available Properties
                </Link>

                <button
                  className="flex items-center justify-center gap-2 w-full py-4 px-6 border-2 border-prime-900 text-prime-900 font-medium rounded-xl hover:bg-prime-900 hover:text-white transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  Download PDF Guide
                </button>
              </div>

              {/* Trust Note */}
              <p className="mt-6 text-center text-sm text-slate-500">
                🔒 Your information is secure and will never be shared
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
