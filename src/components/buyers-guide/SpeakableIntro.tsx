import React from 'react';
import { Volume2, Sparkles, MapPin, Clock, CreditCard } from 'lucide-react';

export const SpeakableIntro: React.FC = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-prime-900 via-prime-900/95 to-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/20 to-transparent" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative reveal-on-scroll">
          {/* Animated border glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-prime-gold/30 via-prime-gold/10 to-prime-gold/30 rounded-3xl blur-xl opacity-60 animate-pulse" />
          <div className="absolute -inset-0.5 bg-gradient-to-r from-prime-gold/20 via-transparent to-prime-gold/20 rounded-3xl" />
          
          <div className="relative bg-prime-900/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-prime-gold/30 shadow-2xl">
            {/* Header with icon */}
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-prime-gold/20 to-prime-gold/10 border border-prime-gold/30">
                  <Volume2 className="w-7 h-7 text-prime-gold" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-prime-gold rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-prime-gold rounded-full" />
              </div>
              <div>
                <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Quick Answer
                </span>
                <h2 className="text-xl font-serif font-bold text-white">AI-Ready Summary</h2>
              </div>
            </div>

            {/* Key highlights in a grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <CreditCard className="w-6 h-6 text-prime-gold mx-auto mb-2" />
                <span className="text-2xl font-bold text-white block">10-13%</span>
                <span className="text-xs text-white/60">Extra Costs</span>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <Clock className="w-6 h-6 text-prime-gold mx-auto mb-2" />
                <span className="text-2xl font-bold text-white block">3-6</span>
                <span className="text-xs text-white/60">Months</span>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <MapPin className="w-6 h-6 text-prime-gold mx-auto mb-2" />
                <span className="text-2xl font-bold text-white block">€2,520</span>
                <span className="text-xs text-white/60">Visa Income</span>
              </div>
            </div>

            {/* Speakable Content */}
            <div className="speakable-intro quick-answer space-y-5">
              <p className="text-lg md:text-xl leading-relaxed text-white/90">
                <strong className="text-prime-gold">Buying property on the Costa del Sol</strong> is a straightforward process for international buyers. 
                You'll need a <span className="text-prime-gold font-medium">NIE</span> (tax identification number), a Spanish bank account, and typically <span className="text-prime-gold font-medium">10-13%</span> of the purchase 
                price to cover taxes and fees.
              </p>
              <p className="text-lg md:text-xl leading-relaxed text-white/90">
                The process takes <strong className="text-prime-gold">3-6 months</strong> from finding your property to receiving the keys. 
                Remote workers and digital nomads can qualify for Spain's <strong className="text-prime-gold">Digital Nomad Visa</strong>, 
                allowing you to live and work from the beautiful Costa del Sol while maintaining your international career.
              </p>
            </div>

            {/* Bottom Accent */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-prime-gold animate-pulse" />
                Optimized for voice assistants and AI search
              </p>
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 h-4 bg-prime-gold/60 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s`, height: `${12 + i * 4}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
