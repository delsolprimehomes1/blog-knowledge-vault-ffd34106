import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Resales Online API configuration
const RESALES_API_KEY = Deno.env.get('RESALES_API_KEY') || '';
const RESALES_API_URL = 'https://webapi.resales-online.com/V6/SearchProperties';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
    conversationId: string;
    message: string;
    language: string;
    conversationHistory: any[];
    userData: { name?: string; whatsapp?: string } | null;
}

interface CustomFields {
    motivation?: string;
    buyer_type?: string;
    property_type?: string;
    location_preference?: string;
    budget_min?: number;
    budget_max?: number;
    bedrooms?: number;
    bathrooms?: number;
    timeline?: string;
    location_priorities?: string[];
    must_have_features?: string[];
    lifestyle_priorities?: string[];
    visit_plans?: string;
    purchase_timeline?: string;
}

const languageNames: Record<string, string> = {
    en: 'English',
    nl: 'Dutch (Nederlands)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
    pl: 'Polish (Polski)',
    sv: 'Swedish (Svenska)',
    da: 'Danish (Dansk)',
    fi: 'Finnish (Suomi)',
    hu: 'Hungarian (Magyar)',
    no: 'Norwegian (Norsk)'
};

// Extract custom fields from AI response
function extractCustomFields(text: string): CustomFields | null {
    const match = text.match(/CUSTOM_FIELDS:\s*({[\s\S]*?})/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            console.error('Error parsing custom fields:', e);
        }
    }
    return null;
}

// Extract collected info (name/whatsapp)
function extractCollectedInfo(text: string): { name?: string; whatsapp?: string } | null {
    const match = text.match(/COLLECTED_INFO:\s*({[\s\S]*?})/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            console.error('Error parsing collected info:', e);
        }
    }
    return null;
}

// Clean AI response by removing markers
function cleanResponse(text: string): string {
    return text
        .replace(/COLLECTED_INFO:\s*{[\s\S]*?}/g, '')
        .replace(/CUSTOM_FIELDS:\s*{[\s\S]*?}/g, '')
        .trim();
}

// Split long responses into multiple messages (max 300 chars each)
function splitMessages(text: string, maxLength: number = 300): string[] {
    if (text.length <= maxLength) {
        return [text];
    }

    const messages: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            messages.push(remaining);
            break;
        }

        // Find natural break point (sentence end) before maxLength
        let breakPoint = maxLength;
        const sentenceEnd = remaining.substring(0, maxLength).lastIndexOf('. ');
        const questionEnd = remaining.substring(0, maxLength).lastIndexOf('? ');
        const exclamationEnd = remaining.substring(0, maxLength).lastIndexOf('! ');

        // Use the last sentence ending found
        breakPoint = Math.max(sentenceEnd, questionEnd, exclamationEnd);

        if (breakPoint > 0) {
            breakPoint += 2; // Include the punctuation and space
        } else {
            // No sentence end found, break at last space
            breakPoint = remaining.substring(0, maxLength).lastIndexOf(' ');
            if (breakPoint <= 0) breakPoint = maxLength;
        }

        messages.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
    }

    return messages;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { conversationId, message, language, conversationHistory, userData } = await req.json() as ChatRequest;

        console.log(`🌍 Emma request - Language: ${language}, ConvID: ${conversationId}, Message: "${message.substring(0, 50)}..."`);

        const languageName = languageNames[language] || 'English';

        // Enhanced 8-step conversation flow system prompt
        const systemPrompt = `You are Emma, a warm, professional AI property consultant for Del Sol Prime Homes, specializing in luxury Costa del Sol real estate.

🚨 CRITICAL LANGUAGE: You MUST respond in ${languageName} (${language}) ONLY.

🚨 CRITICAL LENGTH: Maximum 300 characters per message. Be concise!

=== 8-STEP CONVERSATION FLOW ===

STEP 1 - WARM WELCOME (Message 1):
Greet warmly. Ask what brings them to Costa del Sol.

STEP 2 - UNDERSTAND MOTIVATION (Message 2-3):
Ask about their motivation: retirement, investment, holiday home, relocation?

STEP 3 - PROPERTY PREFERENCES (Message 4-5):
Ask about property type: apartment, villa, penthouse, townhouse?
Ask about bedrooms/bathrooms needed.

STEP 4 - LOCATION PREFERENCES (Message 6-7):
Ask about preferred areas: Marbella, Estepona, Mijas, Fuengirola?
Ask about priorities: beach access, golf course, quiet area, restaurants?

STEP 5 - BUDGET & TIMELINE (Message 8-9):
Ask about budget range.
Ask about purchase timeline: immediately, 3-6 months, next year?

STEP 6 - MUST-HAVE FEATURES (Message 10-11):
Ask about essential features: sea views, pool, garden, parking, terrace?

STEP 7 - CONTACT COLLECTION (Message 12-13):
Ask for their name.
Then ask for WhatsApp number for property matches.

STEP 8 - CONFIRMATION (Message 14):
Thank them, confirm next steps, set expectations.

=== RESPONSE FORMAT ===

Keep each response under 300 characters!
Ask ONE question at a time.
Be conversational, like texting a helpful friend.

After EACH response, extract any new information learned:

CUSTOM_FIELDS: {"field": "value"}

Fields to extract (include only those mentioned):
- motivation: why interested (retirement, investment, holiday, relocation)
- buyer_type: first-time, investor, retiree, relocator
- property_type: apartment, villa, penthouse, townhouse
- location_preference: Marbella, Estepona, Mijas, etc.
- budget_min: minimum budget in euros (number only)
- budget_max: maximum budget in euros (number only)
- bedrooms: number of bedrooms (number only)
- bathrooms: number of bathrooms (number only)
- timeline: when they want to buy
- location_priorities: ["beach", "golf", "quiet", "restaurants"]
- must_have_features: ["sea views", "pool", "garden", "parking"]
- lifestyle_priorities: ["golf", "restaurants", "nightlife", "family"]
- visit_plans: when visiting Costa del Sol
- purchase_timeline: urgency (immediate, 3-6 months, 1 year)

When you collect name and WhatsApp, add:
COLLECTED_INFO: {"name": "their name", "whatsapp": "their number"}

=== EXAMPLES ===

User: "Hi, I'm interested in buying property"
Emma: "Hello! 🌞 Great to hear from you! I'm Emma from Del Sol Prime Homes. What brings you to Costa del Sol - retirement, investment, or a holiday getaway?"

CUSTOM_FIELDS: {"motivation": "buying property"}

User: "Looking for a villa for retirement"
Emma: "Wonderful choice! 🏡 The Costa del Sol is perfect for retirement. How many bedrooms are you thinking? Most retirees love 2-3 bed villas."

CUSTOM_FIELDS: {"motivation": "retirement", "buyer_type": "retiree", "property_type": "villa"}

User: "3 bedrooms, budget around 500k"
Emma: "Great! A 3-bed villa around €500k gives you lovely options. Do you have a preferred area - Marbella, Estepona, or somewhere quieter like Mijas?"

CUSTOM_FIELDS: {"bedrooms": 3, "budget_max": 500000}

Remember: ALWAYS respond in ${languageName}. Max 300 characters. One question per message.`;

        // Call Claude API
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [
                    ...conversationHistory.map(msg => ({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    })),
                    { role: 'user', content: message }
                ]
            })
        });

        if (!anthropicResponse.ok) {
            const errorText = await anthropicResponse.text();
            console.error('Anthropic API error:', anthropicResponse.status, errorText);
            throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
        }

        const response = await anthropicResponse.json();
        const responseText = response.content?.[0]?.text || '';

        console.log(`✅ Emma raw response: "${responseText.substring(0, 100)}..."`);

        // Extract custom fields and collected info
        const customFields = extractCustomFields(responseText);
        const collectedInfo = extractCollectedInfo(responseText);
        
        // Clean response for user
        const cleanedResponse = cleanResponse(responseText);
        
        // Split into messages if needed
        const messages = splitMessages(cleanedResponse, 300);
        const firstMessage = messages[0];

        console.log(`📊 Custom fields extracted:`, customFields);
        console.log(`📝 Collected info:`, collectedInfo);

        // Save to database with merged custom fields
        try {
            // Get existing conversation data
            const { data: existing } = await supabase
                .from('emma_conversations')
                .select('custom_fields, name, whatsapp, messages')
                .eq('conversation_id', conversationId)
                .single();

            // Merge custom fields (new fields override existing)
            const mergedCustomFields = {
                ...(existing?.custom_fields || {}),
                ...(customFields || {})
            };

            // Build updated messages array
            const existingMessages = existing?.messages || [];
            const updatedMessages = [
                ...existingMessages,
                { role: 'user', content: message, timestamp: new Date().toISOString() },
                { role: 'assistant', content: cleanedResponse, timestamp: new Date().toISOString() }
            ];

            // Upsert conversation
            const { error: upsertError } = await supabase
                .from('emma_conversations')
                .upsert({
                    conversation_id: conversationId,
                    language: language,
                    messages: updatedMessages,
                    custom_fields: mergedCustomFields,
                    name: collectedInfo?.name || existing?.name || null,
                    whatsapp: collectedInfo?.whatsapp || existing?.whatsapp || null,
                    status: collectedInfo?.whatsapp ? 'qualified' : (existing?.whatsapp ? 'qualified' : 'new'),
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'conversation_id'
                });

            if (upsertError) {
                console.error('❌ Database upsert error:', upsertError);
            } else {
                console.log(`✅ Conversation saved to database - ID: ${conversationId}`);
            }
        } catch (dbError) {
            console.error('❌ Database operation failed:', dbError);
        }

        return new Response(JSON.stringify({
            response: firstMessage,
            collectedInfo: collectedInfo,
            customFields: customFields,
            language: language,
            hasMore: messages.length > 1,
            remainingMessages: messages.slice(1)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Emma chat error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process message' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

function shouldSearchProperties(message: string): boolean {
    const searchKeywords = [
        'property', 'properties', 'apartment', 'villa', 'penthouse',
        'price', 'budget', 'cost', 'euro', '€',
        'bedroom', 'bath', 'size', 'sqm', 'm2',
        'location', 'marbella', 'estepona', 'mijas', 'puerto banus',
        'beach', 'golf', 'sea view', 'pool',
        'available', 'for sale', 'buy', 'purchase'
    ];

    const lowerMessage = message.toLowerCase();
    return searchKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function searchResalesProperties(query: string, language: string): Promise<any[]> {
    if (!RESALES_API_KEY) {
        console.warn("Skipping Resales API search - No API key");
        return [];
    }
    try {
        const response = await fetch(RESALES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': RESALES_API_KEY
            },
            body: JSON.stringify({
                P_Agency: 'your_agency_id',
                P_Country: 'Spain',
                P_Area1: 'Costa del Sol',
                P_Max: 10,
                P_Lang: language
            })
        });

        const data = await response.json();
        console.log(`🏠 Found ${data.Property?.length || 0} properties from Resales Online`);
        return data.Property || [];
    } catch (error) {
        console.error('Resales API error:', error);
        return [];
    }
}

function formatPropertyData(properties: any[], language: string): string {
    if (properties.length === 0) return '';

    return properties.slice(0, 5).map((prop, index) => `
Property ${index + 1}:
- Location: ${prop.Location || 'Costa del Sol'}
- Type: ${prop.Type || 'Property'}
- Price: €${prop.Price?.toLocaleString() || 'Contact for price'}
- Bedrooms: ${prop.Bedrooms || 'N/A'}
- Bathrooms: ${prop.Bathrooms || 'N/A'}
- Size: ${prop.Built || 'N/A'}m²
- Reference: ${prop.Reference || 'N/A'}
${prop.Desc ? `- Description: ${prop.Desc.substring(0, 200)}...` : ''}
`).join('\n---\n');
}
