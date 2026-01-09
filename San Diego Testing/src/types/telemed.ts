export type TelemedSessionStatus = 'requested' | 'queued' | 'accepted' | 'connecting' | 'in_progress' | 'completed' | 'cancelled' | 'dropped' | 'failed';

export interface TelemedUser {
    id: string;
    role: 'patient' | 'nurse' | 'admin';
    name: string;
    avatarUrl?: string;
}

export interface TelemedSession {
    id: string;
    patientId: string;
    providerId?: string;
    status: TelemedSessionStatus;
    createdAt: string;
    startedAt?: string;
    endedAt?: string;
    metadata?: Record<string, any>;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'system';
    createdAt: string;
}
