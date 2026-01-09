import React from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface EmmaSectionProps {
    onStartChat: () => void;
    translations?: any;
}

const EmmaSection: React.FC<EmmaSectionProps> = ({ onStartChat, translations }) => {
    const t = translations || {};
    const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.15 });

    return (
        <section id="emma-section" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-br from-white to-gray-50 overflow-hidden relative">
            {/* Decorative Background Elements - Smaller on mobile */}
            <div className="absolute top-0 right-0 w-48 sm:w-64 md:w-96 h-48 sm:h-64 md:h-96 bg-landing-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-landing-navy/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div 
                    ref={elementRef as React.RefObject<HTMLDivElement>}
                    className={`max-w-4xl mx-auto transition-all duration-700 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98]'
                    }`}
                >
                    {/* Premium Card Container - Mobile optimized padding */}
                    <div className="bg-white rounded-2xl sm:rounded-[1.5rem] lg:rounded-[2rem] shadow-xl sm:shadow-2xl overflow-hidden border border-white/50 backdrop-blur-sm relative group">

                        {/* Subtle Border Glow on Hover */}
                        <div className="absolute inset-0 rounded-2xl sm:rounded-[1.5rem] lg:rounded-[2rem] border-2 border-landing-gold/0 group-hover:border-landing-gold/20 transition-all duration-700 pointer-events-none" />

                        <div className="px-5 py-10 sm:px-8 sm:py-14 md:px-12 md:py-16 lg:px-16 lg:py-20 text-center">

                            {/* Icon - Smaller on mobile */}
                            <div className="mb-5 sm:mb-6 md:mb-8 inline-flex items-center justify-center relative">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-landing-navy rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-500">
                                    <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-landing-gold" />
                                </div>
                                <div className="absolute inset-0 rounded-full border border-landing-navy/20 animate-ping opacity-20" />
                            </div>

                            {/* Headline - Mobile responsive */}
                            <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-serif font-bold text-landing-navy mb-4 sm:mb-5 md:mb-6 leading-tight">
                                {t.statement || "Start with clarity, not listings."}
                            </h2>

                            {/* Explanation - Mobile responsive */}
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-landing-text-primary/80 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
                                {t.explanation || "Emma guides you through questions about lifestyle, legal steps, documents, and the buying process — before any projects are discussed."}
                            </p>

                            {/* CTA Button - Full width on mobile */}
                            <div className="flex flex-col items-center gap-3 sm:gap-4">
                                <button
                                    onClick={onStartChat}
                                    className="group relative inline-flex items-center justify-center w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-5 bg-landing-navy text-white text-sm sm:text-base md:text-lg font-bold rounded-lg sm:rounded-xl hover:bg-landing-gold transition-colors duration-300 shadow-xl hover:shadow-landing-gold/30 hover:-translate-y-1"
                                >
                                    <span>{t.cta || "Get clarity with Emma"}</span>
                                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <span className="text-xs sm:text-sm font-medium text-landing-text-secondary opacity-70">
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
