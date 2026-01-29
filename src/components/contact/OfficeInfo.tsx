import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_ADDRESS, COMPANY_HOURS } from '@/constants/company';

interface OfficeTranslations {
  office: {
    headline: string;
    hours: {
      title: string;
      weekdays: string;
      saturday: string;
      sunday: string;
      closed: string;
      timezone: string;
    };
    directions: string;
  };
}

interface OfficeInfoProps {
  t: OfficeTranslations;
}

export const OfficeInfo: React.FC<OfficeInfoProps> = ({ t }) => {
  const trackEvent = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'map_directions_click', {
        event_category: 'Contact',
        event_label: 'office_location'
      });
    }
  };

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            {t.office.headline}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="aspect-video lg:aspect-square rounded-2xl overflow-hidden border border-border"
          >
            <iframe
              src={COMPANY_ADDRESS.googleMapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Del Sol Prime Homes Office Location"
            />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center"
          >
            {/* Address */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">Office Address</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {COMPANY_ADDRESS.building}<br />
                    {COMPANY_ADDRESS.street}, {COMPANY_ADDRESS.floor}<br />
                    {COMPANY_ADDRESS.postalCode} {COMPANY_ADDRESS.city}<br />
                    {COMPANY_ADDRESS.province}, {COMPANY_ADDRESS.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-3">
                    {t.office.hours.title}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.office.hours.weekdays}</span>
                      <span className="text-foreground font-medium">
                        {COMPANY_HOURS.weekdays.open} - {COMPANY_HOURS.weekdays.close}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.office.hours.saturday}</span>
                      <span className="text-foreground font-medium">
                        {COMPANY_HOURS.saturday.open} - {COMPANY_HOURS.saturday.close}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.office.hours.sunday}</span>
                      <span className="text-red-500 font-medium">{t.office.hours.closed}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {t.office.hours.timezone}
                  </p>
                </div>
              </div>
            </div>

            {/* Directions Button */}
            <a
              href={COMPANY_ADDRESS.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackEvent}
            >
              <Button variant="outline" className="w-full h-12 font-semibold">
                <ExternalLink className="w-5 h-5 mr-2" />
                {t.office.directions}
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
