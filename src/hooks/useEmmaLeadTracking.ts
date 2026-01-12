import { supabase } from '@/integrations/supabase/client';

export interface EmmaLeadData {
  conversation_id: string;
  // Contact Info
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  country_prefix?: string;
  // Q&A Phase
  question_1?: string;
  answer_1?: string;
  question_2?: string;
  answer_2?: string;
  question_3?: string;
  answer_3?: string;
  questions_answered?: number;
  // Property Criteria
  location_preference?: string[];
  sea_view_importance?: string;
  budget_range?: string;
  bedrooms_desired?: string;
  property_type?: string[];
  property_purpose?: string;
  timeframe?: string;
  // System Data
  detected_language?: string;
  intake_complete?: boolean;
  declined_selection?: boolean;
  conversation_status?: string;
  exit_point?: string;
  // Webhook tracking
  webhook_sent?: boolean;
  webhook_payload?: any;
}

// Extract property criteria from conversation history
export const extractPropertyCriteriaFromHistory = (messages: Array<{ role: string; content: string }>): Partial<EmmaLeadData> => {
  const criteria: Partial<EmmaLeadData> = {};
  
  // Location patterns (common Costa del Sol locations)
  const locationPatterns = [
    'marbella', 'benahavís', 'benahavis', 'estepona', 'mijas', 'mijas costa',
    'fuengirola', 'benalmádena', 'benalmadena', 'torremolinos', 'manilva', 'casares',
    'sotogrande', 'san pedro', 'nueva andalucia', 'puerto banus', 'la cala'
  ];
  
  // Sea view patterns
  const seaViewPatterns = [
    { pattern: /essential|must have|very important/i, value: 'essential' },
    { pattern: /depends on price|nice to have|would be nice/i, value: 'depends_on_price' },
    { pattern: /not important|doesn't matter|no preference/i, value: 'not_important' }
  ];
  
  // Budget patterns
  const budgetPatterns = [
    { pattern: /€?350k?\s*[-–]\s*€?500k?|350,?000|350000|under 500/i, value: '€350k-€500k' },
    { pattern: /€?500k?\s*[-–]\s*€?750k?|500,?000|600k?|650k?|700k?/i, value: '€500k-€750k' },
    { pattern: /€?750k?\s*[-–]\s*€?1[,.]?0{3}k?|€?1\s*m|800k?|900k?/i, value: '€750k-€1M' },
    { pattern: /€?1[,.]?0{3}k?\+|over 1\s*m|1 million\+|above 1m/i, value: '€1M+' }
  ];
  
  // Property type patterns
  const propertyTypePatterns = [
    { pattern: /\bapartment\b|\bflat\b|\bpiso\b/i, value: 'apartment' },
    { pattern: /\bpenthouse\b|\bático\b/i, value: 'penthouse' },
    { pattern: /\btownhouse\b|\badosado\b|\bterrace\b/i, value: 'townhouse' },
    { pattern: /\bvilla\b|\bchalet\b|\bdetached\b/i, value: 'villa' }
  ];
  
  // Purpose patterns
  const purposePatterns = [
    { pattern: /investment|rental income|rent out|buy to let/i, value: 'investment' },
    { pattern: /winter stay|overwinter|escape winter|seasonal/i, value: 'winter_stay' },
    { pattern: /holiday|vacation|holidays|second home/i, value: 'holiday' },
    { pattern: /combination|both|mix of|all of the above/i, value: 'combination' },
    { pattern: /primary|permanent|relocate|move|live there/i, value: 'primary_residence' }
  ];
  
  // Timeframe patterns
  const timeframePatterns = [
    { pattern: /within 6 months|next 6 months|asap|as soon as/i, value: 'within_6_months' },
    { pattern: /within 1 year|within a year|next year|12 months/i, value: 'within_1_year' },
    { pattern: /within 2 years|1-2 years|couple of years/i, value: 'within_2_years' },
    { pattern: /longer|more than 2|2\+ years|no rush/i, value: 'longer_than_2_years' }
  ];
  
  // Scan messages for criteria
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const content = msg.content.toLowerCase();
    
    // Extract locations
    const foundLocations: string[] = [];
    for (const loc of locationPatterns) {
      if (content.includes(loc)) {
        foundLocations.push(loc.charAt(0).toUpperCase() + loc.slice(1));
      }
    }
    if (foundLocations.length > 0 && !criteria.location_preference) {
      criteria.location_preference = foundLocations;
    }
    
    // Extract sea view importance
    if (!criteria.sea_view_importance) {
      for (const pattern of seaViewPatterns) {
        if (pattern.pattern.test(content)) {
          criteria.sea_view_importance = pattern.value;
          break;
        }
      }
    }
    
    // Extract budget
    if (!criteria.budget_range) {
      for (const pattern of budgetPatterns) {
        if (pattern.pattern.test(content)) {
          criteria.budget_range = pattern.value;
          break;
        }
      }
    }
    
    // Extract bedrooms (look for numbers near bedroom-related words)
    if (!criteria.bedrooms_desired) {
      const bedroomMatch = content.match(/(\d+)\s*(?:bed|bedroom|br|dormitor)/i);
      if (bedroomMatch) {
        criteria.bedrooms_desired = bedroomMatch[1];
      }
    }
    
    // Extract property types
    const foundTypes: string[] = [];
    for (const pattern of propertyTypePatterns) {
      if (pattern.pattern.test(content) && !foundTypes.includes(pattern.value)) {
        foundTypes.push(pattern.value);
      }
    }
    if (foundTypes.length > 0 && !criteria.property_type) {
      criteria.property_type = foundTypes;
    }
    
    // Extract purpose
    if (!criteria.property_purpose) {
      for (const pattern of purposePatterns) {
        if (pattern.pattern.test(content)) {
          criteria.property_purpose = pattern.value;
          break;
        }
      }
    }
    
    // Extract timeframe
    if (!criteria.timeframe) {
      for (const pattern of timeframePatterns) {
        if (pattern.pattern.test(content)) {
          criteria.timeframe = pattern.value;
          break;
        }
      }
    }
  }
  
  return criteria;
};

// Upsert lead data to emma_leads table (progressive save)
export const upsertEmmaLead = async (data: Partial<EmmaLeadData> & { conversation_id: string }): Promise<boolean> => {
  try {
    // Prepare the data for upsert
    const leadData: Record<string, any> = {
      conversation_id: data.conversation_id,
      updated_at: new Date().toISOString()
    };
    
    // Only add fields that have values
    if (data.first_name) leadData.first_name = data.first_name;
    if (data.last_name) leadData.last_name = data.last_name;
    if (data.phone_number) leadData.phone_number = data.phone_number;
    if (data.country_prefix) leadData.country_prefix = data.country_prefix;
    if (data.question_1) leadData.question_1 = data.question_1;
    if (data.answer_1) leadData.answer_1 = data.answer_1;
    if (data.question_2) leadData.question_2 = data.question_2;
    if (data.answer_2) leadData.answer_2 = data.answer_2;
    if (data.question_3) leadData.question_3 = data.question_3;
    if (data.answer_3) leadData.answer_3 = data.answer_3;
    if (data.questions_answered !== undefined) leadData.questions_answered = data.questions_answered;
    if (data.location_preference) leadData.location_preference = data.location_preference;
    if (data.sea_view_importance) leadData.sea_view_importance = data.sea_view_importance;
    if (data.budget_range) leadData.budget_range = data.budget_range;
    if (data.bedrooms_desired) leadData.bedrooms_desired = data.bedrooms_desired;
    if (data.property_type) leadData.property_type = data.property_type;
    if (data.property_purpose) leadData.property_purpose = data.property_purpose;
    if (data.timeframe) leadData.timeframe = data.timeframe;
    if (data.detected_language) leadData.detected_language = data.detected_language;
    if (data.intake_complete !== undefined) leadData.intake_complete = data.intake_complete;
    if (data.declined_selection !== undefined) leadData.declined_selection = data.declined_selection;
    if (data.conversation_status) leadData.conversation_status = data.conversation_status;
    if (data.exit_point) leadData.exit_point = data.exit_point;
    if (data.webhook_sent !== undefined) leadData.webhook_sent = data.webhook_sent;
    if (data.webhook_payload) leadData.webhook_payload = data.webhook_payload;

    console.log('📊 PROGRESSIVE SAVE: Upserting lead data:', JSON.stringify(leadData, null, 2));

    const { error } = await supabase
      .from('emma_leads' as any)
      .upsert(leadData, { onConflict: 'conversation_id' });

    if (error) {
      console.error('❌ PROGRESSIVE SAVE: Failed to upsert lead:', error);
      return false;
    }

    console.log('✅ PROGRESSIVE SAVE: Lead data saved successfully');
    return true;
  } catch (error) {
    console.error('❌ PROGRESSIVE SAVE: Error:', error);
    return false;
  }
};

// Update webhook status after sending
export const updateWebhookStatus = async (
  conversationId: string,
  success: boolean,
  payload?: any,
  errorMessage?: string
): Promise<void> => {
  try {
    const updateData: Record<string, any> = {
      webhook_attempts: supabase.rpc ? 1 : 1, // Will increment in edge function
      updated_at: new Date().toISOString()
    };

    if (success) {
      updateData.webhook_sent = true;
      updateData.webhook_sent_at = new Date().toISOString();
    } else {
      updateData.webhook_last_error = errorMessage || 'Unknown error';
    }

    if (payload) {
      updateData.webhook_payload = payload;
    }

    await supabase
      .from('emma_leads' as any)
      .update(updateData)
      .eq('conversation_id', conversationId);

    console.log(`📊 WEBHOOK STATUS: Updated for ${conversationId}, success=${success}`);
  } catch (error) {
    console.error('❌ WEBHOOK STATUS: Failed to update:', error);
  }
};
