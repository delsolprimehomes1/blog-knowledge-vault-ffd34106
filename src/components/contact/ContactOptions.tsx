import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_CONTACT } from '@/constants/company';

interface ContactOptionsTranslations {
  options: {
    whatsapp: {
      title: string;
      description: string;
      cta: string;
      prefill: string;
    };
    email: {
      title: string;
      description: string;
      cta: string;
    };
    phone: {
      title: string;
      description: string;
      cta: string;
    };
  };
}

interface ContactOptionsProps {
  t: ContactOptionsTranslations;
}

export const ContactOptions: React.FC<ContactOptionsProps> = ({ t }) => {
  const trackEvent = (eventName: string, location: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        event_category: 'Contact',
        event_label: location
      });
    }
  };

  const whatsappUrl = COMPANY_CONTACT.whatsappWithMessage(t.options.whatsapp.prefill);

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* WhatsApp - Primary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/30 rounded-2xl p-8 h-full transition-all duration-300 hover:border-green-500/50 hover:shadow-xl hover:shadow-green-500/10">
              {/* Primary badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Fastest Response
                </span>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t.options.whatsapp.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t.options.whatsapp.description}
                </p>
                <p className="text-lg font-medium text-foreground mb-6">
                  {COMPANY_CONTACT.phone}
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('whatsapp_click', 'contact_options')}
                  className="w-full"
                >
                  <Button className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {t.options.whatsapp.cta}
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t.options.email.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t.options.email.description}
                </p>
                <p className="text-lg font-medium text-foreground mb-6 break-all">
                  {COMPANY_CONTACT.email}
                </p>
                <a
                  href={`mailto:${COMPANY_CONTACT.email}`}
                  onClick={() => trackEvent('email_click', 'contact_options')}
                  className="w-full"
                >
                  <Button variant="outline" className="w-full h-12 font-semibold">
                    <Mail className="w-5 h-5 mr-2" />
                    {t.options.email.cta}
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-card border border-border rounded-2xl p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t.options.phone.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t.options.phone.description}
                </p>
                <p className="text-lg font-medium text-foreground mb-6">
                  {COMPANY_CONTACT.phone}
                </p>
                <a
                  href={`tel:${COMPANY_CONTACT.phoneClean}`}
                  onClick={() => trackEvent('phone_click', 'contact_options')}
                  className="w-full"
                >
                  <Button variant="outline" className="w-full h-12 font-semibold">
                    <Phone className="w-5 h-5 mr-2" />
                    {t.options.phone.cta}
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
