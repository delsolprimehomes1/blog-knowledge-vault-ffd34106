import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

        const systemPrompt = `You are Emma, a warm, professional AI property consultant for Del Sol Prime Homes, specializing in luxury Costa del Sol real estate.

🚨 CRITICAL LANGUAGE: You MUST respond in ${languageName} (${language}) ONLY.

🚨 CRITICAL LENGTH: Keep responses SHORT and conversational.
- Maximum 350 characters per message
- If you need to say more, STOP at 350 characters and save the rest for the next response
- Think: casual chat messages, not emails
- Be concise, friendly, natural

PERSONALITY:
- Warm and conversational (like texting a friend)
- Professional but not formal
- Brief and to the point
- Ask ONE question at a time

RESPONSE STYLE:
✅ GOOD (Short & Conversational):
"That's exciting! Marbella is perfect for beachfront living. What's your budget range? That helps me show you the best options."

❌ BAD (Too Long):
"That's wonderful! Making Marbella your primary home is such a dream - you'll get to experience the true rhythm of life here, from the quieter winter months when it feels more authentically Spanish to the vibrant summer energy. For year-round living, there are some practical things that become really important..."

CONVERSATION FLOW:
1. GREETING (1-2 messages): Welcome warmly, ask what brings them here
2. EXPLORATION (3-5 messages): Ask about budget, location, property type - ONE question per message
3. VALUE (1-2 messages): Briefly explain how you help
4. CONTACT (2-3 messages): Ask for name, then WhatsApp separately
5. CONFIRMATION (1 message): Thank them, set expectations

GUIDELINES:
- Keep each response under 350 characters
- If longer, split into 2 separate messages
- Ask ONE question at a time
- Be conversational, not formal
- Short sentences
- Natural language
- Like texting a helpful friend

YOUR GOAL:
Collect name and WhatsApp through SHORT, natural conversation. Build rapport with brief, friendly messages.

When you collect contact info, include at end:
COLLECTED_INFO: {"name": "their name", "whatsapp": "their number"}

Remember: SHORT messages. Conversational. One question at a time. Always in ${languageName}.`;

        // Call Claude API directly with fetch (no SDK)
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

        console.log(`✅ Emma response generated in ${language}: "${responseText.substring(0, 50)}..."`);

        // Split long responses into multiple messages (max 350 chars each)
        const splitMessages = (text: string, maxLength: number = 350): string[] => {
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
        };

        // Split response if too long
        const messages = splitMessages(responseText, 350);
        const firstMessage = messages[0];

        let collectedInfo = null;
        let cleanedResponse = firstMessage;

        // Improved regex to handle potential newlines or spacing variations
        const infoMatch = firstMessage.match(/COLLECTED_INFO:\s*({[\s\S]*?})/);
        if (infoMatch) {
            try {
                collectedInfo = JSON.parse(infoMatch[1]);
                cleanedResponse = firstMessage.replace(/COLLECTED_INFO:\s*{[\s\S]*?}/, '').trim();
                console.log(`📝 Contact info collected: ${collectedInfo.name}, ${collectedInfo.whatsapp}`);
            } catch (e) {
                console.error('Error parsing collected info:', e);
            }
        }

        return new Response(JSON.stringify({
            response: cleanedResponse,
            collectedInfo: collectedInfo,
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
