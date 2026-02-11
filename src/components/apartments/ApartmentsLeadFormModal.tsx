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

interface ApartmentsLeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  language: string;
}

const ApartmentsLeadFormModal: React.FC<ApartmentsLeadFormModalProps> = ({ open, onOpenChange, property, language }) => {
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { gdpr_consent: undefined as any },
  });

  const onSubmit = async (data: FormData) => {
    if (!property) return;
    setSubmitting(true);

    const params = new URLSearchParams(window.location.search);
    const [firstName, ...lastParts] = data.full_name.trim().split(' ');

    await registerCrmLead({
      firstName,
      lastName: lastParts.join(' ') || '',
      email: data.email,
      phone: data.phone,
      leadSource: 'Landing Form',
      leadSourceDetail: `apartments_landing_${language}`,
      pageType: 'apartments',
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

    // Increment inquiries (fire-and-forget)
    const { data: current } = await supabase
      .from('apartments_properties')
      .select('inquiries')
      .eq('id', property.id)
      .single();
    if (current) {
      supabase.from('apartments_properties').update({ inquiries: (current.inquiries || 0) + 1 }).eq('id', property.id);
    }

    toast({ title: 'Thank you!', description: 'We will contact you shortly.' });
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <input
              {...register('full_name')}
              placeholder="Full Name *"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-landing-gold focus:border-transparent outline-none"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <input
              {...register('email')}
              type="email"
              placeholder="Email *"
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
              placeholder="Message (optional)"
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-landing-gold focus:border-transparent outline-none resize-none"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" {...register('gdpr_consent')} className="mt-1 accent-landing-gold" />
            <span>I agree to the processing of my personal data in accordance with the privacy policy. *</span>
          </label>
          {errors.gdpr_consent && <p className="text-red-500 text-xs">{errors.gdpr_consent.message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-4 bg-landing-gold text-white rounded-lg font-bold hover:bg-landing-goldDark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="animate-spin" size={18} />}
            {submitting ? 'Sending...' : 'Request Information'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApartmentsLeadFormModal;
