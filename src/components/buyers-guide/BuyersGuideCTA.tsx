import React from 'react';
import { ArrowRight, Phone, Mail, Calendar, Download, Shield, Award, Users, Star, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import ctaBackground from '@/assets/buyers-guide/luxury-villa-cta.jpg';

const trustSignals = [
  { icon: Shield, label: 'API Accredited' },
  { icon: Award, label: '15+ Years Experience' },
  { icon: Users, label: '500+ Satisfied Buyers' },
];

export const BuyersGuideCTA: React.FC = () => {
  return (
    <section id="contact-cta" className="py-24 md:py-32 relative overflow-hidden">
      {/* Full-width background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ctaBackground})` }}
      />
      
      {/* Multi-layer overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-prime-900/95 via-prime-900/90 to-prime-900/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-prime-900 via-transparent to-prime-900/50" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/20 to-transparent" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-prime-gold/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="reveal-on-scroll">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/20 border border-prime-gold/30 rounded-full mb-6">
              <span className="w-2 h-2 bg-prime-gold rounded-full animate-pulse" />
              <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase">Ready to Start?</span>
            </span>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight">
              Let Us Guide You{' '}
              <span className="bg-gradient-to-r from-prime-gold via-prime-goldLight to-prime-gold bg-[length:200%_auto] animate-text-shimmer"
                style={{ 
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Home
              </span>
            </h2>
            
            <p className="text-xl text-white/80 mb-10 leading-relaxed max-w-lg">
              Our multilingual team has helped hundreds of international buyers find their perfect property 
              on the Costa del Sol. Book a free consultation to discuss your requirements.
            </p>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-3 mb-10">
              {trustSignals.map((signal, index) => (
                <div 
                  key={index}
                  className="group flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 border border-white/20 hover:border-prime-gold/40 hover:bg-white/15 transition-all duration-300"
                >
                  <signal.icon className="w-4 h-4 text-prime-gold group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm text-white/90 font-medium">{signal.label}</span>
                </div>
              ))}
            </div>

            {/* Contact Options */}
            <div className="space-y-4">
              <a 
                href="tel:+34630039090"
                className="group flex items-center gap-4 p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 hover:border-prime-gold/40 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-prime-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-6 h-6 text-prime-gold" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Call or WhatsApp</p>
                  <p className="text-xl text-white font-semibold group-hover:text-prime-gold transition-colors">+34 630 03 90 90</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/40 ml-auto group-hover:text-prime-gold group-hover:translate-x-1 transition-all duration-300" />
              </a>
              
              <a 
                href="mailto:info@delsolprimehomes.com"
                className="group flex items-center gap-4 p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 hover:border-prime-gold/40 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-prime-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-6 h-6 text-prime-gold" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Email us</p>
                  <p className="text-lg text-white font-semibold group-hover:text-prime-gold transition-colors">info@delsolprimehomes.com</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/40 ml-auto group-hover:text-prime-gold group-hover:translate-x-1 transition-all duration-300" />
              </a>
            </div>

            {/* Testimonial snippet */}
            <div className="mt-10 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <Quote className="w-8 h-8 text-prime-gold/40 mb-3" />
              <p className="text-white/80 italic mb-4">
                "Del Sol Prime Homes made our dream of owning a home in Spain a reality. Professional, knowledgeable, and genuinely caring."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-prime-gold/20 flex items-center justify-center">
                  <span className="text-prime-gold font-bold">M</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Michael & Sarah Thompson</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-prime-gold text-prime-gold" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card - Floating 3D effect */}
          <div className="reveal-on-scroll stagger-2">
            <div className="relative">
              {/* Glow effect behind card */}
              <div className="absolute -inset-4 bg-prime-gold/20 rounded-3xl blur-2xl opacity-50" />
              
              <div className="relative bg-white rounded-3xl p-8 md:p-10 shadow-2xl transform hover:-translate-y-2 transition-transform duration-500">
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold text-white text-sm font-bold rounded-full shadow-lg shadow-prime-gold/30">
                    <Calendar className="w-4 h-4" />
                    Free Consultation
                  </span>
                </div>

                <div className="pt-4">
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-prime-900 mb-4 text-center">
                    Book Your Free Consultation
                  </h3>
                  <p className="text-slate-600 mb-8 text-center">
                    Discuss your requirements with our property experts. No obligation, no pressure—just expert advice.
                  </p>

                  <div className="space-y-4">
                    <Link
                      to="/#contact"
                      className="group flex items-center justify-center gap-2 w-full py-4 px-6 bg-prime-gold text-white font-semibold rounded-xl hover:bg-prime-gold/90 transition-all duration-300 shadow-lg shadow-prime-gold/30 hover:shadow-xl hover:shadow-prime-gold/40"
                    >
                      <Calendar className="w-5 h-5" />
                      Schedule a Call
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      to="/property-finder"
                      className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-prime-900 text-white font-semibold rounded-xl hover:bg-prime-900/90 transition-all duration-300"
                    >
                      Browse Available Properties
                    </Link>

                    <button
                      className="flex items-center justify-center gap-2 w-full py-4 px-6 border-2 border-prime-900 text-prime-900 font-semibold rounded-xl hover:bg-prime-900 hover:text-white transition-all duration-300"
                    >
                      <Download className="w-5 h-5" />
                      Download PDF Guide
                    </button>
                  </div>

                  {/* Trust Note */}
                  <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                      <Shield className="w-4 h-4 text-green-500" />
                      Your information is secure and will never be shared
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
