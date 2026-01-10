import React, { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import videoThumbnail from '@/assets/video-thumbnail.jpg';

interface AutoplayVideoProps {
    language: string;
    translations?: any;
}

const VIDEO_URLS: Record<string, string> = {
    en: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234a3447f3c.mp4',
    nl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f49ed6234cc447f3d.mp4',
    fr: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695ecf9f80b2a00fb8d72ee9.mp4',
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
    const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
    const t = translations?.video || {};

    const bullets = t.bullets || [
        "Emma answers questions first",
        "Human experts review everything",
        "You decide if and how to continue"
    ];

    const videoUrl = VIDEO_URLS[language] || VIDEO_URLS.en;

    useEffect(() => {
        const handlePlayVideo = () => {
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.muted = false;
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
        <section id="video-section" className="py-12 sm:py-16 md:py-24 lg:py-32 bg-white">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Header with scroll animation */}
                <div 
                    ref={elementRef as React.RefObject<HTMLDivElement>}
                    className={`text-center mb-8 sm:mb-12 max-w-3xl mx-auto transition-all duration-700 ease-out ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                >
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif text-landing-navy leading-tight px-2">
                        {t.softLine || "In one minute, you'll understand how we guide decisions — calmly and independently."}
                    </h2>
                </div>

                {/* Video Container */}
                <div className={`max-w-5xl mx-auto mb-8 sm:mb-12 transition-all duration-700 delay-100 ease-out ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}>
                    <div className="relative rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl bg-gray-100 aspect-video">
                        <video
                            ref={videoRef}
                            playsInline
                            controls
                            className="w-full h-full object-cover"
                            poster={videoThumbnail}
                        >
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>

                {/* Bullets - Stack on mobile */}
                <div className={`flex flex-col items-center transition-all duration-700 delay-200 ease-out ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}>
                    <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:gap-8 lg:gap-12 mb-6 sm:mb-8">
                        {bullets.map((bullet: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 sm:gap-3 text-landing-navy/80 text-sm sm:text-base lg:text-lg">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-landing-gold/20 flex items-center justify-center shrink-0">
                                    <Check size={12} className="text-landing-gold sm:w-[14px] sm:h-[14px]" strokeWidth={3} />
                                </div>
                                <span>{bullet}</span>
                            </div>
                        ))}
                    </div>

                    <p className="text-landing-navy/60 italic text-xs sm:text-sm text-center px-4">
                        {t.reassurance || "You remain in control at every step."}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AutoplayVideo;
