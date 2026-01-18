import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { sendFormToGHL, getPageMetadata, parseFullName } from '@/lib/webhookHandler';

interface ClassicOptinProps {
    language: string;
    translations?: any;
}

const ClassicOptin: React.FC<ClassicOptinProps> = ({ language, translations }) => {
    const { toast } = useToast();
    const t = translations || {};
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        interest: 'both',
        consent: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, consent: e.target.checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.consent) {
            toast({
                title: "Consent Required",
                description: "Please agree to receive updates to continue.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('submit-lead-form', {
                body: {
                    name: formData.fullName,
                    contact: formData.phone,
                    interest: formData.interest,
                    language: language,
                    source: 'landing_classic_optin',
                    metadata: {
                        form_type: 'classic_optin',
                        consent: true
                    }
                }
            });

            if (error) throw error;

            // NEW: Send to GHL webhook
            const pageMetadata = getPageMetadata();
            const { firstName, lastName } = parseFullName(formData.fullName);
            
            await sendFormToGHL({
                firstName,
                lastName,
                phone: formData.phone,
                interest: formData.interest,
                leadSource: 'Website Form',
                leadSourceDetail: `landing_classic_${pageMetadata.language}`,
                pageType: pageMetadata.pageType,
                language: language,
                pageUrl: pageMetadata.pageUrl,
                pageTitle: pageMetadata.pageTitle,
                referrer: pageMetadata.referrer,
                timestamp: pageMetadata.timestamp,
                initialLeadScore: 20
            });
            console.log('[Classic Optin] GHL webhook sent');

            setIsSuccess(true);
            toast({
                title: "Success",
                description: t.success || "Thank you! You'll receive details within 24 hours.",
            });

        } catch (error) {
            console.error('Submission error:', error);
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <section className="py-12 sm:py-16 lg:py-24 bg-white">
                <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
                    <div className="bg-green-50 rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-green-100">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                            <Check className="text-green-600 w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-bold text-landing-navy mb-2">
                            {t.success || "Thank you! You'll receive details within 24 hours."}
                        </h3>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-12 sm:py-16 lg:py-24 bg-white border-t border-gray-100">
            <div 
                ref={elementRef as React.RefObject<HTMLDivElement>}
                className={`container mx-auto px-4 sm:px-6 max-w-2xl transition-all duration-700 ease-out ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-sans text-landing-navy mb-3 sm:mb-4 px-2">
                        {t.headline || "Receive project details via WhatsApp or SMS — at your convenience."}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6 bg-gray-50 p-5 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
                    {/* Name */}
                    <div>
                        <label htmlFor="fullName" className="block text-xs sm:text-sm font-bold text-landing-navy mb-1.5 sm:mb-2">
                            {t.fields?.fullName || "Full Name"}
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            required
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-landing-gold focus:ring-2 focus:ring-landing-gold/20 outline-none transition-all text-sm sm:text-base"
                            placeholder="Your full name"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-xs sm:text-sm font-bold text-landing-navy mb-1.5 sm:mb-2">
                            {t.fields?.phone || "WhatsApp / SMS Number"}
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-landing-gold focus:ring-2 focus:ring-landing-gold/20 outline-none transition-all text-sm sm:text-base"
                            placeholder="+1 234 567 8900"
                        />
                    </div>

                    {/* Interest Dropdown */}
                    <div>
                        <label htmlFor="interest" className="block text-xs sm:text-sm font-bold text-landing-navy mb-1.5 sm:mb-2">
                            {t.fields?.interest || "I'm interested in"}
                        </label>
                        <div className="relative">
                            <select
                                id="interest"
                                name="interest"
                                value={formData.interest}
                                onChange={handleChange}
                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-landing-gold focus:ring-2 focus:ring-landing-gold/20 outline-none transition-all appearance-none bg-white text-sm sm:text-base"
                            >
                                <option value="apartments">{t.fields?.interestOptions?.apartments || "Apartments & Penthouses"}</option>
                                <option value="villas">{t.fields?.interestOptions?.villas || "Townhouses & Villas"}</option>
                                <option value="both">{t.fields?.interestOptions?.both || "Both"}</option>
                            </select>
                            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Consent Checkbox */}
                    <div className="flex items-start gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                        <div className="flex items-center h-5 mt-0.5">
                            <input
                                id="consent"
                                name="consent"
                                type="checkbox"
                                checked={formData.consent}
                                onChange={handleCheckboxChange}
                                className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-landing-navy focus:ring-landing-gold"
                            />
                        </div>
                        <div className="text-xs sm:text-sm">
                            <label htmlFor="consent" className="font-medium text-gray-700">
                                {t.checkbox || "I agree to receive property updates via WhatsApp/SMS"}
                            </label>
                            <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                                We respect your privacy. No spam, ever.
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 sm:py-3.5 lg:py-4 bg-landing-navy text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl hover:bg-landing-gold transition-colors duration-300 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                                Sending...
                            </>
                        ) : (
                            t.button || "Send me the details"
                        )}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default ClassicOptin;
