import { TelemedSession, ChatMessage } from '../types/telemed';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class TelemedService {

    async requestSession(patientId: string, metadata?: any): Promise<TelemedSession> {
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                patient_id: patientId,
                status: 'requested',
                metadata
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapSession(data);
    }

    async getSession(sessionId: string): Promise<TelemedSession> {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;
        return this.mapSession(data);
    }

    async acceptSession(sessionId: string, providerId: string): Promise<TelemedSession> {
        const { data, error } = await supabase
            .from('sessions')
            .update({ status: 'accepted', provider_id: providerId })
            .eq('id', sessionId)
            .select()
            .single();
        if (error) throw error;
        return this.mapSession(data);
    }

    async sendMessage(sessionId: string, senderId: string, content: string): Promise<ChatMessage> {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                session_id: sessionId,
                sender_id: senderId,
                content
            })
            .select()
            .single();
        if (error) throw error;
        return this.mapMessage(data);
    }

    // Helpers to map DB snake_case to app camelCase
    private mapSession(dbRecord: any): TelemedSession {
        return {
            id: dbRecord.id,
            patientId: dbRecord.patient_id,
            providerId: dbRecord.provider_id,
            status: dbRecord.status,
            createdAt: dbRecord.created_at,
            startedAt: dbRecord.started_at,
            endedAt: dbRecord.ended_at,
            metadata: dbRecord.metadata
        };
    }

    private mapMessage(dbRecord: any): ChatMessage {
        return {
            id: dbRecord.id,
            sessionId: dbRecord.session_id,
            senderId: dbRecord.sender_id,
            content: dbRecord.content,
            type: dbRecord.type || 'text',
            createdAt: dbRecord.created_at
        }
    }
}

export const telemedService = new TelemedService();
