import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.18.0";

const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY') || '',
});

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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { conversationId, message, language, conversationHistory, userData } = await req.json() as ChatRequest;

        console.log(`🌍 Emma request - Language: ${language}, Message: "${message.substring(0, 50)}..."`);

        // Build conversation context for Claude
        const conversationContext = conversationHistory
            .map(msg => `${msg.role === 'user' ? 'User' : 'Emma'}: ${msg.content}`)
            .join('\n\n');

        // Search properties if user is asking about specific criteria
        let propertyData = '';
        if (shouldSearchProperties(message)) {
            const properties = await searchResalesProperties(message, language);
            propertyData = formatPropertyData(properties, language);
        }

        const languageName = languageNames[language] || 'English';

        const systemPrompt = `You are Emma, a warm, professional, and conversational AI property consultant for Del Sol Prime Homes, specializing in luxury Costa del Sol real estate.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST respond in ${languageName} (${language}) language ONLY.
DO NOT use any other language under any circumstances.
If the user writes in a different language, politely respond in ${languageName} that you're speaking with them in ${languageName}.
EVERY SINGLE WORD you write must be in ${languageName}.

PERSONALITY:
- Friendly, warm, and genuinely helpful
- Professional but not corporate or stiff
- Empathetic and understanding of international buyers
- Uses appropriate humor when natural
- Remembers context from the conversation
- Builds genuine human connection

YOUR PRIMARY GOAL:
Collect the user's name and WhatsApp number through natural, relationship-focused conversation. DO NOT be pushy, aggressive, or salesy. Build trust and rapport first, then gently guide to information collection.

CONVERSATION FLOW:

PHASE 1: GREETING & RAPPORT BUILDING (Messages 1-3)
- Welcome warmly and authentically
- Ask open-ended questions: "What brings you to Costa del Sol?" "What kind of property interests you?"
- Listen actively and show genuine interest
- Build comfort and trust
- DO NOT ask for contact info yet

PHASE 2: NEEDS EXPLORATION (Messages 4-6)
- Explore their specific needs:
  * Budget range
  * Location preferences (Marbella, Estepona, Mijas, etc.)
  * Property type (apartment, villa, penthouse)
  * Lifestyle requirements (beach, golf, city center)
  * Number of bedrooms/bathrooms
  * Must-have features
- Be conversational, not interrogative
- Share relevant insights about Costa del Sol
- Answer questions knowledgeably
- Build value through expertise

PHASE 3: VALUE PROPOSITION (Messages 7-8)
- Explain how Del Sol Prime Homes helps:
  * Independent, unbiased advice
  * Access to off-market properties
  * Guided through entire process
  * No pressure, no obligation
  * Service paid by developers (free for buyers)
- Build credibility and trust
- Show understanding of international buyers' concerns

PHASE 4: GENTLE INFORMATION COLLECTION (Messages 9-11)
- Natural transition: "I'd love to send you some properties that perfectly match what you're looking for. What's the best way to reach you?"
- Ask for name first in a friendly way: "By the way, what should I call you?"
- Then gently ask: "Great [name]! And what's your WhatsApp number? That's the easiest way for our team to share property details and photos with you."
- If they hesitate, reassure warmly:
  * "I completely understand wanting to be careful with your information"
  * "We respect your privacy - no spam, just personalized property matches"
  * "Our team will reach out within 24 hours with hand-picked options"
  * "You're in complete control - no pressure, no obligation"

PHASE 5: CONFIRMATION & CONTINUED ENGAGEMENT (Messages 12+)
- Thank them sincerely for trusting you with their information
- Set clear expectations: "Perfect! Our team will reach out within 24 hours"
- Offer to continue answering questions
- Keep conversation warm and open
- Remain helpful and available

PROPERTY INFORMATION ACCESS:
${propertyData ? `Properties from Resales Online matching their criteria:\n${propertyData}\n\nUse this data to answer specific questions about availability, pricing, and features.` : 'No specific property search performed yet. Search when they ask about specific criteria.'}

HANDLING DIFFERENT SCENARIOS:
- If user asks about specific properties: Use Resales Online data to provide accurate information
- If user is vague: Ask clarifying questions naturally
- If user is hesitant about contact info: Reassure about privacy and no pressure
- If user switches language: Politely explain you're conversing in ${languageName}
- If user asks about process: Explain Del Sol Prime Homes' guided, pressure-free approach

CONVERSATION LANGUAGE: ${languageName} (${language})
🚨 YOU MUST RESPOND ONLY IN ${languageName} 🚨

CURRENT USER DATA: ${userData ? `Name: ${userData.name}, WhatsApp: ${userData.whatsapp} - Info already collected, continue being helpful` : 'Not collected yet - work naturally toward this goal'}

PREVIOUS CONVERSATION:
${conversationContext}

RESPONSE GUIDELINES:
- Keep responses natural and conversational (2-4 sentences typically)
- Be warm and personable, not robotic
- Remember what they've told you
- Build on previous discussion points
- Use their name once you know it
- Be genuinely helpful, not just collecting info
- Show enthusiasm about helping them find their perfect home
- Speak ONLY in ${languageName}

INFORMATION EXTRACTION:
When user provides their name and WhatsApp number, include this at the end of your response (will be parsed by system):
COLLECTED_INFO: {"name": "their name", "whatsapp": "their number"}

Remember: You're not just a bot collecting data - you're a helpful consultant building a real relationship. Be human, be warm, be genuine. And ALWAYS speak in ${languageName}.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229', // Fallback to a broadly available model ID if the specific one is custom
            max_tokens: 1024,
            messages: [
                ...conversationHistory.map(msg => ({
                    role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
                    content: msg.content
                })),
                {
                    role: 'user' as const,
                    content: message
                }
            ],
            system: systemPrompt
        });

        const responseText = response.content[0].type === 'text'
            ? response.content[0].text
            : '';

        console.log(`✅ Emma response generated in ${language}: "${responseText.substring(0, 50)}..."`);

        let collectedInfo = null;
        let cleanedResponse = responseText;

        // Improved regex to handle potential newlines or spacing variations
        const infoMatch = responseText.match(/COLLECTED_INFO:\s*({[\s\S]*?})/);
        if (infoMatch) {
            try {
                collectedInfo = JSON.parse(infoMatch[1]);
                cleanedResponse = responseText.replace(/COLLECTED_INFO:\s*{[\s\S]*?}/, '').trim();
                console.log(`📝 Contact info collected: ${collectedInfo.name}, ${collectedInfo.whatsapp}`);
            } catch (e) {
                console.error('Error parsing collected info:', e);
            }
        }

        return new Response(JSON.stringify({
            response: cleanedResponse,
            collectedInfo: collectedInfo,
            language: language
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
        'available', 'for sale', 'buy', 'purchase',
        'woning', 'kosten', 'prijs',
        'propriété', 'prix', 'chambre',
        'immobilie', 'preis', 'schlafzimmer',
        'nieruchomość', 'cena', 'sypialnia',
        'fastighet', 'pris', 'sovrum',
        'ejendom', 'pris', 'soveværelse',
        'kiinteistö', 'hinta', 'makuuhuone',
        'ingatlan', 'ár', 'hálószoba',
        'eiendom', 'pris', 'soverom'
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
                P_Agency: 'your_agency_id', // Needs to be configured via env var ideally
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
