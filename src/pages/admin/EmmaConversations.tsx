import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    MessageCircle,
    Filter,
    Globe,
    User,
    Home,
    MapPin,
    Wallet,
    Bed,
    Calendar,
    Target,
    Phone,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw,
    Eye,
    Send,
    ChevronRight,
    XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface EmmaLead {
    id: string;
    conversation_id: string;
    // Contact Info
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    country_prefix: string | null;
    // Q&A Phase
    question_1: string | null;
    answer_1: string | null;
    question_2: string | null;
    answer_2: string | null;
    question_3: string | null;
    answer_3: string | null;
    questions_answered: number;
    // Property Criteria
    location_preference: string[] | null;
    sea_view_importance: string | null;
    budget_range: string | null;
    bedrooms_desired: string | null;
    property_type: string[] | null;
    property_purpose: string | null;
    timeframe: string | null;
    // System Data
    detected_language: string;
    intake_complete: boolean;
    declined_selection: boolean;
    conversation_date: string;
    conversation_status: string;
    exit_point: string;
    // Webhook Tracking
    webhook_sent: boolean;
    webhook_sent_at: string | null;
    webhook_attempts: number;
    webhook_last_error: string | null;
    // Metadata
    created_at: string;
    updated_at: string;
}

// Map language codes to flags/names
const languageFlags: Record<string, string> = {
    EN: '🇬🇧 English',
    NL: '🇳🇱 Dutch',
    FR: '🇫🇷 French',
    DE: '🇩🇪 German',
    PL: '🇵🇱 Polish',
    SV: '🇸🇪 Swedish',
    DA: '🇩🇰 Danish',
    FI: '🇫🇮 Finnish',
    HU: '🇭🇺 Hungarian',
    NO: '🇳🇴 Norwegian'
};

const EmmaConversations = () => {
    const [leads, setLeads] = useState<EmmaLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterLanguage, setFilterLanguage] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterWebhook, setFilterWebhook] = useState<string>('all');
    const [selectedLead, setSelectedLead] = useState<EmmaLead | null>(null);
    const [retryingWebhook, setRetryingWebhook] = useState<string | null>(null);

    useEffect(() => {
        fetchLeads();
    }, [filterLanguage, filterStatus, filterWebhook]);

    async function fetchLeads() {
        setLoading(true);
        let query = supabase
            .from('emma_leads' as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (filterLanguage !== 'all') {
            query = query.eq('detected_language', filterLanguage);
        }

        if (filterStatus !== 'all') {
            query = query.eq('conversation_status', filterStatus);
        }

        if (filterWebhook === 'sent') {
            query = query.eq('webhook_sent', true);
        } else if (filterWebhook === 'pending') {
            query = query.eq('webhook_sent', false);
        } else if (filterWebhook === 'failed') {
            query = query.eq('webhook_sent', false).gt('webhook_attempts', 0);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching leads:', error);
            toast.error('Failed to fetch leads');
        } else {
            setLeads((data as any) || []);
        }
        setLoading(false);
    }

    const resendWebhook = async (lead: EmmaLead) => {
        setRetryingWebhook(lead.id);
        try {
            const payload = {
                conversation_id: lead.conversation_id,
                contact_info: {
                    first_name: lead.first_name || '',
                    last_name: lead.last_name || '',
                    phone_number: lead.phone_number || '',
                    country_prefix: lead.country_prefix || ''
                },
                content_phase: {
                    question_1: lead.question_1 || '',
                    answer_1: lead.answer_1 || '',
                    question_2: lead.question_2 || '',
                    answer_2: lead.answer_2 || '',
                    question_3: lead.question_3 || '',
                    answer_3: lead.answer_3 || '',
                    questions_answered: lead.questions_answered || 0
                },
                property_criteria: {
                    location_preference: lead.location_preference || [],
                    sea_view_importance: lead.sea_view_importance || '',
                    budget_range: lead.budget_range || '',
                    bedrooms_desired: lead.bedrooms_desired || '',
                    property_type: lead.property_type || [],
                    property_purpose: lead.property_purpose || '',
                    timeframe: lead.timeframe || ''
                },
                system_data: {
                    detected_language: lead.detected_language || 'EN',
                    intake_complete: lead.intake_complete || false,
                    declined_selection: lead.declined_selection || false,
                    conversation_date: lead.conversation_date || new Date().toISOString(),
                    conversation_status: lead.conversation_status || 'unknown',
                    exit_point: lead.exit_point || 'unknown'
                }
            };

            const { error } = await supabase.functions.invoke('send-emma-lead', { body: payload });
            
            if (error) {
                toast.error('Failed to resend webhook');
            } else {
                toast.success('Webhook resent successfully');
                fetchLeads();
            }
        } catch (error) {
            toast.error('Failed to resend webhook');
        } finally {
            setRetryingWebhook(null);
        }
    };

    const getWebhookStatus = (lead: EmmaLead) => {
        if (lead.webhook_sent) {
            return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Sent' };
        }
        if (lead.webhook_attempts >= 5) {
            return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Failed' };
        }
        if (lead.webhook_attempts > 0) {
            return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Retrying' };
        }
        return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Pending' };
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'declined':
                return 'bg-orange-100 text-orange-700';
            case 'abandoned':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="w-8 h-8 text-primary" />
                        Emma Leads
                    </h1>
                    <p className="text-gray-500">Complete lead data with webhook tracking</p>
                </div>

                <div className="flex gap-3 flex-wrap">
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={filterLanguage}
                            onChange={(e) => setFilterLanguage(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer text-sm"
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
                            className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer text-sm"
                        >
                            <option value="all">All Statuses</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                            <option value="abandoned">Abandoned</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={filterWebhook}
                            onChange={(e) => setFilterWebhook(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer text-sm"
                        >
                            <option value="all">All Webhooks</option>
                            <option value="sent">✅ Sent</option>
                            <option value="pending">⏳ Pending</option>
                            <option value="failed">❌ Failed</option>
                        </select>
                    </div>

                    <button
                        onClick={() => fetchLeads()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                {/* List Column */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-gray-50 font-medium text-gray-700 flex justify-between items-center">
                        <span>Leads ({leads.length})</span>
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading leads...</div>
                        ) : leads.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No leads found matching filters.</div>
                        ) : (
                            leads.map((lead) => {
                                const webhookStatus = getWebhookStatus(lead);
                                const WebhookIcon = webhookStatus.icon;
                                return (
                                    <div
                                        key={lead.id}
                                        onClick={() => setSelectedLead(lead)}
                                        className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedLead?.id === lead.id ? 'bg-blue-50 border-l-4 border-primary' : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-gray-900 truncate">
                                                {lead.first_name || lead.last_name 
                                                    ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                                                    : 'Anonymous User'}
                                            </span>
                                            <WebhookIcon className={`w-4 h-4 ${webhookStatus.color}`} />
                                        </div>

                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {languageFlags[lead.detected_language]?.split(' ')[0] || '🌐'} {lead.detected_language}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(lead.conversation_status)}`}>
                                                {lead.conversation_status}
                                            </span>
                                            {lead.intake_complete && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                    ✓ Complete
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            {new Date(lead.created_at).toLocaleDateString()} · Exit: {lead.exit_point}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Detail Column */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
                    {selectedLead ? (
                        <div className="flex flex-col h-full overflow-y-auto">
                            {/* Header */}
                            <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {selectedLead.first_name || selectedLead.last_name 
                                            ? `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim()
                                            : 'Anonymous User'}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        ID: {selectedLead.conversation_id}
                                    </p>
                                </div>

                                {!selectedLead.webhook_sent && (
                                    <button
                                        onClick={() => resendWebhook(selectedLead)}
                                        disabled={retryingWebhook === selectedLead.id}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {retryingWebhook === selectedLead.id ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Resend Webhook
                                    </button>
                                )}
                            </div>

                            {/* Webhook Status */}
                            <div className="p-4 border-b">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-primary" />
                                    Webhook Status
                                </h3>
                                <div className={`flex items-center gap-3 p-3 rounded-lg ${getWebhookStatus(selectedLead).bg}`}>
                                    {React.createElement(getWebhookStatus(selectedLead).icon, { 
                                        className: `w-5 h-5 ${getWebhookStatus(selectedLead).color}` 
                                    })}
                                    <div>
                                        <p className="font-medium">{getWebhookStatus(selectedLead).label}</p>
                                        <p className="text-xs text-gray-500">
                                            Attempts: {selectedLead.webhook_attempts}/5
                                            {selectedLead.webhook_sent_at && ` · Sent: ${new Date(selectedLead.webhook_sent_at).toLocaleString()}`}
                                        </p>
                                        {selectedLead.webhook_last_error && (
                                            <p className="text-xs text-red-500 mt-1">{selectedLead.webhook_last_error}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="p-4 border-b">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary" />
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">First Name</p>
                                        <p className="font-medium">{selectedLead.first_name || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Last Name</p>
                                        <p className="font-medium">{selectedLead.last_name || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Phone Number</p>
                                        <p className="font-medium">
                                            {selectedLead.phone_number ? (
                                                <a 
                                                    href={`https://wa.me/${(selectedLead.country_prefix || '').replace(/\D/g, '')}${selectedLead.phone_number.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-green-600 hover:underline"
                                                >
                                                    {selectedLead.country_prefix}{selectedLead.phone_number}
                                                </a>
                                            ) : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Country Prefix</p>
                                        <p className="font-medium">{selectedLead.country_prefix || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Q&A Section */}
                            <div className="p-4 border-b">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-primary" />
                                    Q&A Phase ({selectedLead.questions_answered || 0} questions)
                                </h3>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((num) => {
                                        const q = selectedLead[`question_${num}` as keyof EmmaLead] as string;
                                        const a = selectedLead[`answer_${num}` as keyof EmmaLead] as string;
                                        if (!q && !a) return null;
                                        return (
                                            <div key={num} className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Question {num}</p>
                                                <p className="text-sm font-medium mb-2">{q || '-'}</p>
                                                <p className="text-xs text-gray-500 mb-1">Answer {num}</p>
                                                <p className="text-sm text-gray-600">{a || '-'}</p>
                                            </div>
                                        );
                                    })}
                                    {!selectedLead.question_1 && !selectedLead.answer_1 && (
                                        <p className="text-gray-400 text-sm">No Q&A data captured</p>
                                    )}
                                </div>
                            </div>

                            {/* Property Criteria */}
                            <div className="p-4 border-b">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    Property Criteria
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Location</p>
                                            <p className="font-medium text-sm">
                                                {selectedLead.location_preference?.join(', ') || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                                        <Eye className="w-4 h-4 text-blue-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Sea View</p>
                                            <p className="font-medium text-sm">{selectedLead.sea_view_importance || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                                        <Wallet className="w-4 h-4 text-amber-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Budget</p>
                                            <p className="font-medium text-sm">{selectedLead.budget_range || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                                        <Bed className="w-4 h-4 text-purple-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Bedrooms</p>
                                            <p className="font-medium text-sm">{selectedLead.bedrooms_desired || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                                        <Home className="w-4 h-4 text-green-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Property Type</p>
                                            <p className="font-medium text-sm">
                                                {selectedLead.property_type?.join(', ') || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                                        <Target className="w-4 h-4 text-indigo-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Purpose</p>
                                            <p className="font-medium text-sm">{selectedLead.property_purpose || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2 col-span-2 md:col-span-1">
                                        <Calendar className="w-4 h-4 text-cyan-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Timeframe</p>
                                            <p className="font-medium text-sm">{selectedLead.timeframe || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* System Data */}
                            <div className="p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4 text-primary" />
                                    System Data
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Language</p>
                                        <p className="font-medium">{languageFlags[selectedLead.detected_language] || selectedLead.detected_language}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Status</p>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(selectedLead.conversation_status)}`}>
                                            {selectedLead.conversation_status}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Exit Point</p>
                                        <p className="font-medium">{selectedLead.exit_point}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Intake Complete</p>
                                        <p className="font-medium">{selectedLead.intake_complete ? '✅ Yes' : '❌ No'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Declined Selection</p>
                                        <p className="font-medium">{selectedLead.declined_selection ? '✅ Yes' : '❌ No'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Conversation Date</p>
                                        <p className="font-medium text-sm">{new Date(selectedLead.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Select a lead to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmmaConversations;
