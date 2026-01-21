import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LanguageCode } from '@/utils/landing/languageDetection';
import LeadForm from './LeadForm';

interface LeadCaptureFormProps {
    isOpen: boolean;
    onClose: () => void;
    language: LanguageCode;
    translations: any;
    propertyId?: string;
    propertyName?: string;
    propertyCategory?: string;
    propertyLocation?: string;
    propertyPrice?: number;
    propertyRef?: string;
    source?: string;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
    isOpen,
    onClose,
    language,
    translations,
    propertyId,
    propertyName,
    propertyCategory,
    propertyLocation,
    propertyPrice,
    propertyRef,
    source = 'landing_page_modal'
}) => {
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSuccess = () => {
        setIsSuccess(true);
        setTimeout(() => {
            onClose();
            setTimeout(() => setIsSuccess(false), 300);
        }, 3000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white border-0 shadow-2xl p-8 md:p-10">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-serif text-landing-navy text-center">
                        {isSuccess ? 'Response Received' : (translations.title || "Request Information")}
                    </DialogTitle>
                    {isSuccess && (
                        <p className="text-center text-landing-gold mt-2 font-medium">
                            {translations.success || "Thank you! We'll be in touch shortly."}
                        </p>
                    )}
                </DialogHeader>

                {!isSuccess && (
                    <LeadForm
                        language={language}
                        translations={translations}
                        propertyId={propertyId}
                        propertyName={propertyName}
                        propertyCategory={propertyCategory}
                        propertyLocation={propertyLocation}
                        propertyPrice={propertyPrice}
                        propertyRef={propertyRef}
                        source={source}
                        onSuccess={handleSuccess}
                        className="space-y-6"
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default LeadCaptureForm;
