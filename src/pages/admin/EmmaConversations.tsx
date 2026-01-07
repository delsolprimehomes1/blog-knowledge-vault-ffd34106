import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    MessageCircle,
    Search,
    Filter,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    Globe
} from 'lucide-react';

interface EmmaConversation {
    id: string;
    conversation_id: string;
    name: string | null;
    whatsapp: string | null;
    language: string;
    messages: any[];
    status: string;
    sales_notes: string | null;
    created_at: string;
    updated_at: string;
}

// Map language codes to flags/names
const languageFlags: Record<string, string> = {
    en: '🇬🇧 English',
    nl: '🇳🇱 Dutch',
    fr: '🇫🇷 French',
    de: '🇩🇪 German',
    pl: '🇵🇱 Polish',
    sv: '🇸🇪 Swedish',
    da: '🇩🇰 Danish',
    fi: '🇫🇮 Finnish',
    hu: '🇭🇺 Hungarian',
    no: '🇳🇴 Norwegian'
};

const EmmaConversations = () => {
    const [conversations, setConversations] = useState<EmmaConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterLanguage, setFilterLanguage] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedConversation, setSelectedConversation] = useState<EmmaConversation | null>(null);

    useEffect(() => {
        fetchConversations();
    }, [filterLanguage, filterStatus]);

    async function fetchConversations() {
        setLoading(true);
        let query = supabase
            .from('emma_conversations' as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (filterLanguage !== 'all') {
            query = query.eq('language', filterLanguage);
        }

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching conversations:', error);
        } else {
            setConversations((data as any) || []);
        }
        setLoading(false);
    }

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('emma_conversations' as any)
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
        } else {
            // Optimistic update
            setConversations(conversations.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
            ));
            if (selectedConversation?.id === id) {
                setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : null);
            }
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="w-8 h-8 text-primary" />
                        Emma Conversations
                    </h1>
                    <p className="text-gray-500">Manage automated chats and leads from Emma AI</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={filterLanguage}
                            onChange={(e) => setFilterLanguage(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Languages</option>
                            {Object.entries(languageFlags).map(([code, name]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="new">New Lead</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="closed">Closed</option>
                            <option value="lost">Lost</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                {/* List Column */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-gray-50 font-medium text-gray-700 flex justify-between items-center">
                        <span>Conversations ({conversations.length})</span>
                        <button
                            onClick={() => fetchConversations()}
                            className="text-xs text-primary hover:underline"
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading conversations...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No conversations found matching filters.</div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-primary' : 'border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-gray-900 truncate">
                                            {conv.name || 'Anonymous User'}
                                        </span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(conv.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                            {languageFlags[conv.language]?.split(' ')[0] || '🌐'} {conv.language.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${conv.status === 'new' ? 'bg-green-100 text-green-700' :
                                            conv.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {conv.status}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-500 truncate">
                                        {conv.messages.length} messages · Last active {new Date(conv.updated_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Column */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Detail Header */}
                            <div className="p-6 border-b flex justify-between items-start bg-gray-50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {selectedConversation.name || 'Anonymous User'}
                                        {selectedConversation.whatsapp && (
                                            <a
                                                href={`https://wa.me/${selectedConversation.whatsapp.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-normal flex items-center gap-1"
                                            >
                                                <MessageCircle className="w-3 h-3" />
                                                {selectedConversation.whatsapp}
                                            </a>
                                        )}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Conversation ID: {selectedConversation.conversation_id}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedConversation.status}
                                        onChange={(e) => updateStatus(selectedConversation.id, e.target.value)}
                                        className="border rounded-md text-sm p-1"
                                    >
                                        <option value="new">New Lead</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="qualified">Qualified</option>
                                        <option value="closed">Closed / Won</option>
                                        <option value="lost">Lost / Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Chat Transcript */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                                {selectedConversation.messages.map((msg: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] p-4 rounded-xl shadow-sm ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border rounded-bl-none'
                                            }`}>
                                            <p className="text-sm border-b border-white/20 pb-1 mb-1 opacity-75 text-xs font-medium uppercase tracking-wider">
                                                {msg.role === 'user' ? 'Visitor' : 'Emma AI'}
                                            </p>
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">Select a conversation to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmmaConversations;
