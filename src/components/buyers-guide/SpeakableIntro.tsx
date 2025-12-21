import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';

export const SpeakableIntro: React.FC = () => {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-prime-900 to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-prime-gold/20 via-prime-gold/10 to-prime-gold/20 rounded-3xl blur-xl opacity-50" />
          
          <div className="relative glass-luxury rounded-3xl p-8 md:p-12 border border-prime-gold/20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-prime-gold/10 border border-prime-gold/20">
                <Volume2 className="w-6 h-6 text-prime-gold" />
              </div>
              <div>
                <span className="text-prime-gold text-sm font-medium tracking-wide uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Quick Answer
                </span>
                <h2 className="text-lg font-semibold text-foreground">AI-Ready Summary</h2>
              </div>
            </div>

            {/* Speakable Content */}
            <div className="speakable-intro quick-answer">
              <p className="text-lg md:text-xl leading-relaxed text-foreground/90 mb-4">
                <strong>Buying property on the Costa del Sol</strong> is a straightforward process for international buyers. 
                You'll need a NIE (tax identification number), a Spanish bank account, and typically 10-13% of the purchase 
                price to cover taxes and fees.
              </p>
              <p className="text-lg md:text-xl leading-relaxed text-foreground/90">
                The process takes <strong>3-6 months</strong> from finding your property to receiving the keys. 
                Non-EU buyers investing €500,000+ qualify for Spain's <strong>Golden Visa</strong>, granting residency 
                rights throughout the Schengen area.
              </p>
            </div>

            {/* Bottom Accent */}
            <div className="mt-8 pt-6 border-t border-prime-gold/10">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-prime-gold animate-pulse" />
                Optimized for voice assistants and AI search
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
