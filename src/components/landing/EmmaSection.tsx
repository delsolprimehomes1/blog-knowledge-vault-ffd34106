import React from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';

interface EmmaSectionProps {
    onStartChat: () => void;
    // Optional translations passed from parent, type as any to avoid strict interface coupling during dev
    translations?: any;
}

const EmmaSection: React.FC<EmmaSectionProps> = ({ onStartChat, translations }) => {
    // Safe fallback if translations are missing
    const t = translations || {};

    return (
        <section id="emma-section" className="py-24 bg-gradient-to-br from-white to-gray-50 overflow-hidden relative">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-landing-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-landing-navy/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto">
                    {/* Premium Card Container */}
                    <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 backdrop-blur-sm relative group">

                        {/* Subtle Border Glow on Hover */}
                        <div className="absolute inset-0 rounded-[2rem] border-2 border-landing-gold/0 group-hover:border-landing-gold/20 transition-all duration-700 pointer-events-none" />

                        <div className="px-8 py-16 md:px-16 md:py-20 text-center">

                            {/* Icon/Avatar */}
                            <div className="mb-8 inline-flex items-center justify-center relative">
                                <div className="w-20 h-20 bg-landing-navy rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-500">
                                    <MessageCircle size={40} className="text-landing-gold" />
                                </div>
                                {/* Pulse Effect */}
                                <div className="absolute inset-0 rounded-full border border-landing-navy/20 animate-ping opacity-20" />
                            </div>

                            {/* Headline */}
                            <h2 className="text-3xl md:text-5xl font-serif font-bold text-landing-navy mb-6 leading-tight">
                                {t.statement || "Start with clarity, not listings."}
                            </h2>

                            {/* Explanation */}
                            <p className="text-lg md:text-xl text-landing-text-primary/80 mb-12 max-w-2xl mx-auto leading-relaxed">
                                {t.explanation || "Emma guides you through questions about lifestyle, legal steps, documents, and the buying process — before any projects are discussed."}
                            </p>

                            {/* CTA Button */}
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onClick={onStartChat}
                                    className="group relative inline-flex items-center justify-center px-10 py-5 bg-landing-navy text-white text-lg font-bold rounded-xl hover:bg-landing-gold transition-colors duration-300 shadow-xl hover:shadow-landing-gold/30 hover:-translate-y-1"
                                >
                                    <span>{t.cta || "Get clarity with Emma"}</span>
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* Microcopy */}
                                <span className="text-sm font-medium text-landing-text-secondary opacity-70">
                                    {t.microcopy || "Private · Pressure-free"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EmmaSection;
