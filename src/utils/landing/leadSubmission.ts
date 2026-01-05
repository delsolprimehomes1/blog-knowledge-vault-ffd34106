import { LanguageCode } from './languageDetection';
import { captureUTM } from './analytics';
import { supabase } from '@/integrations/supabase/client';

export interface LeadData {
    fullName: string;
    phone: string;
    countryCode: string;
    email?: string;
    comment?: string;
    consent: boolean;
    propertyInterest?: string;
    language: LanguageCode;
    source?: string;
}

export const submitLeadFunction = async (data: LeadData): Promise<boolean> => {
    const utmData = captureUTM();
    
    const submissionData = {
        full_name: data.fullName,
        phone: data.phone,
        country_code: data.countryCode,
        email: data.email || null,
        comment: data.comment || null,
        consent: data.consent,
        property_interest: data.propertyInterest || null,
        language: data.language,
        source: data.source || 'landing_form',
        utm_source: utmData.utm_source || null,
        utm_medium: utmData.utm_medium || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_content: utmData.utm_content || null,
        utm_term: utmData.utm_term || null,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        status: 'new'
    };

    console.log('[Lead Submission] Submitting to database:', submissionData);

    const { error } = await supabase.from('leads').insert([submissionData]);
    
    if (error) {
        console.error('[Lead Submission] Error:', error);
        throw error;
    }

    console.log('[Lead Submission] Successfully saved to database');
    return true;
};
