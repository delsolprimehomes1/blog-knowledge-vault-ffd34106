import React, { createContext, useContext, useEffect, useState } from 'react';
import { TelemedSession, ChatMessage, TelemedUser } from '../types/telemed';
import { telemedService, supabase } from '../services/telemed';

interface TelemedContextType {
    session: TelemedSession | null;
    messages: ChatMessage[];
    requestSession: (patientId: string, metadata?: any) => Promise<void>;
    joinSession: (sessionId: string) => Promise<void>;
    sendMessage: (text: string) => Promise<void>;
    endSession: () => Promise<void>;
}

const TelemedContext = createContext<TelemedContextType | undefined>(undefined);

export const TelemedProvider: React.FC<{ children: React.ReactNode; user: TelemedUser }> = ({ children, user }) => {
    const [session, setSession] = useState<TelemedSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Realtime Subscription
    useEffect(() => {
        if (!session?.id) return;

        const channel = supabase.channel(`session:${session.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `session_id=eq.${session.id}`
            }, (payload) => {
                const newMsg = payload.new as any;
                // Map to our type if needed, or assume payload matches
                const mappedMsg: ChatMessage = {
                    id: newMsg.id,
                    sessionId: newMsg.session_id,
                    senderId: newMsg.sender_id,
                    content: newMsg.content,
                    type: newMsg.type || 'text',
                    createdAt: newMsg.created_at
                };
                setMessages(prev => [...prev, mappedMsg]);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'sessions',
                filter: `id=eq.${session.id}`
            }, (payload) => {
                const updatedSession = payload.new as any;
                setSession(prev => prev ? { ...prev, status: updatedSession.status, providerId: updatedSession.provider_id } : null);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.id]);

    const requestSession = async (patientId: string, metadata?: any) => {
        const newSession = await telemedService.requestSession(patientId, metadata);
        setSession(newSession);
    };

    const joinSession = async (sessionId: string) => {
        const sess = await telemedService.getSession(sessionId);
        setSession(sess);
        // Fetch existing messages
        const { data } = await supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at');
        if (data) {
            const mapped = data.map((d: any) => ({
                id: d.id,
                sessionId: d.session_id,
                senderId: d.sender_id,
                content: d.content,
                type: d.type || 'text',
                createdAt: d.created_at
            }));
            setMessages(mapped);
        }
    };

    const sendMessage = async (text: string) => {
        if (!session || !user) return;
        await telemedService.sendMessage(session.id, user.id, text);
    };

    const endSession = async () => {
        // Implementation depends on who ends it
        // For now just clear local state
        setSession(null);
        setMessages([]);
    };

    return (
        <TelemedContext.Provider value={{ session, messages, requestSession, joinSession, sendMessage, endSession }}>
            {children}
        </TelemedContext.Provider>
    );
};

export const useTelemed = () => {
    const context = useContext(TelemedContext);
    if (!context) throw new Error('useTelemed must be used within a TelemedProvider');
    return context;
};
