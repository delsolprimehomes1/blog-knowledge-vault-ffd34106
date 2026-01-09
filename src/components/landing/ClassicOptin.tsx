import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ClassicOptinProps {
    language: string;
    translations?: any;
}

const ClassicOptin: React.FC<ClassicOptinProps> = ({ language, translations }) => {
    const { toast } = useToast();
    const t = translations || {};
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State
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
            // Call the submit-lead-form edge function
            const { data, error } = await supabase.functions.invoke('submit-lead-form', {
                body: {
                    name: formData.fullName,
                    contact: formData.phone, // Phone mapped to contact field
                    interest: formData.interest,
                    language: language,
                    source: 'landing_classic_optin', // Tag to identify source
                    metadata: {
                        form_type: 'classic_optin',
                        consent: true
                    }
                }
            });

            if (error) throw error;

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
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-2xl text-center">
                    <div className="bg-green-50 rounded-3xl p-12 border border-green-100">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="text-green-600 w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-landing-navy mb-2">
                            {t.success || "Thank you! You'll receive details within 24 hours."}
                        </h3>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-24 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-sans text-landing-navy mb-4">
                        {t.headline || "Receive project details via WhatsApp or SMS — at your convenience."}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
                    {/* Name */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-bold text-landing-navy mb-2">
                            {t.fields?.fullName || "Full Name"}
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            required
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-landing-gold focus:ring-2 focus:ring-landing-gold/20 outline-none transition-all"
                            placeholder="Your full name"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-landing-navy mb-2">
                            {t.fields?.phone || "WhatsApp / SMS Number"}
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-landing-gold focus:ring-2 focus:ring-landing-gold/20 outline-none transition-all"
                            placeholder="+1 234 567 8900"
                        />
                    </div>

                    {/* Interest Dropdown */}
                    <div>
                        <label htmlFor="interest" className="block text-sm font-bold text-landing-navy mb-2">
                            {t.fields?.interest || "I'm interested in"}
                        </label>
                        <div className="relative">
                            <select
                                id="interest"
                                name="interest"
                                value={formData.interest}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-landing-gold focus:ring-2 focus:ring-landing-gold/20 outline-none transition-all appearance-none bg-white"
                            >
                                <option value="apartments">{t.fields?.interestOptions?.apartments || "Apartments & Penthouses"}</option>
                                <option value="villas">{t.fields?.interestOptions?.villas || "Townhouses & Villas"}</option>
                                <option value="both">{t.fields?.interestOptions?.both || "Both"}</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Consent Checkbox */}
                    <div className="flex items-start gap-3 pt-2">
                        <div className="flex items-center h-5">
                            <input
                                id="consent"
                                name="consent"
                                type="checkbox"
                                checked={formData.consent}
                                onChange={handleCheckboxChange}
                                className="w-5 h-5 rounded border-gray-300 text-landing-navy focus:ring-landing-gold"
                            />
                        </div>
                        <div className="text-sm">
                            <label htmlFor="consent" className="font-medium text-gray-700">
                                {t.checkbox || "I agree to receive property updates via WhatsApp/SMS"}
                            </label>
                            <p className="text-gray-500 text-xs mt-1">
                                We respect your privacy. No spam, ever.
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-landing-navy text-white font-bold rounded-xl hover:bg-landing-gold transition-colors duration-300 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
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
