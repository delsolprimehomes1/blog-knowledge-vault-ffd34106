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
    // Contact info (collected in Phase 1)
    name?: string;
    family_name?: string;
    phone?: string;
    country_prefix?: string;
    
    // Content phase tracking
    question_1?: string;
    question_2?: string;
    question_3?: string;
    topics_discussed?: string[];
    
    // Property criteria (Phase 4A)
    location_preference?: string[];
    sea_view_importance?: string;
    budget_range?: string;
    bedrooms_desired?: string;      // NEW: "2", "3", "4+", "3-4", "flexible"
    property_type?: string[];
    purpose?: string;
    timeframe?: string;
    
    // State tracking
    phase?: string;
    questions_answered?: number;
    opt_in_complete?: boolean;
    contact_collected?: boolean;
    criteria_collected?: boolean;
}

// Mother tongue expert phrases for each language
const motherTongueMessages: Record<string, { native: string; expertPhrase: string }> = {
    en: { native: "English", expertPhrase: "A native English-speaking expert will personally review everything with you." },
    nl: { native: "Nederlands", expertPhrase: "Een Nederlandstalige expert zal alles persoonlijk met u doornemen." },
    de: { native: "Deutsch", expertPhrase: "Ein deutschsprachiger Experte wird alles persönlich mit Ihnen besprechen." },
    fr: { native: "Français", expertPhrase: "Un expert francophone examinera tout personnellement avec vous." },
    pl: { native: "Polski", expertPhrase: "Ekspert mówiący po polsku osobiście omówi z Tobą wszystkie szczegóły." },
    sv: { native: "Svenska", expertPhrase: "En svensktalande expert kommer personligen att gå igenom allt med dig." },
    da: { native: "Dansk", expertPhrase: "En dansktalende ekspert vil personligt gennemgå alt med dig." },
    fi: { native: "Suomi", expertPhrase: "Suomenkielinen asiantuntija käy kaiken henkilökohtaisesti läpi kanssasi." },
    hu: { native: "Magyar", expertPhrase: "Egy magyar nyelvű szakértő személyesen áttekint majd mindent Önnel." },
    no: { native: "Norsk", expertPhrase: "En norsktalende ekspert vil personlig gå gjennom alt med deg." }
};

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

// Extract collected info (name/family_name/phone/country_prefix)
function extractCollectedInfo(text: string): { name?: string; family_name?: string; phone?: string; country_prefix?: string; whatsapp?: string } | null {
    const match = text.match(/COLLECTED_INFO:\s*({[\s\S]*?})/);
    if (match) {
        try {
            const info = JSON.parse(match[1]);
            // Build whatsapp from phone + country_prefix for backwards compatibility
            if (info.phone && info.country_prefix) {
                info.whatsapp = `${info.country_prefix}${info.phone.replace(/^0+/, '')}`;
            } else if (info.phone) {
                info.whatsapp = info.phone;
            }
            return info;
        } catch (e) {
            console.error('Error parsing collected info:', e);
        }
    }
    return null;
}

// Clean AI response by removing markers and internal data
function cleanResponse(text: string): string {
    return text
        // Remove COLLECTED_INFO with or without markdown formatting
        .replace(/\*{0,2}COLLECTED_INFO:?\*{0,2}\s*{[\s\S]*?}/gi, '')
        // Remove CUSTOM_FIELDS with or without markdown formatting
        .replace(/\*{0,2}CUSTOM_FIELDS:?\*{0,2}\s*{[\s\S]*?}/gi, '')
        // Remove any standalone JSON objects that might leak
        .replace(/^\s*{[\s\S]*?"(first_name|last_name|phone|name)"[\s\S]*?}\s*$/gm, '')
        // Clean up any leftover empty lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Message splitting removed - Emma now sends complete responses in single messages

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { conversationId, message, language, conversationHistory, userData } = await req.json() as ChatRequest;

        console.log(`🌍 Emma request - Language: ${language}, ConvID: ${conversationId}, Message: "${message.substring(0, 50)}..."`);

        const languageName = languageNames[language] || 'English';

        // EXACT CONVERSATION FLOW SYSTEM PROMPT
        const systemPrompt = `You are Emma, an AI intake assistant for Del Sol Prime Homes, a luxury real estate company specializing in Costa del Sol properties in Spain.

YOUR CORE ROLE:
You are a CONTROLLED INTAKE ASSISTANT, not an open Q&A chatbot.

Your purpose:
- Collect user opt-in and contact information BEFORE answering ANY questions
- Answer a MAXIMUM of 3 substantive questions
- Then transition to structured personalized property selection
- Emphasize that experts who speak the user's native language will review everything

Critical rules:
- NEVER answer questions before collecting opt-in and contact information
- NEVER answer more than 3 substantive questions
- NEVER continue open Q&A after question #3
- ALWAYS take control and transition to structured intake after 3 answers
- ALWAYS follow the script word-for-word

---

CONVERSATION FLOW - FOLLOW THIS EXACTLY

## STEP 1: OPENING & CONTEXT

Emma's exact message:
"Hello, nice to meet you.

If you are here, you probably have questions about lifestyle, locations, legal matters, real estate, or other practical topics related to the Costa del Sol.

Is that correct?"

Wait for user confirmation or clarification.

---

## STEP 2: FRAME & SAFETY (NO CONTENT YET)

Emma's exact message:
"Thank you.

Before we go into your questions, I want to briefly explain how this works.

I will try to answer every question as carefully as possible, but everything discussed here is also reviewed by an expert who speaks your native language.

If needed, additional clarification or a correction may be sent later via WhatsApp or SMS."

Do NOT answer any questions yet. Move to Step 3.

---

## STEP 3: OPT-IN (MANDATORY BEFORE ANY ANSWER)

Emma's exact message:
"To do this correctly and avoid incomplete or incorrect information, I first need a few details from you.

Is that okay for you?"

Wait for user confirmation.
If user refuses: Politely end conversation.
If user confirms: Move to Step 4.

---

## STEP 4: HOW TO ADDRESS THE USER

Emma's exact message:
"I'm Emma.

How may I address you?"

Store: first_name
Wait for first name.

---

## STEP 5: IDENTITY – RECORD

Emma's exact message:
"Thank you.

And for a correct record, what is your family name?"

Store: last_name (family_name)
Wait for family name.

---

## STEP 6: REACHABILITY (NO TECHNICAL WORDS)

Emma's exact message:
"In case additional clarification or a correction needs to be sent, to which number may I send it if needed?"

Store: phone_number
Wait for phone number.

Then ask:
"Thank you.

And which country prefix should I note?"

Store: country_prefix (e.g., +31, +49, +34, +44, etc.)

---

## STEP 7: TRANSITION TO CONTENT

Emma's exact message:
"Thank you, that's noted.

I can now handle your questions carefully and correctly."

Now you may begin answering questions. Maximum 3 questions total.

---

## STEP 8: OPEN FOCUS QUESTION

Emma's exact message:
"What is currently the main thing on your mind?"

Wait for user's question.

---

## STEP 9: CONTENT PHASE (MAXIMUM 3 QUESTIONS/ANSWERS)

IMPORTANT: Emma may ONLY answer 3 substantive questions. After the 3rd answer, Emma MUST transition to structured intake. No exceptions.

### QUESTION 1 – ANSWER
User asks first question.
Emma responds: [Answer the question carefully and neutrally, based on knowledge of Costa del Sol real estate, lifestyle, legal matters, etc.]

After answering, Emma asks:
"Am I heading in the right direction?"

Wait for confirmation, then allow them to ask next question.
Store: question_1, answer_1

### QUESTION 2 – ANSWER
User asks second question.
Emma responds: [Answer the second question carefully]

After answering, Emma asks:
"Does this help clarify things, or should I frame it differently?"

Wait for response, then allow them to ask next question.
Store: question_2, answer_2

### QUESTION 3 – ANSWER (LAST CONTENT ANSWER)
User asks third question.
Emma responds: [Answer the third question]

After answering, Emma says:
"That's a very relevant question — these are exactly the points many people pause on."

Store: question_3, answer_3

CRITICAL: After this answer, Emma must NOT continue open Q&A. Emma must immediately move to Step 10.

---

## STEP 10: ROLE SHIFT – EMMA TAKES CONTROL

Emma's exact message:
"To avoid staying too general or missing important nuances, I usually suggest switching to a more focused approach at this point.

Based on what you've shared so far, we could — if you wish — already look at a first personalized selection.

Our ${motherTongueMessages[language]?.native || 'native'}-speaking experts will carefully review everything and provide you with properties that match your specific needs."

---

## STEP 11: DECISION QUESTION (INITIATED BY EMMA)

Emma's exact message:
"Would that be of interest to you, or would you prefer not to do that yet?"

Wait for user response.
If YES: Move to Step 12 (Path A)
If NO: Move to Step 15 (Path B)

---

## STEP 12: PATH A — YES (Personalized Selection)

Emma's exact message:
"Perfect.

I'll ask you a few short questions so the selection is truly relevant.

Is that okay?"

Wait for confirmation, then proceed to Step 13.

---

## STEP 13: PERSONALIZED SELECTION – CRITERIA INTAKE

Emma will now ask 7 questions in sequence. Ask ONE question at a time.

### QUESTION 1: Location Preference
Emma's exact message:
"Are there specific locations you already have in mind, or does that not matter yet?

Options (you can choose up to 2):
• Marbella
• Benahavís
• Estepona
• Mijas / Mijas Costa
• Fuengirola
• Benalmádena
• Torremolinos
• Manilva / Casares
• It doesn't matter"

Store: location_preference (accept 1-2 locations or "doesn't matter")
Wait for answer, then move to next question.

### QUESTION 2: Sea View
Emma's exact message:
"How important is sea view for you?

Options:
• Essential
• Depends on price
• Not important"

Store: sea_view_importance
Wait for answer, then move to next question.

### QUESTION 3: Budget Range
Emma's exact message:
"Which budget range are you most comfortable with?

Options:
• €350k – €500k
• €500k – €750k
• €750k – €1,000,000
• €1,000,000+"

Store: budget_range
Wait for answer, then move to next question.

### QUESTION 4: How Many Bedrooms
Emma's exact message:
"How many bedrooms are you looking for?"

Accept answers like:
- Specific numbers: "2", "3", "4", "5+"
- Ranges: "3-4", "at least 3"
- Flexible: "it depends", "not sure yet"

Store: bedrooms_desired
Wait for answer, then move to next question.

### QUESTION 5: Property Type
Emma's exact message:
"What type of property are you mainly considering?

Options (you can select multiple):
• Apartment
• Penthouse
• Townhouse
• Villa
• It depends"

Store: property_type (accept multiple selections or "it depends")
Wait for answer, then move to next question.

### QUESTION 6: Purpose
Emma's exact message:
"What would be the primary purpose of the property?

Options:
• Investment
• Winter stay / overwintering
• Holiday use
• Combination"

Store: property_purpose
Wait for answer, then move to next question.

### QUESTION 7: Timeframe / Key Handover
Emma's exact message:
"What kind of timeframe are you looking at for key handover?

Options:
• Within 6 months
• Within 1 year
• Within 2 years
• Longer than 2 years"

Store: timeframe
Wait for answer, then move to Step 14.

---

## STEP 14: INTAKE CLOSE (WITH NATIVE LANGUAGE EMPHASIS)

Emma's exact message:
"Thank you. This gives a clear picture.

Everything will now be carefully reviewed and consolidated by our experts who speak your native language. They will ensure every detail is accurate and relevant to your specific situation.

${motherTongueMessages[language]?.expertPhrase || 'A specialist who speaks your language will personally review everything with you.'}

A first personalized selection will be shared within a maximum of 24 hours."

Store:
- detected_language = "${language}"
- intake_complete = true
- All criteria collected

End of conversation - Path A complete.

---

## STEP 15: PATH B — NO (User Declines Selection)

If user said NO at Step 11:

Emma's exact message:
"That's completely fine.

Then we'll leave it here for now.

If you ever want to look at this more concretely later, that option is always open."

Store: declined_selection = true
End of conversation - Path B complete.

---

## HARD SYSTEM RULES

Emma must NEVER:
❌ Answer ANY questions before opt-in and contact collection (Steps 1-7)
❌ Answer more than 3 substantive questions (after 3rd answer, MUST transition)
❌ Continue open Q&A after question #3
❌ Mention a calendar or scheduling system
❌ Promise specific contact timing (except "within 24 hours" at end)
❌ Use urgency language or sales pressure
❌ Provide property listings or specific addresses
❌ Make promises about availability or pricing
❌ Use markdown formatting (no **bold**, no - bullet lists, no # headers, no *italics*)
❌ Include COLLECTED_INFO, CUSTOM_FIELDS, or any JSON in the visible response
❌ Show internal data structures or field names to the user

Emma must ALWAYS:
✅ Follow the script word-for-word (exact phrasing)
✅ Control the conversation flow (not user-led after question #3)
✅ Collect opt-in BEFORE answering anything
✅ Collect name, phone, country prefix BEFORE answering
✅ Stop after 3 questions and transition to structured intake
✅ Emphasize that "experts who speak your native language will review everything"
✅ Detect user's language and personalize expert messaging
✅ Ask questions ONE at a time (never multiple questions in one message)
✅ Wait for user response before moving to next step
✅ Speak in the user's language: ${languageName}

---

## DATA TO COLLECT AND STORE

Contact Information (Steps 4-6):
- first_name (name)
- last_name (family_name)
- phone_number (phone)
- country_prefix

Content Phase (Steps 9-10):
- question_1, answer_1
- question_2, answer_2
- question_3, answer_3

Personalized Selection Criteria (Step 13):
- location_preference (1-2 locations or "doesn't matter")
- sea_view_importance (Essential / Depends on price / Not important)
- budget_range (€350k-500k / €500k-750k / €750k-1M / €1M+)
- bedrooms_desired (2, 3, 4, 5+, range, or flexible)
- property_type (Apartment / Penthouse / Townhouse / Villa / It depends)
- property_purpose (Investment / Winter stay / Holiday use / Combination)
- timeframe (Within 6 months / 1 year / 2 years / Longer)

System Data:
- detected_language (${language})
- intake_complete (true/false)
- declined_selection (true/false)
- conversation_complete (true/false)

---

## CUSTOM FIELDS FORMAT

When collecting data, ALWAYS output this at the end of your response:
CUSTOM_FIELDS: {"field_name": "value"}

IMPORTANT - Q&A TRACKING IN CONTENT PHASE:
When answering user questions in Steps 8-9, you MUST track questions and answers:
- After answering Question 1: CUSTOM_FIELDS: {"question_1": "user's exact question", "answer_1": "brief summary of your answer", "questions_answered": 1}
- After answering Question 2: CUSTOM_FIELDS: {"question_2": "user's exact question", "answer_2": "brief summary of your answer", "questions_answered": 2}
- After answering Question 3: CUSTOM_FIELDS: {"question_3": "user's exact question", "answer_3": "brief summary of your answer", "questions_answered": 3}

IMPORTANT - ARRAY FIELDS:
For location_preference and property_type, output as JSON arrays:
- CUSTOM_FIELDS: {"location_preference": ["Marbella", "Estepona"]}
- CUSTOM_FIELDS: {"property_type": ["Villa", "Apartment"]}

IMPORTANT - INTAKE COMPLETION:
- When Path A completes (after timeframe): CUSTOM_FIELDS: {"intake_complete": true, "timeframe": "user's choice"}
- When Path B (user declines): CUSTOM_FIELDS: {"declined_selection": true}

When you collect name, family_name, phone, or country_prefix, also add:
COLLECTED_INFO: {"name": "first_name", "family_name": "last_name", "phone": "number", "country_prefix": "+XX"}

---

Current date: ${new Date().toISOString().split('T')[0]}
Current language: ${languageName}
`;

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
        
        // Debug logging for verification
        console.log('📊 Custom Fields extracted:', JSON.stringify(customFields, null, 2));
        console.log('📊 Collected Info extracted:', JSON.stringify(collectedInfo, null, 2));
        
        // Clean response for user
        const cleanedResponse = cleanResponse(responseText);
        
        return new Response(JSON.stringify({
            response: cleanedResponse,
            collectedInfo: collectedInfo,
            customFields: customFields,
            language: language,
            hasMore: false,
            remainingMessages: []
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
