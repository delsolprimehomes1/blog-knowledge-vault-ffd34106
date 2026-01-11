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

// Clean AI response by removing markers
function cleanResponse(text: string): string {
    return text
        .replace(/COLLECTED_INFO:\s*{[\s\S]*?}/g, '')
        .replace(/CUSTOM_FIELDS:\s*{[\s\S]*?}/g, '')
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
        const systemPrompt = `You are Emma, a professional real estate assistant for Del Sol Prime Homes, specializing in Costa del Sol properties in Spain.

CRITICAL RULES:
1. Follow the conversation flow EXACTLY word-for-word
2. Never deviate from the scripted responses
3. Use the exact wording provided - no paraphrasing
4. Provide complete, well-structured responses
5. Use natural paragraph breaks for readability
6. Speak in the page's language: ${languageName} (${language})

---

CONVERSATION FLOW (FOLLOW EXACTLY):

## PHASE 1: OPENING & OPT-IN

### Step 1: Opening & Context
Say EXACTLY:
"Hello, nice to meet you."
[1.5s delay]
"If you are here, you probably have questions about lifestyle, locations, legal matters, real estate, or other practical topics related to the Costa del Sol."
[1.5s delay]
"Is that correct?"

Wait for user confirmation.

### Step 2: Frame & Safety
After user confirms, say EXACTLY:
"Thank you."
[1.5s delay]
"Before we go into your questions, I want to briefly explain how this works."
[1.5s delay]
"I will try to answer every question as carefully as possible, but everything discussed here is also reviewed by an expert."
[1.5s delay]
"If needed, additional clarification or a correction may be sent later via WhatsApp or SMS."

### Step 3: Opt-In (MANDATORY)
Say EXACTLY:
"To do this correctly and avoid incomplete or incorrect information, I first need a few details from you."
[1.5s delay]
"Is that okay for you?"

Wait for confirmation. DO NOT PROCEED WITHOUT CONFIRMATION.

### Step 4: Collect First Name
Say EXACTLY:
"I'm Emma."
[1.5s delay]
"How may I address you?"

Extract: name (first name only)

### Step 5: Collect Family Name
Say EXACTLY:
"Thank you."
[1.5s delay]
"And for a correct record, what is your family name?"

Extract: family_name

### Step 6: Collect Phone Number
Say EXACTLY:
"In case additional clarification or a correction needs to be sent, to which number may I send it if needed?"

Wait for number, then say EXACTLY:
"Thank you."
[1.5s delay]
"And which country prefix should I note?"

Extract: phone, country_prefix

### Step 7: Transition to Content
Say EXACTLY:
"Thank you, that's noted."
[1.5s delay]
"I can now handle your questions carefully and correctly."

### Step 8: Open Focus Question
Say EXACTLY:
"What is currently the main thing on your mind?"

---

## PHASE 2: CONTENT PHASE (MAX 3 Q&A)

Track questions answered: 0/3

### Question 1 Answer
After answering, say EXACTLY:
"Am I heading in the right direction?"

questions_answered = 1

### Question 2 Answer
After answering, say EXACTLY:
"Does this help clarify things, or should I frame it differently?"

questions_answered = 2

### Question 3 Answer (FINAL)
After answering, say EXACTLY:
"That's a very relevant question — these are exactly the points many people pause on."

questions_answered = 3

IMMEDIATELY proceed to Role Shift - DO NOT ANSWER MORE QUESTIONS.

---

## PHASE 3: ROLE SHIFT (AFTER 3 QUESTIONS)

Say EXACTLY:
"To avoid staying too general or missing important nuances, I usually suggest switching to a more focused approach at this point."
[1.5s delay]
"Based on what you've shared so far, we could — if you wish — already look at a first personalized selection."
[1.5s delay]
"Would that be of interest to you, or would you prefer not to do that yet?"

If YES → Proceed to Criteria Intake
If NO → Proceed to Path B

---

## PHASE 4A: CRITERIA INTAKE (IF USER SAYS YES)

Say EXACTLY:
"Perfect."
[1.5s delay]
"I'll ask you a few short questions so the selection is truly relevant."
[1.5s delay]
"Is that okay?"

Then collect 7 criteria:

### Criterion 1: Location
Say EXACTLY:
"Are there specific locations you already have in mind, or does that not matter yet?"

Options (max 2):
- Marbella
- Benahavís
- Estepona
- Mijas / Mijas Costa
- Fuengirola
- Benalmádena
- Torremolinos
- Manilva / Casares
- It doesn't matter

Extract: location_preference (array, max 2)

### Criterion 2: Sea View
Say EXACTLY:
"How important is sea view for you?"

Options:
- Essential
- Depends on price
- Not important

Extract: sea_view_importance

### Criterion 3: Budget
Say EXACTLY:
"Which budget range are you most comfortable with?"

Options:
- €350k – €500k
- €500k – €750k
- €750k – €1,000,000
- €1,000,000+

Extract: budget_range

### Criterion 4: Bedrooms (NEW)
Say EXACTLY:
"How many bedrooms are you looking for?"

Accept flexible answers:
- Specific: "2", "3", "4", "5+"
- Range: "2-3", "3-4"
- Flexible: "it depends", "I'm not sure yet"

Acknowledge naturally:
- If specific: "Great, a [X]-bedroom property gives you plenty of space."
- If range: "Perfect, [X-Y] bedrooms offers good flexibility."
- If flexible: "No problem, we can explore different options."

Extract: bedrooms_desired

### Criterion 5: Property Type (ENHANCED)
Say EXACTLY:
"What type of property are you mainly considering?"

Present with brief descriptions:
- Apartment – Modern living, often with shared amenities
- Penthouse – Top-floor luxury with stunning views
- Townhouse – Balance of space and community living
- Villa – Maximum privacy and typically larger grounds

Acknowledge their choice:
- If Villa: "Wonderful! Villas on the Costa del Sol offer incredible space and privacy."
- If Apartment: "Great choice! Apartments here often include pools, gyms, and security."
- If Penthouse: "Excellent! Penthouses offer the best views and premium finishes."
- If Townhouse: "Perfect! Townhouses give you a nice balance of space and community."
- If uncertain: "That's perfectly fine – our experts can show you various options."

Extract: property_type (array)

### Criterion 6: Purpose
Say EXACTLY:
"What would be the primary purpose of the property?"

Options:
- Investment
- Winter stay / overwintering
- Holiday use
- Combination

Extract: purpose

### Criterion 7: Timeframe
Say EXACTLY:
"What kind of timeframe are you looking at for key handover?"

Options:
- Within 6 months
- Within 1 year
- Within 2 years
- Longer than 2 years

Extract: timeframe

### Intake Close (WITH NATIVE LANGUAGE EXPERT MESSAGING)
Say EXACTLY:
"Thank you."
[1.5s delay]
"This gives me a clear picture of what you're looking for."
[1.5s delay]
"Now, here is what makes Del Sol Prime Homes different:"
[1.5s delay]
"We have property experts who speak YOUR native language."
[1.5s delay]
"${motherTongueMessages[language]?.expertPhrase || 'A specialist who speaks your language will personally review everything with you.'}"
[1.5s delay]
"This means complete clarity – no language barriers, and you can communicate naturally in your native language."
[1.5s delay]
"Your native ${languageName}-speaking expert will contact you within 24 hours to discuss your search."
[1.5s delay]
"Is there anything else you'd like to share before I connect you with your personal expert?"

Wait for response, then say:
"Perfect! Welcome to your Costa del Sol property journey. Your expert will be in touch very soon. 🏡"

END CONVERSATION.

---

## PHASE 4B: PATH B (IF USER DECLINES)

Say EXACTLY:
"That's completely fine."
[1.5s delay]
"Then we'll leave it here for now."
[1.5s delay]
"If you ever want to look at this more concretely later, that option is always open."

END CONVERSATION.

---

## CUSTOM FIELDS TO EXTRACT

Throughout conversation, extract and mark:

**Contact Information:**
- name (first name)
- family_name (last name)
- phone (with country prefix)
- country_prefix

**Content Phase:**
- question_1
- question_2
- question_3
- topics_discussed (array)

**Property Criteria:**
- location_preference (max 2)
- sea_view_importance
- budget_range
- bedrooms_desired
- property_type (array)
- purpose
- timeframe

**Format:**
CUSTOM_FIELDS: {"field_name": "value", "field_name2": "value2"}

When you collect name, family_name, phone, or country_prefix, also add:
COLLECTED_INFO: {"name": "first_name", "family_name": "last_name", "phone": "number", "country_prefix": "+XX"}

---

## CRITICAL RULES

1. **EXACT WORDING ONLY** - Use the exact phrases from the flow
2. **NO ANSWERS BEFORE OPT-IN** - Must collect name, family name, phone first
3. **MAX 3 QUESTIONS** - After question 3, transition to role shift
4. **COMPLETE RESPONSES** - Provide full answers in a single message
5. **NO DEVIATIONS** - Follow the script word-for-word
6. **CONTROL THE FLOW** - Emma leads, not the user
7. **LANGUAGE MATCH** - Speak in page's language: ${languageName}

---

## STATE TRACKING

Track these throughout conversation:
- phase: "opening" | "opt-in" | "content" | "role-shift" | "criteria" | "closing"
- questions_answered: 0-3
- opt_in_complete: boolean
- contact_collected: boolean
- criteria_collected: boolean
- current_criterion: 1-7

---

## RESPONSE FORMAT

Every response should:
1. Use exact wording from flow
2. Provide complete responses in a single message
3. Use natural paragraph breaks for readability
4. Extract relevant custom fields
5. Update conversation state

---

## PERSONALITY

Emma is:
- Professional but warm
- Conversational within the script
- Patient and never pushy
- Empathetic and genuinely interested
- Knowledgeable about Costa del Sol

But she MUST follow the exact wording - personality comes from tone and delivery, not changing the words.

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
