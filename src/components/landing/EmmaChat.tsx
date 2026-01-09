import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

const EmmaChat: React.FC<EmmaChatProps> = ({ isOpen, onClose, language }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [conversationId, setConversationId] = useState<string>('');
    const [userData, setUserData] = useState({ name: '', whatsapp: '' });
    const [hasCollectedInfo, setHasCollectedInfo] = useState(false);

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
            const { data, error } = await supabase.functions.invoke<ChatResponse>('emma-chat', {
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

            // Single message response - no splitting

            // Check if Emma collected contact info
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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) return null;

    const currentOnlineText = onlineTexts[language as keyof typeof onlineTexts] || onlineTexts.en;
    const currentPlaceholder = placeholders[language as keyof typeof placeholders] || placeholders.en;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6">
            {/* Backdrop - warm navy tint */}
            <div
                className="absolute inset-0 bg-landing-navy/30 backdrop-blur-sm"
                onClick={onClose}
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
                            onClick={onClose}
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
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
