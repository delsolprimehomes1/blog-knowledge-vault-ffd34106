// WhatsApp message templates with token placeholders
export interface WhatsAppTemplate {
  id: string;
  label: string;
  message: string;
  category: 'follow_up' | 'property' | 'viewing' | 'general';
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'follow_up',
    label: 'Standard Follow-up',
    message: `Hi {firstName}, this is {agentName} from Del Sol Prime Homes. I just tried calling you about your property inquiry. Would love to discuss your requirements. When would be a good time to talk?`,
    category: 'follow_up'
  },
  {
    id: 'missed_call',
    label: 'Missed Call',
    message: `Hi {firstName}, I noticed I missed your call. I'm {agentName} from Del Sol Prime Homes. How can I help you today?`,
    category: 'follow_up'
  },
  {
    id: 'property_info',
    label: 'Property Information',
    message: `Hi {firstName}! Thanks for your interest in Costa del Sol properties. I have some excellent options that match your criteria. Can I send you details?`,
    category: 'property'
  },
  {
    id: 'viewing_invite',
    label: 'Viewing Invitation',
    message: `Hello {firstName}, I'd love to show you some properties that match what you're looking for. Are you available for a viewing this week?`,
    category: 'viewing'
  },
  {
    id: 'thank_you',
    label: 'Thank You',
    message: `Hi {firstName}, thank you for your interest in Costa del Sol properties! I'm {agentName} and I'll be your dedicated property consultant. Feel free to message me with any questions!`,
    category: 'general'
  },
  {
    id: 'custom',
    label: 'Custom Message',
    message: '',
    category: 'general'
  }
];

export interface TemplateTokens {
  firstName?: string;
  lastName?: string;
  agentName?: string;
  propertyRef?: string;
  cityName?: string;
}

/**
 * Replace template tokens with actual values
 */
export function replaceTemplateTokens(template: string, tokens: TemplateTokens): string {
  let result = template;
  
  if (tokens.firstName) {
    result = result.replace(/{firstName}/g, tokens.firstName);
  }
  if (tokens.lastName) {
    result = result.replace(/{lastName}/g, tokens.lastName);
  }
  if (tokens.agentName) {
    result = result.replace(/{agentName}/g, tokens.agentName);
  }
  if (tokens.propertyRef) {
    result = result.replace(/{propertyRef}/g, tokens.propertyRef);
  }
  if (tokens.cityName) {
    result = result.replace(/{cityName}/g, tokens.cityName);
  }
  
  return result;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WhatsAppTemplate | undefined {
  return WHATSAPP_TEMPLATES.find(t => t.id === id);
}

/**
 * Open WhatsApp with pre-filled message
 */
export function openWhatsApp(phoneNumber: string, message: string): void {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
}
