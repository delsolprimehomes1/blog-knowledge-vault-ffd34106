import React, { useState, useRef, useEffect } from 'react';
import { VolumeX } from 'lucide-react';

interface AutoplayVideoProps {
    language: string;
}

// Language-specific video URLs
const VIDEO_URLS: Record<string, string> = {
    en: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    nl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234cc447f3d.mp4',
    fr: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecfbf80b2a06663d73352.mp4',
    de: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f3561606f2e54e89b.mp4',
    fi: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9fd461d43a1ff58bc6.mp4',
    pl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecfbf80b2a06663d73352.mp4',
    da: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f48dcc6a1179efefe.mp4',
    hu: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f80b2a0fa20d72ee8.mp4',
    sv: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecfbf49ed62b6ae44840f.mp4',
    no: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9fc98330759f310a78.mp4'
};

const AutoplayVideo: React.FC<AutoplayVideoProps> = ({ language }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
    const [isUnmuted, setIsUnmuted] = useState(false);

    // Fallback to English if specific language video is missing (though we have URLs for all now)
    const videoUrl = VIDEO_URLS[language] || VIDEO_URLS.en;

    useEffect(() => {
        // Show unmute prompt after 2 seconds
        const timer = setTimeout(() => {
            if (!isUnmuted) {
                setShowUnmutePrompt(true);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [isUnmuted]);

    const handleUnmuteClick = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.muted = false;
            videoRef.current.play();
            setIsUnmuted(true);
            setShowUnmutePrompt(false);
        }
    };

    return (
        <section className="py-32 bg-white">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <p className="text-landing-gold font-semibold mb-4 tracking-wider uppercase text-sm">
                        See Our Approach
                    </p>
                    <h2 className="text-4xl lg:text-5xl font-serif font-bold text-landing-navy">
                        How We Curate Your{' '}
                        <span className="text-landing-gold">Perfect Property</span>
                    </h2>
                </div>

                {/* Video Container */}
                <div className="max-w-6xl mx-auto">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-100">
                        {/* Video */}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            loop={!isUnmuted}
                            playsInline
                            className="w-full aspect-video object-cover"
                        >
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>

                        {/* Premium Unmute Overlay */}
                        {showUnmutePrompt && !isUnmuted && (
                            <div
                                className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer animate-fade-in"
                                onClick={handleUnmuteClick}
                            >
                                {/* Backdrop Blur */}
                                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

                                {/* Unmute Card - PREMIUM DESIGN */}
                                <div className="relative group">
                                    <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/30 shadow-[0_25px_50px_rgba(0,0,0,0.25)] px-12 py-8 hover:scale-103 hover:border-landing-gold hover:border-2 hover:shadow-[0_30px_60px_rgba(196,160,83,0.4)] transition-all duration-400 ease-out">

                                        {/* Decorative Dots */}
                                        <div className="absolute top-4 right-4 flex gap-1">
                                            <div className="w-1 h-1 bg-landing-gold rounded-full animate-pulse" />
                                            <div className="w-1 h-1 bg-landing-gold rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-1 h-1 bg-landing-gold rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                        </div>

                                        {/* Icon Container */}
                                        <div className="flex justify-center mb-6">
                                            <div className="relative w-20 h-20 bg-gradient-to-br from-landing-navy to-[#2C3E50] rounded-full border-3 border-landing-gold shadow-[0_8px_24px_rgba(196,160,83,0.3)] flex items-center justify-center animate-float">
                                                <VolumeX size={36} className="text-white" />

                                                {/* Pulse Ring */}
                                                <div className="absolute inset-0 rounded-full border-2 border-landing-gold animate-ping opacity-75" />
                                            </div>
                                        </div>

                                        {/* Primary Text */}
                                        <h3 className="text-center text-3xl font-serif font-bold text-landing-navy mb-2 tracking-wide">
                                            Click to Experience
                                        </h3>

                                        {/* Secondary Text */}
                                        <p className="text-center text-base text-landing-navy/70 mb-4">
                                            Unmute for full experience
                                        </p>

                                        {/* Subtle Instruction */}
                                        <p className="text-center text-xs text-landing-gold animate-pulse-subtle">
                                            ↓ Tap anywhere on this card
                                        </p>

                                        {/* Inner Glow Effect */}
                                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-landing-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AutoplayVideo;
