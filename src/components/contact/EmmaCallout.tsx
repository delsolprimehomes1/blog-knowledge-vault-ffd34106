import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmmaCalloutTranslations {
  emma: {
    callout: string;
    cta: string;
  };
}

interface EmmaCalloutProps {
  t: EmmaCalloutTranslations;
}

export const EmmaCallout: React.FC<EmmaCalloutProps> = ({ t }) => {
  const handleOpenEmma = () => {
    window.dispatchEvent(new CustomEvent('openEmmaChat'));
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'emma_open', {
        event_category: 'Contact',
        event_label: 'contact_page_callout'
      });
    }
  };

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-prime-900 via-prime-800 to-prime-900">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 bg-prime-gold/20 text-prime-gold px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered
          </div>
          
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">
            {t.emma.callout}
          </h2>
          
          <p className="text-white/80 mb-8">
            {t.emma.cta}
          </p>
          
          <Button
            onClick={handleOpenEmma}
            size="lg"
            className="h-14 px-8 bg-prime-gold hover:bg-prime-gold/90 text-prime-900 font-semibold"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat with Emma
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
