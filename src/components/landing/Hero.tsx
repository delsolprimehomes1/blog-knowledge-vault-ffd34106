import React from 'react';
import { ArrowDown } from 'lucide-react';

interface HeroProps {
    onStartChat: () => void;
    // Translations are passed but might not be used if we hardcode for design fidelity or use them selectively
    translations?: any;
}

const Hero: React.FC<HeroProps> = ({ onStartChat, translations }) => {
    // Safe access to translations
    const t = translations?.hero || {};

    return (
        <section className="relative h-[90vh] min-h-[700px] flex items-center justify-center overflow-hidden">
            {/* Background Image - Beautiful Costa del Sol Property */}
            <div
                className="absolute inset-0 bg-cover bg-center animate-ken-burns"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2000&q=90')"
                }}
            />

            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-landing-navy/40 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />

            {/* Hero Content */}
            <div className="container mx-auto px-4 relative z-10 text-center text-white">
                <div className="max-w-4xl mx-auto opacity-0 animate-hero-title-reveal" style={{ animationDelay: '0.2s' }}>
                    {/* Small Badge */}
                    <div className="inline-block mb-6 px-4 py-2 bg-landing-gold/20 backdrop-blur-md rounded-full border border-landing-gold/30">
                        <span className="text-landing-gold font-semibold text-sm tracking-wide">
                            🏆 {t.badge || "Costa del Sol's Premier Real Estate"}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-[64px] font-serif font-bold leading-tight mb-6 drop-shadow-lg">
                        {t.headline || "Discover Your Costa del Sol Investment"}
                    </h1>
                </div>

                <div className="max-w-2xl mx-auto opacity-0 animate-hero-title-reveal" style={{ animationDelay: '0.4s' }}>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-light mb-12 leading-relaxed">
                        {t.subheadline || "Curated luxury properties for discerning international investors"}
                    </p>

                    <button
                        onClick={onStartChat}
                        className="group relative inline-flex items-center justify-center px-10 py-5 bg-white text-landing-navy text-lg font-bold tracking-wide rounded-sm hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)]"
                    >
                        <span>{t.cta || "Begin Your Private Property Search"}</span>
                        <div className="absolute inset-0 border border-white/50 scale-105 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 rounded-sm" />
                    </button>

                    {/* Trust Indicators */}
                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/80">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-landing-gold rounded-full animate-pulse" />
                            <span className="text-sm font-medium">{t.trustIndicators?.experience || "15+ Years Experience"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-landing-gold rounded-full animate-pulse" />
                            <span className="text-sm font-medium">{t.trustIndicators?.propertiesSold || "€500M+ Properties Sold"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/70 animate-bounce-subtle pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] font-light">Scroll</span>
                    <ArrowDown size={20} className="opacity-70" />
                </div>
            </div>
        </section>
    );
};

export default Hero;
