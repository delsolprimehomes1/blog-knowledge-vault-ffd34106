import { supabase } from '@/integrations/supabase/client';

export interface CrmLeadData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  countryPrefix?: string;
  leadSource: 'Landing Form' | 'Property Inquiry' | 'Brochure Download' | 'Emma Chatbot' | 'Website Form';
  leadSourceDetail: string;
  pageType: string;
  pageUrl: string;
  pageTitle: string;
  language: string;
  propertyRef?: string;
  propertyPrice?: number;
  propertyType?: string;
  interest?: string; // Human-readable: "SAVIA - Villa - MIJAS"
  message?: string;
  referrer?: string;
  timestamp?: string;
  initialLeadScore?: number;
}

/**
 * Registers a lead in the CRM system by calling the register-crm-lead edge function.
 * This is non-blocking - errors are logged but don't fail the main form submission.
 */
export async function registerCrmLead(data: CrmLeadData): Promise<boolean> {
  try {
    console.log('[CRM Registration] Sending lead to CRM:', data);
    
    const { data: response, error } = await supabase.functions.invoke('register-crm-lead', {
      body: data
    });

    if (error) {
      console.error('[CRM Registration] Edge function error:', error);
      return false;
    }

    console.log('[CRM Registration] Successfully registered lead in CRM:', response);
    return true;
  } catch (err) {
    console.error('[CRM Registration] Unexpected error:', err);
    return false;
  }
}
