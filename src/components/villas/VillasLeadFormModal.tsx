import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Loader2, MapPin } from 'lucide-react';
import { registerCrmLead } from '@/utils/crm/registerCrmLead';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const FORM_TRANSLATIONS: Record<string, {
  formTitle: string; fullName: string; email: string; phone: string; message: string;
  consentPrefix: string; privacyPolicy: string; and: string; termsOfService: string; consentSuffix: string;
  send: string; sending: string; successTitle: string; successDesc: string;
}> = {
  en: { formTitle: "Fill in the form to receive further information", fullName: "Full Name *", email: "Email *", phone: "Phone Number", message: "Message (optional)", consentPrefix: "I agree to the processing of my personal data in accordance with the", privacyPolicy: "Privacy Policy", and: "and", termsOfService: "Terms of Service", consentSuffix: ". *", send: "Send", sending: "Sending...", successTitle: "Thank you!", successDesc: "We will contact you shortly." },
  nl: { formTitle: "Vul het formulier in voor meer informatie", fullName: "Volledige naam *", email: "E-mail *", phone: "Telefoonnummer", message: "Bericht (optioneel)", consentPrefix: "Ik ga akkoord met de verwerking van mijn persoonsgegevens conform het", privacyPolicy: "Privacybeleid", and: "en", termsOfService: "Servicevoorwaarden", consentSuffix: ". *", send: "Versturen", sending: "Verzenden...", successTitle: "Bedankt!", successDesc: "We nemen spoedig contact met u op." },
  fr: { formTitle: "Remplissez le formulaire pour recevoir plus d'informations", fullName: "Nom complet *", email: "E-mail *", phone: "Téléphone", message: "Message (facultatif)", consentPrefix: "J'accepte le traitement de mes données personnelles conformément à la", privacyPolicy: "Politique de confidentialité", and: "et aux", termsOfService: "Conditions d'utilisation", consentSuffix: ". *", send: "Envoyer", sending: "Envoi...", successTitle: "Merci !", successDesc: "Nous vous contacterons sous peu." },
  de: { formTitle: "Füllen Sie das Formular aus, um weitere Informationen zu erhalten", fullName: "Vollständiger Name *", email: "E-Mail *", phone: "Telefonnummer", message: "Nachricht (optional)", consentPrefix: "Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß der", privacyPolicy: "Datenschutzrichtlinie", and: "und den", termsOfService: "Nutzungsbedingungen", consentSuffix: " zu. *", send: "Senden", sending: "Senden...", successTitle: "Vielen Dank!", successDesc: "Wir werden uns in Kürze bei Ihnen melden." },
  fi: { formTitle: "Täytä lomake saadaksesi lisätietoja", fullName: "Koko nimi *", email: "Sähköposti *", phone: "Puhelinnumero", message: "Viesti (valinnainen)", consentPrefix: "Hyväksyn henkilötietojeni käsittelyn", privacyPolicy: "tietosuojakäytännön", and: "ja", termsOfService: "käyttöehtojen", consentSuffix: " mukaisesti. *", send: "Lähetä", sending: "Lähetetään...", successTitle: "Kiitos!", successDesc: "Otamme sinuun pian yhteyttä." },
  pl: { formTitle: "Wypełnij formularz, aby otrzymać więcej informacji", fullName: "Imię i nazwisko *", email: "E-mail *", phone: "Numer telefonu", message: "Wiadomość (opcjonalnie)", consentPrefix: "Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z", privacyPolicy: "Polityką prywatności", and: "i", termsOfService: "Warunkami korzystania z usługi", consentSuffix: ". *", send: "Wyślij", sending: "Wysyłanie...", successTitle: "Dziękujemy!", successDesc: "Skontaktujemy się wkrótce." },
  da: { formTitle: "Udfyld formularen for at modtage yderligere information", fullName: "Fulde navn *", email: "E-mail *", phone: "Telefonnummer", message: "Besked (valgfrit)", consentPrefix: "Jeg accepterer behandlingen af mine personoplysninger i henhold til", privacyPolicy: "Privatlivspolitikken", and: "og", termsOfService: "Servicevilkårene", consentSuffix: ". *", send: "Send", sending: "Sender...", successTitle: "Tak!", successDesc: "Vi kontakter dig snarest." },
  hu: { formTitle: "Töltse ki az űrlapot további információkért", fullName: "Teljes név *", email: "E-mail *", phone: "Telefonszám", message: "Üzenet (opcionális)", consentPrefix: "Hozzájárulok személyes adataim kezeléséhez az", privacyPolicy: "Adatvédelmi irányelvek", and: "és a", termsOfService: "Felhasználási feltételek", consentSuffix: " szerint. *", send: "Küldés", sending: "Küldés...", successTitle: "Köszönjük!", successDesc: "Hamarosan felvesszük Önnel a kapcsolatot." },
  sv: { formTitle: "Fyll i formuläret för att få mer information", fullName: "Fullständigt namn *", email: "E-post *", phone: "Telefonnummer", message: "Meddelande (valfritt)", consentPrefix: "Jag godkänner behandlingen av mina personuppgifter i enlighet med", privacyPolicy: "Integritetspolicyn", and: "och", termsOfService: "Användarvillkoren", consentSuffix: ". *", send: "Skicka", sending: "Skickar...", successTitle: "Tack!", successDesc: "Vi kontaktar dig inom kort." },
  no: { formTitle: "Fyll ut skjemaet for å motta mer informasjon", fullName: "Fullt navn *", email: "E-post *", phone: "Telefonnummer", message: "Melding (valgfritt)", consentPrefix: "Jeg samtykker til behandling av mine personopplysninger i samsvar med", privacyPolicy: "Personvernreglene", and: "og", termsOfService: "Tjenestevilkårene", consentSuffix: ". *", send: "Send", sending: "Sender...", successTitle: "Takk!", successDesc: "Vi kontakter deg snart." },
};

const formSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(5, 'Phone is required'),
  message: z.string().optional(),
  gdpr_consent: z.literal(true, { errorMap: () => ({ message: 'You must accept the privacy policy' }) }),
});

type FormData = z.infer<typeof formSchema>;

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string | null;
}

interface VillasLeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  language: string;
}

const VillasLeadFormModal: React.FC<VillasLeadFormModalProps> = ({ open, onOpenChange, property, language }) => {
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState<string>('');
  const ft = FORM_TRANSLATIONS[language] || FORM_TRANSLATIONS.en;

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { gdpr_consent: undefined as any },
  });

  const onSubmit = async (data: FormData) => {
    if (!property) return;
    setSubmitting(true);

    const [firstName, ...lastParts] = data.full_name.trim().split(' ');

    await registerCrmLead({
      firstName,
      lastName: lastParts.join(' ') || '',
      email: data.email,
      phone: data.phone,
      leadSource: 'Landing Form',
      leadSourceDetail: `villas_landing_${language}`,
      pageType: 'villas',
      pageUrl: window.location.href,
      pageTitle: document.title,
      language,
      propertyRef: property.title,
      propertyPrice: property.price,
      propertyType: property.property_type || undefined,
      interest: `${property.title} - ${property.location}`,
      message: data.message || `Interested in: ${property.title}`,
      referrer: document.referrer || undefined,
    });

    const { data: current } = await supabase
      .from('villas_properties')
      .select('inquiries')
      .eq('id', property.id)
      .single();
    if (current) {
      supabase.from('villas_properties').update({ inquiries: (current.inquiries || 0) + 1 }).eq('id', property.id);
    }

    toast({ title: ft.successTitle, description: ft.successDesc });
    reset();
    setPhone('');
    onOpenChange(false);
    setSubmitting(false);
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-landing-navy">{property.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPin size={14} /> {property.location}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-gray-600">{ft.formTitle}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <input
              {...register('full_name')}
              placeholder={ft.fullName}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-landing-gold focus:border-transparent outline-none"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <input
              {...register('email')}
              type="email"
              placeholder={ft.email}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-landing-gold focus:border-transparent outline-none"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <PhoneInput
              international
              defaultCountry="ES"
              value={phone}
              onChange={(val) => {
                setPhone(val || '');
                setValue('phone', val || '', { shouldValidate: true });
              }}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-landing-gold"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <textarea
              {...register('message')}
              placeholder={ft.message}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-landing-gold focus:border-transparent outline-none resize-none"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" {...register('gdpr_consent')} className="mt-1 accent-landing-gold" />
            <span>
              {ft.consentPrefix}{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-landing-gold underline hover:text-landing-goldDark">{ft.privacyPolicy}</a>
              {' '}{ft.and}{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-landing-gold underline hover:text-landing-goldDark">{ft.termsOfService}</a>
              {ft.consentSuffix}
            </span>
          </label>
          {errors.gdpr_consent && <p className="text-red-500 text-xs">{errors.gdpr_consent.message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-4 bg-landing-gold text-white rounded-lg font-bold hover:bg-landing-goldDark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="animate-spin" size={18} />}
            {submitting ? ft.sending : ft.send}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VillasLeadFormModal;
