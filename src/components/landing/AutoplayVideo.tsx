import React, { useState, useRef, useEffect } from 'react';
import { VolumeX, Check } from 'lucide-react';

interface AutoplayVideoProps {
    language: string;
    translations?: any;
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

const AutoplayVideo: React.FC<AutoplayVideoProps> = ({ language, translations }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const t = translations?.video || {};

    // Safe defaults for bullets
    const bullets = t.bullets || [
        "Emma answers questions first",
        "Human experts review everything",
        "You decide if and how to continue"
    ];

    // Video URL
    const videoUrl = VIDEO_URLS[language] || VIDEO_URLS.en;

    // Listen for play event from Hero
    useEffect(() => {
        const handlePlayVideo = () => {
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.muted = false; // Ensure sound is on
                // Promise handling for play
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Auto-play prevented:", error);
                    });
                }
            }
        };

        window.addEventListener('playHeroVideo', handlePlayVideo);
        return () => window.removeEventListener('playHeroVideo', handlePlayVideo);
    }, []);

    return (
        <section id="video-section" className="py-20 md:py-32 bg-white">
            <div className="container mx-auto px-4">
                {/* Soft Line Header */}
                <div className="text-center mb-12 max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-serif text-landing-navy leading-tight">
                        {t.softLine || "In one minute, you'll understand how we guide decisions — calmly and independently."}
                    </h2>
                </div>

                {/* Video Container */}
                <div className="max-w-5xl mx-auto mb-12">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-100 aspect-video">
                        <video
                            ref={videoRef}
                            playsInline
                            controls // Enable controls so user can manage playback
                            className="w-full h-full object-cover"
                            poster="https://images.unsplash.com/photo-1600607686527-6fb886090705?w=1600&q=80" // Generic poster if needed
                        >
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>

                {/* Micro-bullets and Reassurance */}
                <div className="flex flex-col items-center">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-12 mb-8">
                        {bullets.map((bullet: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 text-landing-navy/80 text-lg">
                                <div className="w-6 h-6 rounded-full bg-landing-gold/20 flex items-center justify-center shrink-0">
                                    <Check size={14} className="text-landing-gold" strokeWidth={3} />
                                </div>
                                <span>{bullet}</span>
                            </div>
                        ))}
                    </div>

                    <p className="text-landing-navy/60 italic text-sm">
                        {t.reassurance || "You remain in control at every step."}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AutoplayVideo;
