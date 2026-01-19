/**
 * Universal Webhook Handler
 * Sends all lead submissions (Emma chatbot + traditional forms) to GoHighLevel
 */

const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/281Nzx90nVL8424QY4Af/webhook-trigger/4549e52b-32b2-4fc6-ab3c-8e7fe895433a';

export interface PageMetadata {
  pageType: string;
  language: string;
  pageUrl: string;
  pageTitle: string;
  referrer: string;
  timestamp: string;
}

export interface FormWebhookPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  propertyRef?: string;
  propertyPrice?: string;
  propertyType?: string;
  cityName?: string;
  citySlug?: string;
  interest?: string;
  leadSource: string;
  leadSourceDetail: string;
  pageType: string;
  language: string;
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
  timestamp: string;
  initialLeadScore: number;
}

export interface EmmaWebhookPayload {
  // Contact Information
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  country_prefix?: string;
  
  // Simplified GHL structure
  timeline: string;
  buyerProfile: string;
  budget: string;
  areasOfInterest: string[];
  propertyType: string[];
  specificNeeds: string[];
  
  // Emma metadata
  leadSource: string;
  leadSourceDetail: string;
  emmaConversationStatus: string;
  emmaQuestionsAnswered: number;
  emmaIntakeComplete: boolean;
  emmaConversationDuration?: string;
  emmaExitPoint: string;
  
  // Page context
  pageType: string;
  language: string;
  pageUrl: string;
  pageTitle: string;
  referrer: string;
  timestamp: string;
  
  // Calculated fields
  leadSegment: string;
  initialLeadScore: number;
}

/**
 * Detect page type from URL pathname
 */
export function detectPageType(pathname: string): string {
  // Strip language prefix for matching
  const pathWithoutLang = pathname.replace(/^\/(en|nl|de|fr|fi|pl|da|hu|sv|no)/, '');
  
  if (pathWithoutLang === '' || pathWithoutLang === '/') return 'homepage';
  if (pathWithoutLang.startsWith('/locations/')) return 'location_page';
  if (pathWithoutLang.startsWith('/brochures/')) return 'brochure_page';
  if (pathWithoutLang.startsWith('/blog/')) return 'blog_page';
  if (pathWithoutLang.startsWith('/qa/')) return 'qa_page';
  if (pathWithoutLang.startsWith('/buyers-guide')) return 'buyers_guide';
  if (pathWithoutLang.startsWith('/glossary')) return 'glossary';
  if (pathWithoutLang.startsWith('/contact')) return 'contact_page';
  if (pathWithoutLang.startsWith('/properties/')) return 'property_detail';
  if (pathWithoutLang.startsWith('/compare')) return 'comparison_page';
  if (pathWithoutLang.startsWith('/landing')) return 'landing_page';
  
  return 'other';
}

/**
 * Detect language from URL pathname
 */
export function detectLanguage(pathname: string): string {
  const match = pathname.match(/^\/(en|nl|de|fr|fi|pl|da|hu|sv|no)/);
  return match ? match[1] : 'en';
}

/**
 * Get complete page metadata for webhook
 */
export function getPageMetadata(): PageMetadata {
  if (typeof window === 'undefined') {
    return {
      pageType: 'unknown',
      language: 'en',
      pageUrl: '',
      pageTitle: '',
      referrer: 'Direct',
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    pageType: detectPageType(window.location.pathname),
    language: detectLanguage(window.location.pathname),
    pageUrl: window.location.href,
    pageTitle: document.title,
    referrer: document.referrer || 'Direct',
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate lead segment from timeline and buyer profile
 * Used for GHL automation and lead scoring
 */
export function calculateLeadSegment(timeline: string, buyerProfile: string): string {
  const readinessMap: Record<string, string> = {
    'within_6_months': 'Hot',
    'within_1_year': 'Warm',
    'within_2_years': 'Cool',
    'longer_than_2_years': 'Cold',
    '0-3 months': 'Hot',
    '3-6 months': 'Warm',
    '6-12 months': 'Cool',
    '12+ months': 'Cold',
    'Not sure': 'Cold'
  };
  
  const profileMap: Record<string, string> = {
    'Young Family': 'Young_Family',
    'Professional/Remote Worker': 'Professional',
    'Pre-Retiree': 'Pre_Retiree',
    'Retiree': 'Retiree',
    'Investor': 'Investor',
    'primary_residence': 'Primary',
    'holiday': 'Holiday',
    'investment': 'Investor',
    'winter_stay': 'Seasonal'
  };
  
  const readiness = readinessMap[timeline] || 'Cool';
  const profile = profileMap[buyerProfile] || 'General';
  
  return `${readiness}_${profile}`;
}

/**
 * Parse full name into first and last name
 */
export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

/**
 * Calculate conversation duration from start time
 */
export function calculateDuration(startTime: Date | number): string {
  const start = typeof startTime === 'number' ? startTime : startTime.getTime();
  const duration = Date.now() - start;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Send data to GHL webhook with retry logic
 * Returns true if successful, false if failed
 */
export async function sendToGHL(payload: Record<string, unknown>): Promise<boolean> {
  console.log('📤 Sending to GHL webhook:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.warn('⚠️ GHL webhook failed, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const retryResponse = await fetch(GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Retry failed: ${retryResponse.status}`);
      }
    }
    
    console.log('✅ GHL webhook sent successfully');
    return true;
  } catch (error) {
    console.error('❌ GHL webhook error:', error);
    
    // Store in localStorage as backup for later retry
    if (typeof window !== 'undefined') {
      try {
        const failed = JSON.parse(localStorage.getItem('failedWebhooks') || '[]');
        failed.push({ 
          payload, 
          timestamp: new Date().toISOString(), 
          error: String(error) 
        });
        // Keep only last 50 failed webhooks
        if (failed.length > 50) failed.shift();
        localStorage.setItem('failedWebhooks', JSON.stringify(failed));
      } catch (storageError) {
        console.error('Failed to store webhook in localStorage:', storageError);
      }
    }
    
    return false;
  }
}

/**
 * Send traditional form data to GHL
 */
export async function sendFormToGHL(formData: Partial<FormWebhookPayload>): Promise<boolean> {
  const metadata = getPageMetadata();
  
  const payload: FormWebhookPayload = {
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    email: formData.email || '',
    phone: formData.phone || '',
    message: formData.message || '',
    propertyRef: formData.propertyRef,
    propertyPrice: formData.propertyPrice,
    propertyType: formData.propertyType,
    cityName: formData.cityName,
    citySlug: formData.citySlug,
    interest: formData.interest,
    leadSource: formData.leadSource || 'Website Form',
    leadSourceDetail: formData.leadSourceDetail || `${metadata.pageType}_${metadata.language}`,
    pageType: formData.pageType || metadata.pageType,
    language: formData.language || metadata.language,
    pageUrl: formData.pageUrl || metadata.pageUrl,
    pageTitle: formData.pageTitle || metadata.pageTitle,
    referrer: formData.referrer || metadata.referrer,
    timestamp: metadata.timestamp,
    initialLeadScore: formData.initialLeadScore || 20
  };
  
  return sendToGHL(payload as unknown as Record<string, unknown>);
}

/**
 * Send Emma chatbot data to GHL with enhanced payload structure
 */
export async function sendEmmaToGHL(emmaData: Partial<EmmaWebhookPayload>): Promise<boolean> {
  const metadata = getPageMetadata();
  
  const payload: EmmaWebhookPayload = {
    // Contact Information
    firstName: emmaData.firstName || '',
    lastName: emmaData.lastName || '',
    email: emmaData.email || '',
    phone: emmaData.phone || '',
    country_prefix: emmaData.country_prefix || '',
    
    // Simplified GHL structure
    timeline: emmaData.timeline || '',
    buyerProfile: emmaData.buyerProfile || '',
    budget: emmaData.budget || '',
    areasOfInterest: emmaData.areasOfInterest || [],
    propertyType: emmaData.propertyType || [],
    specificNeeds: emmaData.specificNeeds || [],
    
    // Emma metadata
    leadSource: 'Emma Chatbot',
    leadSourceDetail: emmaData.leadSourceDetail || `emma_chat_${metadata.language}`,
    emmaConversationStatus: emmaData.emmaConversationStatus || 'partial',
    emmaQuestionsAnswered: emmaData.emmaQuestionsAnswered || 0,
    emmaIntakeComplete: emmaData.emmaIntakeComplete || false,
    emmaConversationDuration: emmaData.emmaConversationDuration,
    emmaExitPoint: emmaData.emmaExitPoint || 'unknown',
    
    // Page context
    pageType: emmaData.pageType || metadata.pageType,
    language: emmaData.language || metadata.language,
    pageUrl: emmaData.pageUrl || metadata.pageUrl,
    pageTitle: emmaData.pageTitle || metadata.pageTitle,
    referrer: emmaData.referrer || metadata.referrer,
    timestamp: metadata.timestamp,
    
    // Calculated fields
    leadSegment: emmaData.leadSegment || calculateLeadSegment(
      emmaData.timeline || 'Not sure',
      emmaData.buyerProfile || 'General'
    ),
    initialLeadScore: emmaData.initialLeadScore || (emmaData.emmaIntakeComplete ? 25 : 15)
  };
  
  return sendToGHL(payload as unknown as Record<string, unknown>);
}
