import React from 'react';
import { Play } from 'lucide-react';

interface HeroProps {
    onStartChat: () => void; // Kept for interface compatibility but we use internal scrolling
    translations?: any;
}

const Hero: React.FC<HeroProps> = ({ onStartChat, translations }) => {
    // Safe access to translations
    const t = translations?.hero || {};

    const scrollToVideo = () => {
        const videoSection = document.getElementById('video-section');
        if (videoSection) {
            videoSection.scrollIntoView({ behavior: 'smooth' });
            // Optional: Trigger video play if possible, but AutoplayVideo handles click-to-play now
            // We can dispatch a custom event if needed, but let's stick to scroll first
            const event = new CustomEvent('playHeroVideo');
            window.dispatchEvent(event);
        }
    };

    const scrollToEmma = () => {
        const emmaSection = document.getElementById('emma-section');
        if (emmaSection) {
            emmaSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Fallback if section not found (e.g. during dev transitions)
            onStartChat();
        }
    };

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
            <div className="absolute inset-0 bg-landing-navy/50 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" />

            {/* Hero Content - Left Aligned for Clarity Focus */}
            <div className="container mx-auto px-4 relative z-10 text-white">
                <div className="max-w-4xl opacity-0 animate-hero-title-reveal" style={{ animationDelay: '0.2s' }}>

                    {/* H1 Headline */}
                    <h1 className="text-4xl md:text-6xl lg:text-[64px] font-serif font-bold leading-tight mb-6 drop-shadow-xl text-center md:text-left">
                        {t.headline || "Get clarity first — before you look at property."}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-2xl text-white/95 font-light mb-10 leading-relaxed max-w-2xl text-center md:text-left drop-shadow-md">
                        {t.subheadline || "Independent, pressure-free guidance for new-build property on the Costa del Sol."}
                    </p>

                    <div className="flex flex-col items-center md:items-start gap-6">
                        {/* Primary CTA Button - Links to Video */}
                        <button
                            onClick={scrollToVideo}
                            className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-landing-navy text-lg font-bold tracking-wide rounded-sm hover:bg-landing-gold hover:text-white transition-all duration-300 shadow-xl"
                        >
                            <Play className="w-5 h-5 mr-3 fill-current" />
                            <span>{t.primaryCTA || "Watch the 60-second introduction"}</span>
                        </button>

                        {/* Microcopy */}
                        <span className="text-sm text-white/80 font-medium tracking-wide">
                            {t.microcopy || "No pressure · No obligation"}
                        </span>

                        {/* Secondary CTA - Text Link to Emma */}
                        <button
                            onClick={scrollToEmma}
                            className="text-landing-gold hover:text-white text-base font-semibold transition-colors border-b border-landing-gold hover:border-white pb-0.5"
                        >
                            {t.secondaryCTA || "Or start with clear answers"} →
                        </button>
                    </div>
                </div>
            </div>

            {/* Subtle Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-60">
                <div className="w-0.5 h-16 bg-gradient-to-b from-transparent via-white to-transparent" />
            </div>
        </section>
    );
};

export default Hero;
