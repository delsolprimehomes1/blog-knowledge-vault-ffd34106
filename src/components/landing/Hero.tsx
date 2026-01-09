import React from 'react';
import { Play } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface HeroProps {
    onStartChat: () => void;
    translations?: any;
}

const Hero: React.FC<HeroProps> = ({ onStartChat, translations }) => {
    const t = translations?.hero || {};

    const scrollToVideo = () => {
        const videoSection = document.getElementById('video-section');
        if (videoSection) {
            videoSection.scrollIntoView({ behavior: 'smooth' });
            const event = new CustomEvent('playHeroVideo');
            window.dispatchEvent(event);
        }
    };

    const scrollToEmma = () => {
        const emmaSection = document.getElementById('emma-section');
        if (emmaSection) {
            emmaSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            onStartChat();
        }
    };

    return (
        <section className="relative min-h-[100svh] pt-14 sm:pt-16 lg:pt-20 flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center animate-ken-burns"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2000&q=90')"
                }}
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-landing-navy/50 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" />

            {/* Hero Content */}
            <div className="container mx-auto px-5 sm:px-6 relative z-10 text-white py-8 sm:py-12">
                <div className="max-w-4xl opacity-0 animate-hero-title-reveal mx-auto lg:mx-0" style={{ animationDelay: '0.2s' }}>

                    {/* H1 Headline - Mobile optimized */}
                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-[64px] font-serif font-bold leading-tight mb-4 sm:mb-6 drop-shadow-xl text-center lg:text-left">
                        {t.headline || "Get clarity first — before you look at property."}
                    </h1>

                    {/* Subheadline - Mobile optimized */}
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 font-light mb-8 sm:mb-10 leading-relaxed max-w-2xl text-center lg:text-left drop-shadow-md mx-auto lg:mx-0">
                        {t.subheadline || "Independent, pressure-free guidance for new-build property on the Costa del Sol."}
                    </p>

                    <div className="flex flex-col items-center lg:items-start gap-4 sm:gap-6">
                        {/* Primary CTA Button - Mobile responsive */}
                        <button
                            onClick={scrollToVideo}
                            className="group relative inline-flex items-center justify-center px-5 py-3 sm:px-8 sm:py-4 bg-white text-landing-navy text-sm sm:text-base lg:text-lg font-bold tracking-wide rounded-sm hover:bg-landing-gold hover:text-white transition-all duration-300 shadow-xl w-full sm:w-auto"
                        >
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 fill-current" />
                            <span className="hidden sm:inline">{t.primaryCTA || "Watch the 60-second introduction"}</span>
                            <span className="sm:hidden">{t.primaryCTAShort || "Watch 60s Intro"}</span>
                        </button>

                        {/* Microcopy */}
                        <span className="text-xs sm:text-sm text-white/80 font-medium tracking-wide">
                            {t.microcopy || "No pressure · No obligation"}
                        </span>

                        {/* Secondary CTA */}
                        <button
                            onClick={scrollToEmma}
                            className="text-landing-gold hover:text-white text-sm sm:text-base font-semibold transition-colors border-b border-landing-gold hover:border-white pb-0.5"
                        >
                            {t.secondaryCTA || "Or start with clear answers"} →
                        </button>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator - Hidden on very small screens */}
            <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-60 hidden sm:block">
                <div className="w-0.5 h-12 sm:h-16 bg-gradient-to-b from-transparent via-white to-transparent" />
            </div>
        </section>
    );
};

export default Hero;
