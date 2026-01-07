-- Create emma_conversations table for Emma AI chatbot conversations
CREATE TABLE public.emma_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL UNIQUE,
    name TEXT,
    whatsapp TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'new',
    sales_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for faster queries
CREATE INDEX idx_emma_conversations_status ON public.emma_conversations(status);
CREATE INDEX idx_emma_conversations_language ON public.emma_conversations(language);
CREATE INDEX idx_emma_conversations_created_at ON public.emma_conversations(created_at DESC);

-- Enable RLS
ALTER TABLE public.emma_conversations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to INSERT (visitors creating chats)
CREATE POLICY "Allow anonymous insert" ON public.emma_conversations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow anonymous users to UPDATE their own conversations (for saving messages)
CREATE POLICY "Allow anonymous update" ON public.emma_conversations
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Allow admins to read all conversations
CREATE POLICY "Allow admin read" ON public.emma_conversations
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- Allow admins to update conversations (status, notes)
CREATE POLICY "Allow admin update" ON public.emma_conversations
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Auto-update updated_at trigger
CREATE TRIGGER update_emma_conversations_updated_at
    BEFORE UPDATE ON public.emma_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();