import { LanguageCode } from './languageDetection';
import { captureUTM } from './analytics';
import { supabase } from '@/integrations/supabase/client';
import { sendFormToGHL, getPageMetadata, parseFullName } from '@/lib/webhookHandler';
import { registerCrmLead } from '@/utils/crm/registerCrmLead';

export interface LeadData {
    fullName: string;
    phone: string;
    countryCode: string;
    email?: string;
    comment?: string;
    consent: boolean;
    propertyInterest?: string;
    propertyName?: string;
    propertyCategory?: string;
    propertyLocation?: string;
    propertyPrice?: number;
    propertyRef?: string;
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
    
    // NEW: Send to GHL webhook
    const pageMetadata = getPageMetadata();
    const { firstName, lastName } = parseFullName(data.fullName);
    
    await sendFormToGHL({
        firstName,
        lastName,
        email: data.email || '',
        phone: `${data.countryCode}${data.phone}`,
        message: data.comment || '',
        leadSource: 'Website Form',
        leadSourceDetail: `${pageMetadata.pageType}_${pageMetadata.language}`,
        pageType: pageMetadata.pageType,
        language: data.language,
        pageUrl: pageMetadata.pageUrl,
        pageTitle: pageMetadata.pageTitle,
        referrer: pageMetadata.referrer,
        timestamp: pageMetadata.timestamp,
        initialLeadScore: 20
    });
    
    console.log('[Lead Submission] GHL webhook sent');
    
    // Build formatted interest string for CRM
    const formattedInterest = data.propertyName 
        ? `${data.propertyName}${data.propertyCategory ? ` - ${data.propertyCategory}` : ''}${data.propertyLocation ? ` - ${data.propertyLocation}` : ''}`
        : undefined;
    
    // Register in CRM system for agent dashboard
    await registerCrmLead({
        firstName,
        lastName,
        email: data.email,
        phone: `${data.countryCode}${data.phone}`,
        countryPrefix: data.countryCode,
        leadSource: 'Landing Form',
        leadSourceDetail: `${pageMetadata.pageType}_${pageMetadata.language}`,
        pageType: pageMetadata.pageType,
        pageUrl: pageMetadata.pageUrl,
        pageTitle: pageMetadata.pageTitle,
        language: data.language,
        propertyRef: data.propertyRef,
        propertyPrice: data.propertyPrice,
        propertyType: data.propertyCategory,
        interest: formattedInterest,
        message: data.comment,
        referrer: pageMetadata.referrer,
        timestamp: pageMetadata.timestamp,
        initialLeadScore: 20
    });
    
    console.log('[Lead Submission] CRM registration sent');
    
    return true;
};
