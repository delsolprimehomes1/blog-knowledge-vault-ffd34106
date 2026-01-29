import React from 'react';
import { motion } from 'framer-motion';

interface ContactTranslations {
  hero: {
    headline: string;
    subheadline: string;
  };
}

interface ContactHeroProps {
  t: ContactTranslations;
}

export const ContactHero: React.FC<ContactHeroProps> = ({ t }) => {
  return (
    <section className="relative py-20 md:py-28 bg-gradient-to-br from-prime-900 via-prime-800 to-prime-900 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-prime-gold rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-prime-gold rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6">
            {t.hero.headline}
          </h1>
          <p className="text-lg md:text-xl text-white/80 leading-relaxed">
            {t.hero.subheadline}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
