import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface HeroProps {
    language: string;
    onStartChat: () => void;
    // Make translations optional to support both standard usage and usage where it might be undefined
    translations?: any;
}

// Language-specific hero video URLs
const HERO_VIDEO_URLS: Record<string, string> = {
    // Using the English explainer video as a temporary working placeholder for all languages 
    // until specific hero videos are provided. This ensures the functionality can be tested.
    en: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    nl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    fr: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    de: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    fi: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    pl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    da: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    hu: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    sv: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    no: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4'
};

const Hero: React.FC<HeroProps> = ({ language, onStartChat, translations }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
    const [isUnmuted, setIsUnmuted] = useState(false);

    // Get video URL for current language, fallback to English
    const videoUrl = HERO_VIDEO_URLS[language] || HERO_VIDEO_URLS.en;

    useEffect(() => {
        // Show unmute prompt after 2.5 seconds
        const timer = setTimeout(() => {
            if (!isUnmuted) {
                setShowUnmutePrompt(true);
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, [isUnmuted]);

    const handleUnmuteClick = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0; // Restart from beginning
            videoRef.current.muted = false; // Unmute
            videoRef.current.play(); // Play with sound
            setIsUnmuted(true);
            setShowUnmutePrompt(false); // Hide overlay permanently
        }
    };

    // Safe access to translations
    const t = translations?.hero || {};

    return (
        <section className="relative h-[90vh] overflow-hidden bg-landing-navy">
            {/* Background Video */}
            <video
                ref={videoRef}
                autoPlay
                muted
                loop={!isUnmuted} // Stop looping after unmuted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

            {/* Unmute Prompt Overlay */}
            {showUnmutePrompt && !isUnmuted && (
                <div
                    className="absolute inset-0 flex items-center justify-center z-20 animate-fade-in cursor-pointer"
                    onClick={handleUnmuteClick}
                >
                    <button
                        className="group relative bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl px-8 py-6 hover:bg-white/90 hover:scale-105 hover:border-landing-gold transition-all duration-300 animate-pulse-subtle"
                        aria-label="Unmute video"
                    >
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-2">
                            <div className="relative w-12 h-12 bg-landing-navy rounded-full flex items-center justify-center group-hover:bg-landing-gold transition-colors">
                                <VolumeX size={24} className="text-white" />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="text-center">
                            <p className="text-landing-navy font-bold text-lg mb-1">
                                {t.unmutePrompt?.title || "Click to Unmute"}
                            </p>
                            <p className="text-landing-navy/70 text-sm">
                                {t.unmutePrompt?.subtitle || "Experience with sound"}
                            </p>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-landing-gold rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-landing-gold rounded-full" />
                    </button>
                </div>
            )}

            {/* Hero Content (Text, CTA) */}
            <div className="relative z-10 h-full flex items-center text-center md:text-left">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-4xl md:max-w-3xl mx-auto md:mx-0">
                        {/* Small Badge */}
                        <div className="inline-block mb-6 px-4 py-2 bg-landing-gold/20 backdrop-blur-md rounded-full border border-landing-gold/30">
                            <span className="text-landing-gold font-semibold text-sm tracking-wide">
                                🏆 {t.badge || "Costa del Sol's Premier Real Estate"}
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight mb-6 drop-shadow-lg">
                            {t.headline || "Discover Your Costa del Sol Investment"}
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed font-light">
                            {t.subheadline || "Curated luxury properties for discerning international investors"}
                        </p>

                        {/* CTA Button */}
                        <button
                            onClick={onStartChat}
                            className="px-8 py-4 bg-white text-landing-navy rounded-xl font-bold text-lg hover:bg-landing-gold hover:text-white transition-all duration-300 shadow-2xl hover:shadow-landing-gold/50 hover:-translate-y-1"
                        >
                            {t.cta || "Begin Your Private Property Search"}
                        </button>

                        {/* Trust Indicators */}
                        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 sm:gap-8 text-white/80">
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
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-white/60 animate-bounce">
                    <span className="text-sm uppercase tracking-wider font-light">Scroll</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </section>
    );
};

export default Hero;
