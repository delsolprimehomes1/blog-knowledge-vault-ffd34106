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
    hasMore?: boolean;
    remainingMessages?: string[];
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

    // Initial greeting - EXACT wording per conversation flow
    const greetings = {
        en: "Hello, nice to meet you.",
        nl: "Hallo, leuk je te ontmoeten.",
        fr: "Bonjour, ravi de vous rencontrer.",
        de: "Hallo, schön Sie kennenzulernen.",
        pl: "Cześć, miło Cię poznać.",
        sv: "Hej, trevligt att träffas.",
        da: "Hej, dejligt at møde dig.",
        fi: "Hei, hauska tavata.",
        hu: "Helló, örülök, hogy találkozunk.",
        no: "Hei, hyggelig å møte deg."
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

            // If there are more messages, send them with delay
            if (data.remainingMessages && data.remainingMessages.length > 0) {
                for (let i = 0; i < data.remainingMessages.length; i++) {
                    setIsLoading(true);
                    // Wait 1.5 seconds between messages (natural typing delay)
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    const followUpMessage: Message = {
                        id: (Date.now() + i + 2).toString(),
                        role: 'assistant',
                        content: data.remainingMessages[i],
                        timestamp: new Date()
                    };

                    setMessages(prev => [...prev, followUpMessage]);
                }
            }

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
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Chat Window */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isMinimized
                    ? 'w-80 h-20'
                    : 'w-full max-w-md h-[600px] md:h-[700px]'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-blue-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img
                                src={emmaAvatar}
                                alt="Emma"
                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                            />
                            {/* Online indicator */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Emma</h3>
                            <p className="text-xs text-white/90">{currentOnlineText}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label={isMinimized ? "Maximize" : "Minimize"}
                        >
                            {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Messages */}
                        <div
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                        >
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <img
                                            src={emmaAvatar}
                                            alt="Emma"
                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                        />
                                    )}

                                    <div
                                        className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${message.role === 'user'
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : 'bg-white text-gray-900 rounded-tl-none'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                        <span className="text-xs opacity-70 mt-1 block">
                                            {message.timestamp.toLocaleTimeString(language, {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3">
                                    <img
                                        src={emmaAvatar}
                                        alt="Emma"
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t bg-white p-4 rounded-b-2xl">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={currentPlaceholder}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !input.trim()}
                                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
