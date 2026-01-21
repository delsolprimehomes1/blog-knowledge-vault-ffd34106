
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { LanguageCode } from '@/utils/landing/languageDetection';
import { submitLeadFunction } from '@/utils/landing/leadSubmission';
import { trackEvent } from '@/utils/landing/analytics';

// Schema Definition
const formSchema = z.object({
    fullName: z.string().min(2, "Name is too short"),
    whatsapp_sms: z.string().min(6, "Phone number is invalid"),
    comment: z.string().optional(),
    consent: z.boolean().refine(val => val === true, "You must agree to the terms"),
});

type FormValues = z.infer<typeof formSchema>;

export interface LeadFormProps {
    language: LanguageCode;
    translations: {
        title?: string;
        fields?: { fullName: string; contactField: string; contactFieldAlt?: string; comment: string };
        consent?: string;
        submit?: string;
        recaptcha?: string;
        success?: string;
        error?: string;
        [key: string]: any;
    };
    propertyId?: string;
    propertyName?: string;
    propertyCategory?: string;
    propertyLocation?: string;
    propertyPrice?: number;
    propertyRef?: string;
    source?: string;
    onSuccess: () => void;
    className?: string;
}

const LeadForm: React.FC<LeadFormProps> = ({
    language,
    translations,
    propertyId,
    propertyName,
    propertyCategory,
    propertyLocation,
    propertyPrice,
    propertyRef,
    source = 'landing_form',
    onSuccess,
    className
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { control, register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            consent: false,
        }
    });

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        setErrorMsg(null);

        trackEvent('lead_form_submit_attempt', { category: 'Conversion', language, propertyId });

        try {
            const success = await submitLeadFunction({
                fullName: data.fullName,
                phone: data.whatsapp_sms,
                countryCode: 'XX',
                comment: data.comment,
                consent: data.consent,
                language,
                propertyInterest: propertyId,
                propertyName,
                propertyCategory,
                propertyLocation,
                propertyPrice,
                propertyRef,
                source
            });

            if (success) {
                trackEvent('lead_form_submit', { category: 'Conversion', language, propertyId });
                onSuccess();
                reset();
            } else {
                throw new Error('Submission failed');
            }
        } catch (err) {
            setErrorMsg(translations?.error || "Submission Error");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "flex h-12 w-full rounded-sm border border-gray-200 bg-gray-50 px-4 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-landing-navy";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className || ''}`}>
            <input type="hidden" name="project_interest" value={propertyId || ''} />

            <div className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-landing-navy font-bold">{translations.fields?.fullName || "Full Name"}</Label>
                    <Input
                        id="fullName"
                        {...register('fullName')}
                        className={`${inputClasses} ${errors.fullName ? "border-red-500" : ""}`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="whatsapp_sms" className="text-landing-navy font-bold">{translations.form?.contactField || translations.fields?.contactField || "WhatsApp / SMS number"}</Label>
                    <Controller
                        name="whatsapp_sms"
                        control={control}
                        render={({ field }) => (
                            <PhoneInput
                                international
                                defaultCountry="ES"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="+34 600 123 456"
                                className={`flex h-12 w-full rounded-sm border border-gray-200 bg-gray-50 px-4 py-2 text-base text-landing-navy focus-within:ring-2 focus-within:ring-landing-gold focus-within:ring-offset-2 ${errors.whatsapp_sms ? "border-red-500" : ""}`}
                            />
                        )}
                    />
                    {errors.whatsapp_sms && <p className="text-xs text-red-500">{errors.whatsapp_sms.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="comment" className="text-landing-navy font-bold">{translations.fields?.comment || "Comment (optional)"}</Label>
                    <Textarea
                        id="comment"
                        {...register('comment')}
                        rows={3}
                        className={`${inputClasses} h-auto min-h-[100px] py-3`}
                    />
                </div>

                <div className="flex items-start space-x-3 pt-2">
                    <Controller
                        name="consent"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="consent"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1 border-gray-300 data-[state=checked]:bg-landing-gold data-[state=checked]:text-white"
                            />
                        )}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="consent" className="text-sm font-normal text-landing-text-secondary leading-normal">
                            {translations.form?.consent || translations.consent || "I agree to receive relevant information."}
                        </Label>
                        {errors.consent && <p className="text-xs text-red-500">{errors.consent.message}</p>}
                    </div>
                </div>
            </div>

            {errorMsg && <p className="text-sm text-red-500 text-center">{errorMsg}</p>}

            <Button
                type="submit"
                className="w-full bg-landing-navy hover:bg-landing-navy/90 text-white h-14 text-lg font-bold rounded-sm shadow-md"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Sending...' : (translations.submit || "Request Information")}
            </Button>

            <p className="text-[10px] text-gray-400 text-center leading-tight">
                {translations.recaptcha}
            </p>
        </form>
    );
};

export default LeadForm;
