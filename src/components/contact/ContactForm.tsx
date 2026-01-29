import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendFormToGHL, getPageMetadata, parseFullName } from '@/lib/webhookHandler';
import { registerCrmLead } from '@/utils/crm/registerCrmLead';
import { Link } from 'react-router-dom';

interface ContactFormTranslations {
  form: {
    headline: string;
    subheadline: string;
    fields: {
      fullName: string;
      email: string;
      phone: string;
      language: string;
      subject: string;
      message: string;
      referral: string;
      privacy: string;
    };
    subjects: {
      general: string;
      property: string;
      selling: string;
      viewing: string;
      other: string;
    };
    referrals: {
      google: string;
      socialMedia: string;
      referral: string;
      advertisement: string;
      other: string;
    };
    submit: string;
    submitting: string;
    success: {
      title: string;
      description: string;
    };
  };
}

interface ContactFormProps {
  t: ContactFormTranslations;
  language: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' },
  { code: 'da', name: 'Dansk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'pl', name: 'Polski' },
  { code: 'hu', name: 'Magyar' },
];

export const ContactForm: React.FC<ContactFormProps> = ({ t, language }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredLanguage: language,
    subject: '',
    message: '',
    referral: '',
    privacy: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.message || !formData.privacy) {
      toast({
        title: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { firstName, lastName } = parseFullName(formData.fullName);
      const metadata = getPageMetadata();

      // 1. Save to leads table
      await supabase.from('leads').insert({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        comment: formData.message,
        language: formData.preferredLanguage,
        source: 'contact_page',
        page_url: metadata.pageUrl,
        user_agent: navigator.userAgent,
      });

      // 2. Send to GHL webhook
      await sendFormToGHL({
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone,
        message: `Subject: ${formData.subject}\n\n${formData.message}${formData.referral ? `\n\nReferral: ${formData.referral}` : ''}`,
        leadSource: 'Website Form',
        leadSourceDetail: `contact_page_${language}`,
        pageType: 'contact_page',
        language: formData.preferredLanguage,
        initialLeadScore: 30,
      });

      // 3. Register in CRM
      await registerCrmLead({
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone || '',
        leadSource: 'Website Form',
        leadSourceDetail: `contact_page_${language}`,
        pageType: 'contact_page',
        pageUrl: metadata.pageUrl,
        pageTitle: metadata.pageTitle,
        language: formData.preferredLanguage,
        message: formData.message,
        initialLeadScore: 30,
      });

      // 4. Track GA4 event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'generate_lead', {
          event_category: 'Contact',
          event_label: 'contact_form',
          value: 30,
        });
      }

      // 5. Show success
      setIsSubmitted(true);

      // 6. Trigger Emma chat after 2 seconds
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openEmmaChat'));
      }, 2000);

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again or contact us via WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
                {t.form.success.title}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t.form.success.description}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {t.form.headline}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t.form.subheadline}
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6"
          >
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" className="text-foreground font-medium">
                {t.form.fields.fullName} *
              </Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-2 h-12"
                required
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="text-foreground font-medium">
                  {t.form.fields.email} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-2 h-12"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-foreground font-medium">
                  {t.form.fields.phone}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-2 h-12"
                />
              </div>
            </div>

            {/* Language & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-foreground font-medium">
                  {t.form.fields.language}
                </Label>
                <Select
                  value={formData.preferredLanguage}
                  onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value })}
                >
                  <SelectTrigger className="mt-2 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground font-medium">
                  {t.form.fields.subject}
                </Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger className="mt-2 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t.form.subjects.general}</SelectItem>
                    <SelectItem value="property">{t.form.subjects.property}</SelectItem>
                    <SelectItem value="selling">{t.form.subjects.selling}</SelectItem>
                    <SelectItem value="viewing">{t.form.subjects.viewing}</SelectItem>
                    <SelectItem value="other">{t.form.subjects.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message" className="text-foreground font-medium">
                {t.form.fields.message} *
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="mt-2 min-h-[150px]"
                required
              />
            </div>

            {/* Referral */}
            <div>
              <Label className="text-foreground font-medium">
                {t.form.fields.referral}
              </Label>
              <Select
                value={formData.referral}
                onValueChange={(value) => setFormData({ ...formData, referral: value })}
              >
                <SelectTrigger className="mt-2 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">{t.form.referrals.google}</SelectItem>
                  <SelectItem value="social">{t.form.referrals.socialMedia}</SelectItem>
                  <SelectItem value="referral">{t.form.referrals.referral}</SelectItem>
                  <SelectItem value="ad">{t.form.referrals.advertisement}</SelectItem>
                  <SelectItem value="other">{t.form.referrals.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Privacy */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={formData.privacy}
                onCheckedChange={(checked) => setFormData({ ...formData, privacy: checked as boolean })}
                className="mt-1"
              />
              <Label htmlFor="privacy" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                {t.form.fields.privacy}{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-lg font-semibold bg-prime-gold hover:bg-prime-gold/90 text-prime-900"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t.form.submitting}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {t.form.submit}
                </>
              )}
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
