import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPANY_CONTACT } from '@/constants/company';

interface MobileStickyContactProps {
  whatsappMessage: string;
  whatsappLabel: string;
}

export const MobileStickyContact: React.FC<MobileStickyContactProps> = ({
  whatsappMessage,
  whatsappLabel,
}) => {
  const trackEvent = (eventName: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        event_category: 'Contact',
        event_label: 'mobile_sticky_bar'
      });
    }
  };

  const whatsappUrl = COMPANY_CONTACT.whatsappWithMessage(whatsappMessage);

  return (
    <div 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <div className="flex items-center gap-3 p-4">
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('whatsapp_click')}
          className="flex-1"
        >
          <Button className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-semibold text-base">
            <MessageCircle className="w-5 h-5 mr-2" />
            {whatsappLabel}
          </Button>
        </a>
        <a 
          href={`tel:${COMPANY_CONTACT.phoneClean}`}
          onClick={() => trackEvent('phone_click')}
        >
          <Button variant="outline" className="h-14 w-14 shrink-0">
            <Phone className="w-5 h-5" />
          </Button>
        </a>
      </div>
    </div>
  );
};
