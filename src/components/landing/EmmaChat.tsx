import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, ListChecks, Home, MoreHorizontal, X } from 'lucide-react';
import { LanguageCode } from '@/utils/landing/languageDetection';
import { trackEvent } from '@/utils/landing/analytics';

interface EmmaChatProps {
    content: any;
    language: LanguageCode;
    isOpen: boolean;
    onClose: () => void;
}

const EmmaChat: React.FC<EmmaChatProps> = ({ content, language, isOpen, onClose }) => {
    const [message, setMessage] = useState('');

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSend = () => {
        if (!message.trim()) return;

        trackEvent('chat_interaction', {
            category: 'Engagement',
            action: 'send_message',
            label: message,
            language
        });

        // Open lead form as fallback/next step
        const event = new CustomEvent('openLeadForm', { detail: { interest: 'chat', message } });
        window.dispatchEvent(event);
        setMessage('');
        onClose(); // Optional: close chat modal after sending? Or keep open? "Start with Emma" usually implies starting a flow. Let's keep it open or close it? The lead form opens on top. Better to close this one or let the lead form take over.
        // User pattern: Click send -> Lead Form (capture details) -> Success.
        // Lead capture form is another modal. Having two modals might be messy.
        // The previous logic opened lead form. Let's stick to that pattern.
        // Probably best to close this chat modal when the lead form opens to avoid double backdrop.
        onClose();
    };

    const handleQuickAction = (action: string) => {
        trackEvent('chat_interaction', {
            category: 'Engagement',
            action: 'quick_action',
            label: action,
            language
        });

        const event = new CustomEvent('openLeadForm', { detail: { interest: action } });
        window.dispatchEvent(event);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-[500px] bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in-up transform transition-all duration-300 scale-100">

                {/* Chat Header */}
                <div className="bg-[#FAF9F6] p-4 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img
                                src="/images/emma-profile.png"
                                alt="Emma"
                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-[#1A2332]">Emma</h4>
                            <p className="text-xs text-green-600 font-medium">{content.status || "Online now"}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                        <X className="w-6 h-6 cursor-pointer hover:text-gray-600 transition-colors" onClick={onClose} />
                    </div>
                </div>

                {/* Chat Body */}
                <div className="p-6 bg-[#ffffff] space-y-6">
                    {/* Emma 'Message' */}
                    <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-[90%]">
                        <p className="text-[#2C3E50] text-sm md:text-base leading-relaxed">
                            {content.greeting}
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2.5">
                        <button
                            className="w-full text-left px-4 py-3 bg-white hover:bg-gray-50 border border-gray-100 hover:border-[#C4A053]/30 rounded-lg text-[#2C3E50] text-sm font-medium transition-all flex items-center gap-3 shadow-sm hover:shadow-md group"
                            onClick={() => handleQuickAction('question')}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#f8f5ee] flex items-center justify-center group-hover:bg-[#C4A053] transition-colors">
                                <MessageCircle className="w-4 h-4 text-[#C4A053] group-hover:text-white transition-colors" />
                            </div>
                            <span>{content.quickActions.question}</span>
                        </button>
                        <button
                            className="w-full text-left px-4 py-3 bg-white hover:bg-gray-50 border border-gray-100 hover:border-[#C4A053]/30 rounded-lg text-[#2C3E50] text-sm font-medium transition-all flex items-center gap-3 shadow-sm hover:shadow-md group"
                            onClick={() => handleQuickAction('criteria')}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#f8f5ee] flex items-center justify-center group-hover:bg-[#C4A053] transition-colors">
                                <ListChecks className="w-4 h-4 text-[#C4A053] group-hover:text-white transition-colors" />
                            </div>
                            <span>{content.quickActions.criteria}</span>
                        </button>
                        <button
                            className="w-full text-left px-4 py-3 bg-white hover:bg-gray-50 border border-gray-100 hover:border-[#C4A053]/30 rounded-lg text-[#2C3E50] text-sm font-medium transition-all flex items-center gap-3 shadow-sm hover:shadow-md group"
                            onClick={() => handleQuickAction('explore')}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#f8f5ee] flex items-center justify-center group-hover:bg-[#C4A053] transition-colors">
                                <Home className="w-4 h-4 text-[#C4A053] group-hover:text-white transition-colors" />
                            </div>
                            <span>{content.quickActions.explore}</span>
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={content.placeholder}
                            className="flex-1 border-gray-200 focus-visible:ring-[#C4A053] bg-gray-50 text-base"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            autoFocus={isOpen}
                        />
                        <Button
                            size="icon"
                            className="bg-[#C4A053] hover:bg-[#B39043] rounded-full w-10 h-10 shadow-md transition-transform active:scale-95"
                            onClick={handleSend}
                        >
                            <Send className="w-4 h-4 text-white" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmmaChat;
