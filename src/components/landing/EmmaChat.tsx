import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { markdownToHtml } from '@/lib/markdownToHtml';
import { upsertEmmaLead, extractPropertyCriteriaFromHistory } from '@/hooks/useEmmaLeadTracking';

interface Message {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
}

interface EmmaChatProps {
    isOpen: boolean;
    onClose: () => void;
    language: string; // CRITICAL: Emma MUST speak this language
}

interface ChatResponse {
    response: string;
    collectedInfo?: {
        name?: string;
        whatsapp?: string;
    };
    language: string;
}

// Helper function to validate phone numbers (minimum 7 digits)
const isValidPhoneNumber = (value: string | undefined): boolean => {
    if (!value) return false;
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned.length >= 7;
};

const EmmaChat: React.FC<EmmaChatProps> = ({ isOpen, onClose, language }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [conversationId, setConversationId] = useState<string>('');
    const [userData, setUserData] = useState({ name: '', whatsapp: '' });
    const [hasCollectedInfo, setHasCollectedInfo] = useState(false);
    const [accumulatedFields, setAccumulatedFields] = useState<Record<string, any>>({});
    const [hasSubmittedLead, setHasSubmittedLead] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Emma's avatar image
    const emmaAvatar = 'https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/695df9a00597dfcfb07a11d0.jpeg';

    // Initial greeting - EXACT wording per conversation flow (full intro)
    const greetings = {
        en: "Hello, nice to meet you.\n\nIf you are here, you probably have questions about lifestyle, locations, legal matters, real estate, or other practical topics related to the Costa del Sol.\n\nIs that correct?",
        nl: "Hallo, leuk je te ontmoeten.\n\nAls je hier bent, heb je waarschijnlijk vragen over levensstijl, locaties, juridische zaken, vastgoed of andere praktische onderwerpen met betrekking tot de Costa del Sol.\n\nKlopt dat?",
        fr: "Bonjour, ravi de vous rencontrer.\n\nSi vous êtes ici, vous avez probablement des questions sur le style de vie, les emplacements, les questions juridiques, l'immobilier ou d'autres sujets pratiques liés à la Costa del Sol.\n\nEst-ce correct?",
        de: "Hallo, schön Sie kennenzulernen.\n\nWenn Sie hier sind, haben Sie wahrscheinlich Fragen zu Lebensstil, Standorten, rechtlichen Angelegenheiten, Immobilien oder anderen praktischen Themen rund um die Costa del Sol.\n\nIst das richtig?",
        pl: "Cześć, miło Cię poznać.\n\nJeśli tu jesteś, prawdopodobnie masz pytania dotyczące stylu życia, lokalizacji, kwestii prawnych, nieruchomości lub innych praktycznych tematów związanych z Costa del Sol.\n\nCzy to prawda?",
        sv: "Hej, trevligt att träffas.\n\nOm du är här har du förmodligen frågor om livsstil, platser, juridiska frågor, fastigheter eller andra praktiska ämnen relaterade till Costa del Sol.\n\nStämmer det?",
        da: "Hej, dejligt at møde dig.\n\nHvis du er her, har du sandsynligvis spørgsmål om livsstil, beliggenhed, juridiske forhold, ejendomme eller andre praktiske emner relateret til Costa del Sol.\n\nEr det rigtigt?",
        fi: "Hei, hauska tavata.\n\nJos olet täällä, sinulla on todennäköisesti kysymyksiä elämäntavasta, sijainneista, oikeudellisista asioista, kiinteistöistä tai muista Costa del Soliin liittyvistä käytännön aiheista.\n\nOnko näin?",
        hu: "Helló, örülök, hogy találkozunk.\n\nHa itt vagy, valószínűleg kérdéseid vannak az életstílusról, helyszínekről, jogi ügyekről, ingatlanokról vagy más, a Costa del Solhoz kapcsolódó gyakorlati témákról.\n\nIgaz ez?",
        no: "Hei, hyggelig å møte deg.\n\nHvis du er her, har du sannsynligvis spørsmål om livsstil, steder, juridiske forhold, eiendom eller andre praktiske emner knyttet til Costa del Sol.\n\nStemmer det?"
    };

    // "Online now" status text - MUST match page language
    const onlineTexts = {
        en: "Online now - Ask me anything!",
        nl: "Nu online - Vraag me alles!",
        fr: "En ligne maintenant - Demandez-moi tout!",
        de: "Jetzt online - Fragen Sie mich alles!",
        pl: "Teraz online - Zapytaj mnie o cokolwiek!",
        sv: "Online nu - Fråga mig vad som helst!",
        da: "Online nu - Spørg mig om hvad som helst!",
        fi: "Verkossa nyt - Kysy mitä tahansa!",
        hu: "Most online - Kérdezz bármit!",
        no: "På nett nå - Spør meg om hva som helst!"
    };

    // Input placeholder - MUST match page language
    const placeholders = {
        en: "Type your message...",
        nl: "Typ uw bericht...",
        fr: "Tapez votre message...",
        de: "Geben Sie Ihre Nachricht ein...",
        pl: "Wpisz swoją wiadomość...",
        sv: "Skriv ditt meddelande...",
        da: "Skriv din besked...",
        fi: "Kirjoita viestisi...",
        hu: "Írja be üzenetét...",
        no: "Skriv meldingen din..."
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Initialize conversation
            const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setConversationId(convId);

            // Add initial greeting in CORRECT language
            const greeting = greetings[language as keyof typeof greetings] || greetings.en;
            setMessages([{
                id: '1',
                role: 'assistant',
                content: greeting,
                timestamp: new Date()
            }]);

            console.log(`🌍 Emma initialized in ${language.toUpperCase()} language`);
        }
    }, [isOpen, language]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Call Emma AI backend (Supabase Edge Function) with STRICT language parameter
            const { data, error } = await supabase.functions.invoke<ChatResponse & { customFields?: Record<string, any> }>('emma-chat', {
                body: {
                    conversationId,
                    message: input.trim(),
                    language: language, // CRITICAL: Tell Emma which language to use
                    conversationHistory: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    userData: hasCollectedInfo ? userData : null
                }
            });

            if (error) throw error;
            if (!data) throw new Error('No data returned from Emma');

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Merge BOTH customFields AND collectedInfo into accumulated fields
            let newAccumulatedFields: Record<string, any> = {
                ...accumulatedFields,
                ...(data.customFields || {}),
                ...(data.collectedInfo || {}) // CRITICAL: Include contact info in accumulated fields
            };
            
            // VALIDATE phone numbers from AI tags - reject invalid values like "yes", "ok"
            if (newAccumulatedFields.phone_number && !isValidPhoneNumber(newAccumulatedFields.phone_number)) {
                console.log('⚠️ Rejecting invalid phone_number from AI:', newAccumulatedFields.phone_number);
                delete newAccumulatedFields.phone_number;
            }
            if (newAccumulatedFields.phone && !isValidPhoneNumber(newAccumulatedFields.phone)) {
                console.log('⚠️ Rejecting invalid phone from AI:', newAccumulatedFields.phone);
                delete newAccumulatedFields.phone;
            }
            if (newAccumulatedFields.whatsapp && !isValidPhoneNumber(newAccumulatedFields.whatsapp)) {
                console.log('⚠️ Rejecting invalid whatsapp from AI:', newAccumulatedFields.whatsapp);
                delete newAccumulatedFields.whatsapp;
            }
            
            // ALWAYS run fallback extraction on every message (not just on close/complete)
            const allMessages = [...messages, assistantMessage];
            
            // Extract contact info if missing
            const hasContactInfo = newAccumulatedFields.name || newAccumulatedFields.first_name || newAccumulatedFields.phone || newAccumulatedFields.phone_number;
            if (!hasContactInfo && allMessages.length > 2) {
                const extractedContact = extractContactFromHistory(allMessages);
                newAccumulatedFields = { ...newAccumulatedFields, ...extractedContact };
            }
            
            // Extract Q&A if missing
            const hasQA = newAccumulatedFields.question_1 || newAccumulatedFields.answer_1;
            if (!hasQA && allMessages.length > 4) {
                const extractedQA = extractQAFromHistory(allMessages);
                if (extractedQA.questions_answered && parseInt(extractedQA.questions_answered) > 0) {
                    newAccumulatedFields = { ...newAccumulatedFields, ...extractedQA };
                }
            }
            
            // Extract property criteria if in that phase
            const propertyCriteria = extractPropertyCriteriaFromHistory(allMessages.map(m => ({ role: m.role, content: m.content })));
            if (Object.keys(propertyCriteria).length > 0) {
                newAccumulatedFields = { ...newAccumulatedFields, ...propertyCriteria };
            }
            
            // Debug logging for accumulated fields
            console.log('📊 Accumulated fields so far:', JSON.stringify(newAccumulatedFields, null, 2));
            
            // PROGRESSIVE SAVE: Save lead data to emma_leads after EVERY message
            const leadData = {
                conversation_id: conversationId,
                first_name: newAccumulatedFields.name || newAccumulatedFields.first_name,
                last_name: newAccumulatedFields.family_name || newAccumulatedFields.last_name,
                phone_number: newAccumulatedFields.phone || newAccumulatedFields.phone_number,
                country_prefix: newAccumulatedFields.country_prefix,
                question_1: newAccumulatedFields.question_1,
                answer_1: newAccumulatedFields.answer_1,
                question_2: newAccumulatedFields.question_2,
                answer_2: newAccumulatedFields.answer_2,
                question_3: newAccumulatedFields.question_3,
                answer_3: newAccumulatedFields.answer_3,
                questions_answered: countQuestionsAnswered(newAccumulatedFields),
                location_preference: Array.isArray(newAccumulatedFields.location_preference) 
                    ? newAccumulatedFields.location_preference 
                    : (newAccumulatedFields.location_preference ? [newAccumulatedFields.location_preference] : undefined),
                sea_view_importance: newAccumulatedFields.sea_view_importance,
                budget_range: newAccumulatedFields.budget_range,
                bedrooms_desired: newAccumulatedFields.bedrooms_desired,
                property_type: Array.isArray(newAccumulatedFields.property_type)
                    ? newAccumulatedFields.property_type
                    : (newAccumulatedFields.property_type ? [newAccumulatedFields.property_type] : undefined),
                property_purpose: newAccumulatedFields.purpose || newAccumulatedFields.property_purpose,
                timeframe: newAccumulatedFields.timeframe,
                detected_language: language.toUpperCase(),
                intake_complete: newAccumulatedFields.intake_complete || false,
                declined_selection: newAccumulatedFields.declined_selection || false,
                exit_point: determineExitPoint(newAccumulatedFields),
                conversation_status: newAccumulatedFields.intake_complete ? 'completed' 
                    : newAccumulatedFields.declined_selection ? 'declined' 
                    : 'in_progress'
            };
            
            // Save progressively (non-blocking)
            upsertEmmaLead(leadData).catch(err => console.error('Progressive save error:', err));
            
            // Check if intake is complete and we haven't already submitted
            if (!hasSubmittedLead && (data.customFields?.intake_complete || data.customFields?.declined_selection)) {
                console.log('🎯 TRIGGER: GHL webhook triggered!');
                console.log('   intake_complete:', data.customFields?.intake_complete);
                console.log('   declined_selection:', data.customFields?.declined_selection);
                
                // Also merge userData if available (from database record) - but validate phone
                if (userData.name || userData.whatsapp) {
                    console.log('📊 Merging userData into fields:', JSON.stringify(userData, null, 2));
                    if (!newAccumulatedFields.first_name && !newAccumulatedFields.name && userData.name) {
                        newAccumulatedFields.first_name = userData.name;
                    }
                    if (!newAccumulatedFields.phone_number && !newAccumulatedFields.phone && userData.whatsapp && isValidPhoneNumber(userData.whatsapp)) {
                        newAccumulatedFields.phone_number = userData.whatsapp;
                    }
                }
                
                setHasSubmittedLead(true);
                await sendToGHL(newAccumulatedFields);
            }
            
            setAccumulatedFields(newAccumulatedFields);

            // Check if Emma collected contact info (for local state)
            if (data.collectedInfo) {
                setUserData({
                    name: data.collectedInfo.name || '',
                    whatsapp: data.collectedInfo.whatsapp || ''
                });
                setHasCollectedInfo(true);

                // Save to database
                await saveConversation(data.collectedInfo);
            }

        } catch (error) {
            console.error('Error sending message:', error);

            // Error message in correct language
            const errorMessages = {
                en: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
                nl: "Het spijt me, ik heb momenteel verbindingsproblemen. Probeer het over een moment opnieuw.",
                fr: "Je suis désolée, j'ai des problèmes de connexion en ce moment. Veuillez réessayer dans un instant.",
                de: "Es tut mir leid, ich habe gerade Verbindungsprobleme. Bitte versuchen Sie es in einem Moment erneut.",
                pl: "Przepraszam, mam teraz problemy z połączeniem. Spróbuj ponownie za chwilę.",
                sv: "Förlåt, jag har problem med anslutningen just nu. Försök igen om ett ögonblick.",
                da: "Undskyld, jeg har forbindelsesproblemer lige nu. Prøv igen om et øjeblik.",
                fi: "Anteeksi, minulla on yhteysongelmia juuri nyt. Yritä uudelleen hetken kuluttua.",
                hu: "Sajnálom, most csatlakozási problémáim vannak. Kérjük, próbálja újra egy pillanat múlva.",
                no: "Beklager, jeg har tilkoblingsproblemer akkurat nå. Prøv igjen om et øyeblikk."
            };

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorMessages[language as keyof typeof errorMessages] || errorMessages.en,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveConversation = async (info: any) => {
        try {
            await supabase.from('emma_conversations' as any).insert([{
                conversation_id: conversationId,
                name: info.name,
                whatsapp: info.whatsapp,
                language: language, // Store which language Emma used
                messages: messages,
                status: 'new',
                created_at: new Date().toISOString()
            }]);

            console.log(`✅ Conversation saved - Language: ${language}, Name: ${info.name}`);
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    };

    // Helper function to determine where user exited in conversation
    const determineExitPoint = (fields: Record<string, any>): string => {
        if (fields.timeframe) return 'completed';
        if (fields.property_purpose || fields.purpose) return 'property_criteria_purpose';
        if (fields.property_type) return 'property_criteria_type';
        if (fields.bedrooms_desired) return 'property_criteria_bedrooms';
        if (fields.budget_range) return 'property_criteria_budget';
        if (fields.sea_view_importance) return 'property_criteria_seaview';
        if (fields.location_preference) return 'property_criteria_location';
        if (fields.question_3 || fields.answer_3) return 'question_3';
        if (fields.question_2 || fields.answer_2) return 'question_2';
        if (fields.question_1 || fields.answer_1) return 'question_1';
        if (fields.phone || fields.phone_number) return 'contact_collection';
        if (fields.name || fields.first_name) return 'name_collection';
        return 'greeting';
    };

    // Count questions answered
    const countQuestionsAnswered = (fields: Record<string, any>): number => {
        let count = 0;
        if (fields.question_1 && fields.answer_1) count++;
        if (fields.question_2 && fields.answer_2) count++;
        if (fields.question_3 && fields.answer_3) count++;
        return count;
    };

    // FALLBACK: Extract contact info from conversation history when COLLECTED_INFO is not output
    const extractContactFromHistory = (msgs: Message[]): Record<string, string> => {
        const contact: Record<string, string> = {};
        
        // Patterns that indicate Emma asked for specific info (multilingual)
        const namePatterns = [
            'how may i address you',
            'how should i address you',
            'what is your name',
            'hoe mag ik je noemen',
            'comment puis-je vous appeler',
            'wie darf ich sie anreden',
            'jak mogę się do ciebie zwracać',
            'vad får jag kalla dig',
            'hvad må jeg kalde dig',
            'miten voin kutsua sinua',
            'hogyan szólíthatlak',
            'hva kan jeg kalle deg'
        ];
        
        const familyNamePatterns = [
            'family name',
            'last name',
            'surname',
            'achternaam',
            'nom de famille',
            'nachname',
            'familienname',
            'nazwisko',
            'efternamn',
            'efternavn',
            'sukunimi',
            'vezetéknév',
            'etternavn'
        ];
        
        const phonePatterns = [
            'which number may i send',
            'what number can i reach you',
            'phone number',
            'whatsapp',
            'op welk nummer',
            'quel numéro',
            'welche nummer',
            'na jaki numer',
            'vilket nummer',
            'hvilket nummer',
            'mihin numeroon',
            'milyen számra',
            'hvilket nummer'
        ];
        
        const prefixPatterns = [
            'country prefix',
            'country code',
            'landnummer',
            'indicatif',
            'landesvorwahl',
            'numer kierunkowy',
            'landskod',
            'landekode',
            'maatunnus',
            'országkód',
            'landskode'
        ];
        
        // Scan conversation for assistant questions followed by user answers
        for (let i = 0; i < msgs.length - 1; i++) {
            const msg = msgs[i];
            const nextMsg = msgs[i + 1];
            
            if (msg.role === 'assistant' && nextMsg.role === 'user') {
                const assistantContent = msg.content.toLowerCase();
                const userResponse = nextMsg.content.trim();
                
                // Check for name collection
                if (!contact.first_name && namePatterns.some(p => assistantContent.includes(p))) {
                    contact.first_name = userResponse;
                    console.log('📋 FALLBACK: Extracted first_name from history:', userResponse);
                }
                // Check for family name collection
                else if (!contact.last_name && familyNamePatterns.some(p => assistantContent.includes(p))) {
                    contact.last_name = userResponse;
                    console.log('📋 FALLBACK: Extracted last_name from history:', userResponse);
                }
                // Check for phone collection
                else if (!contact.phone_number && phonePatterns.some(p => assistantContent.includes(p))) {
                    // Only accept if we have at least 7 digits (valid phone number)
                    const cleaned = userResponse.replace(/[^\d]/g, '');
                    if (cleaned.length >= 7) {
                        contact.phone_number = userResponse;
                        console.log('📋 FALLBACK: Extracted phone_number from history:', userResponse);
                    } else {
                        console.log('📋 FALLBACK: Rejected invalid phone (less than 7 digits):', userResponse);
                    }
                }
                // Check for country prefix
                else if (!contact.country_prefix && prefixPatterns.some(p => assistantContent.includes(p))) {
                    contact.country_prefix = userResponse;
                    console.log('📋 FALLBACK: Extracted country_prefix from history:', userResponse);
                }
            }
        }
        
        console.log('📋 FALLBACK: Contact extraction result:', JSON.stringify(contact, null, 2));
        return contact;
    };

    // Extract Q&A from conversation history - captures RAW sequential turns during content phase
    const extractQAFromHistory = (msgs: Message[]): Record<string, string> => {
        const qa: Record<string, string> = {};
        
        // Patterns that indicate content phase start (after contact collection, before property criteria)
        const contentPhaseStartPatterns = [
            'what is currently the main thing on your mind',
            'what would you like to know',
            'i can now handle your questions',
            'wat houdt je momenteel het meest bezig',
            'ich kann jetzt ihre fragen bearbeiten',
            'je peux maintenant traiter vos questions',
            'co jest obecnie główną rzeczą',
            'vad har du för huvudfrågor',
            'hvad har du mest på sinde',
            'mikä on tällä hetkellä tärkein asia',
            'mi a legfontosabb dolog',
            'hva er det viktigste'
        ];
        
        // Patterns that indicate transition OUT of content phase (into property criteria intake)
        const transitionPatterns = [
            'to avoid staying too general',
            'switching to a more focused approach',
            'personalized selection',
            'based on what you\'ve shared',
            'seven quick questions',
            'om te voorkomen dat we te algemeen blijven',
            'um nicht zu allgemein zu bleiben',
            'pour éviter de rester trop général',
            'aby uniknąć zbyt ogólnych',
            'för att undvika att vara för allmän',
            'for at undgå at blive for generel',
            'välttääksemme liian yleistä',
            'hogy ne maradjunk túl általánosak',
            'for å unngå å bli for generell',
            'which area or areas along the costa del sol',
            'which location or locations'
        ];
        
        let contentPhaseStart = -1;
        let transitionPoint = msgs.length;
        
        // Find content phase boundaries
        for (let i = 0; i < msgs.length; i++) {
            const msg = msgs[i];
            if (msg.role !== 'assistant') continue;
            
            const content = msg.content.toLowerCase();
            
            // Find start of content phase
            if (contentPhaseStart === -1 && contentPhaseStartPatterns.some(p => content.includes(p))) {
                contentPhaseStart = i;
                console.log(`📋 Q&A: Content phase starts at index ${i}`);
            }
            
            // Find end of content phase (transition to property criteria)
            if (contentPhaseStart !== -1 && transitionPatterns.some(p => content.includes(p))) {
                transitionPoint = i;
                console.log(`📋 Q&A: Content phase ends at index ${i}`);
                break;
            }
        }
        
        // If no content phase found, return empty
        if (contentPhaseStart === -1) {
            console.log('📋 Q&A: No content phase detected');
            return qa;
        }
        
        // Capture RAW sequential user-assistant turns during content phase (up to 3)
        let turnCount = 0;
        for (let i = contentPhaseStart + 1; i < transitionPoint && turnCount < 3; i++) {
            const msg = msgs[i];
            const nextMsg = msgs[i + 1];
            
            // Capture user message followed by assistant response
            if (msg.role === 'user' && nextMsg && nextMsg.role === 'assistant') {
                turnCount++;
                const qKey = `question_${turnCount}`;
                const aKey = `answer_${turnCount}`;
                
                // Capture raw content (including short responses like "yes", "ok", etc.)
                qa[qKey] = msg.content.trim().substring(0, 500);
                qa[aKey] = nextMsg.content.trim().substring(0, 500);
                
                console.log(`📋 Q&A: Turn ${turnCount} - User: "${qa[qKey].substring(0, 50)}..." → Emma: "${qa[aKey].substring(0, 50)}..."`);
                i++; // Skip the assistant message we just processed
            }
        }
        
        qa.questions_answered = turnCount.toString();
        console.log(`📋 Q&A: Total turns captured: ${turnCount}`);
        
        return qa;
    };

    // Send lead data to GoHighLevel webhook with ALL 24 fields
    const sendToGHL = async (fields: Record<string, any>) => {
        console.log('📤 Preparing to send to GHL webhook...');
        console.log('📤 Raw fields received:', JSON.stringify(fields, null, 2));

        // Determine conversation status
        let conversationStatus = 'in_progress';
        if (fields.intake_complete) {
            conversationStatus = 'completed';
        } else if (fields.declined_selection) {
            conversationStatus = 'declined';
        } else if (fields.closed_early) {
            conversationStatus = 'abandoned';
        }

        // Determine exit point
        const exitPoint = fields.exit_point || determineExitPoint(fields);

        try {
            const payload = {
                conversation_id: conversationId, // Include for tracking
                contact_info: {
                    first_name: fields.name || fields.first_name || '',
                    last_name: fields.family_name || fields.last_name || '',
                    phone_number: fields.phone || fields.phone_number || '',
                    country_prefix: fields.country_prefix || ''
                },
                content_phase: {
                    question_1: fields.question_1 || '',
                    answer_1: fields.answer_1 || '',
                    question_2: fields.question_2 || '',
                    answer_2: fields.answer_2 || '',
                    question_3: fields.question_3 || '',
                    answer_3: fields.answer_3 || '',
                    questions_answered: countQuestionsAnswered(fields)
                },
                property_criteria: {
                    location_preference: Array.isArray(fields.location_preference) 
                        ? fields.location_preference 
                        : (fields.location_preference ? [fields.location_preference] : []),
                    sea_view_importance: fields.sea_view_importance || '',
                    budget_range: fields.budget_range || '',
                    bedrooms_desired: fields.bedrooms_desired || '',
                    property_type: Array.isArray(fields.property_type)
                        ? fields.property_type
                        : (fields.property_type ? [fields.property_type] : []),
                    property_purpose: fields.purpose || fields.property_purpose || '',
                    timeframe: fields.timeframe || ''
                },
                system_data: {
                    detected_language: language.toUpperCase() || 'English',
                    intake_complete: fields.intake_complete || false,
                    declined_selection: fields.declined_selection || false,
                    conversation_date: new Date().toISOString(),
                    conversation_status: conversationStatus,
                    exit_point: exitPoint
                }
            };

            console.log('📤 Complete GHL Payload (24 fields):', JSON.stringify(payload, null, 2));
            console.log('📤 Sending lead to GHL...');
            
            const { error } = await supabase.functions.invoke('send-emma-lead', { body: payload });
            
            if (error) {
                console.error('❌ GHL webhook error:', error);
                return false;
            }
            
            console.log('✅ Lead sent to GHL successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to send lead to GHL:', error);
            // Don't block conversation if webhook fails
            return false;
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Handle close with partial lead capture - ALWAYS send whatever data we have
    const handleClose = async () => {
        // Send partial lead if we have ANY accumulated data and haven't already submitted
        let fieldsToSend = { ...accumulatedFields };
        
        // FALLBACK: Extract contact from conversation history if missing
        const hasContactInfo = fieldsToSend.name || fieldsToSend.first_name || fieldsToSend.phone || fieldsToSend.phone_number;
        if (!hasContactInfo && messages.length > 1) {
            console.log('⚠️ CLOSE: Contact info missing, using fallback extraction...');
            const extractedContact = extractContactFromHistory(messages);
            fieldsToSend = { ...fieldsToSend, ...extractedContact };
        }
        
        // FALLBACK: Extract Q&A from conversation history if missing
        const hasQA = fieldsToSend.question_1 || fieldsToSend.answer_1;
        if (!hasQA && messages.length > 3) {
            console.log('⚠️ CLOSE: Q&A missing, using fallback extraction...');
            const extractedQA = extractQAFromHistory(messages);
            fieldsToSend = { ...fieldsToSend, ...extractedQA };
        }
        
        // Also merge userData if available
        if (userData.name || userData.whatsapp) {
            fieldsToSend = {
                ...fieldsToSend,
                first_name: fieldsToSend.first_name || fieldsToSend.name || userData.name || '',
                phone_number: fieldsToSend.phone_number || fieldsToSend.phone || userData.whatsapp || ''
            };
        }
        
        const hasAnyData = Object.keys(fieldsToSend).length > 0;
        
        if (hasAnyData && !hasSubmittedLead) {
            console.log('🚪 CLOSE: User closing chat, sending partial data to GHL...');
            console.log('🚪 CLOSE: Data collected so far:', JSON.stringify(fieldsToSend, null, 2));
            
            const exitPoint = determineExitPoint(fieldsToSend);
            console.log('🚪 CLOSE: Exit point determined:', exitPoint);
            
            setHasSubmittedLead(true);
            await sendToGHL({
                ...fieldsToSend,
                closed_early: true,
                exit_point: exitPoint
            });
        } else if (!hasAnyData) {
            console.log('🚪 CLOSE: No data collected, skipping webhook');
        } else {
            console.log('🚪 CLOSE: Already submitted lead, skipping duplicate');
        }
        
        onClose();
    };

    if (!isOpen) return null;

    const currentOnlineText = onlineTexts[language as keyof typeof onlineTexts] || onlineTexts.en;
    const currentPlaceholder = placeholders[language as keyof typeof placeholders] || placeholders.en;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6">
            {/* Backdrop - warm navy tint */}
            <div
                className="absolute inset-0 bg-landing-navy/30 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Chat Window - Luxury styling */}
            <div
                className={`relative bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 animate-scale-in ${isMinimized
                    ? 'w-80 h-20'
                    : 'w-full max-w-md h-[600px] md:h-[700px]'
                    }`}
            >
                {/* Header - Navy gradient with gold accent */}
                <div className="flex items-center justify-between p-4 border-b border-landing-gold/20 bg-gradient-to-r from-landing-navy via-landing-navy to-[#2A3342] text-white rounded-t-3xl relative">
                    {/* Gold accent line */}
                    <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-landing-gold/50 to-transparent" />
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img
                                src={emmaAvatar}
                                alt="Emma"
                                className="w-12 h-12 rounded-full object-cover border-2 border-landing-gold/80 shadow-lg"
                            />
                            {/* Online indicator - gold */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-landing-gold border-2 border-white rounded-full" />
                        </div>
                        <div>
                            <h3 className="font-serif text-xl tracking-wide">Emma</h3>
                            <p className="text-xs text-white/80 font-light">{currentOnlineText}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-2 hover:bg-landing-gold/20 rounded-full transition-colors"
                            aria-label={isMinimized ? "Maximize" : "Minimize"}
                        >
                            {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-landing-gold/20 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Messages - Warm cream background */}
                        <div
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#FDFBF7] to-[#F9F6F0]"
                        >
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 animate-fade-in ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <img
                                            src={emmaAvatar}
                                            alt="Emma"
                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-landing-gold/30"
                                        />
                                    )}

                                    <div
                                        className={`max-w-[75%] p-3.5 rounded-2xl ${message.role === 'user'
                                            ? 'bg-gradient-to-r from-landing-gold to-[#D4B366] text-white rounded-tr-sm shadow-lg'
                                            : 'bg-white text-landing-navy rounded-tl-sm shadow-md border border-gray-100/80'
                                            }`}
                                    >
                                        <div 
                                            className="text-sm leading-relaxed prose prose-sm max-w-none
                                                       prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-semibold
                                                       [&>p]:whitespace-pre-wrap"
                                            dangerouslySetInnerHTML={{ 
                                                __html: markdownToHtml(message.content) 
                                            }}
                                        />
                                        <span className={`text-xs mt-1.5 block ${message.role === 'user' ? 'text-white/70' : 'text-landing-gold/60'}`}>
                                            {message.timestamp.toLocaleTimeString(language, {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3 animate-fade-in">
                                    <img
                                        src={emmaAvatar}
                                        alt="Emma"
                                        className="w-8 h-8 rounded-full object-cover border border-landing-gold/30"
                                    />
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-md border border-gray-100/80">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 bg-landing-gold rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-landing-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                            <div className="w-2 h-2 bg-landing-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input - Refined styling */}
                        <div className="border-t border-gray-100 bg-white p-4 rounded-b-3xl">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={currentPlaceholder}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-landing-gold/30 focus:border-landing-gold bg-white/80 backdrop-blur-sm transition-all text-landing-navy placeholder:text-gray-400"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !input.trim()}
                                    className="p-3 bg-landing-gold hover:bg-landing-gold/90 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                    aria-label="Send message"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmmaChat;
