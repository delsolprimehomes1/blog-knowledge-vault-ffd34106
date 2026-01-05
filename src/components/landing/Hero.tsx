import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import VideoModal from './VideoModal';
import { Play, VolumeX } from 'lucide-react';
import { LanguageCode } from '@/utils/landing/languageDetection';

interface HeroProps {
    content: {
        headline: string;
        subheadline: string;
        videoCTA: string;
        emmaCTA: string;
    };
    language: LanguageCode;
    onStartChat?: () => void;
}

const Hero: React.FC<HeroProps> = ({ content, language, onStartChat }) => {
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [isPreviewMuted, setIsPreviewMuted] = useState(true);
    const previewVideoRef = useRef<HTMLVideoElement>(null);

    const isEnglish = language === 'en';

    // Autoplay preview video on component mount (only for English)
    useEffect(() => {
        if (isEnglish && previewVideoRef.current) {
            previewVideoRef.current.play().catch(err => {
                console.log('Autoplay prevented:', err);
            });
        }
    }, [isEnglish]);

    const handlePreviewClick = () => {
        if (isEnglish) {
            if (isPreviewMuted) {
                // User wants to unmute preview
                if (previewVideoRef.current) {
                    previewVideoRef.current.currentTime = 0;
                    previewVideoRef.current.muted = false;
                    setIsPreviewMuted(false);
                }
            } else {
                // Open full modal
                setIsVideoOpen(true);
            }
        } else {
            setIsVideoOpen(true);
        }
    };

    return (
        <div className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <picture>
                    <img
                        src="/images/hero-1920.png"
                        alt="Luxury Costa del Sol Property"
                        className="w-full h-full object-cover"
                    />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 container mx-auto px-4 pt-20 flex flex-col items-center justify-center min-h-screen text-center space-y-8">

                {/* Text Content */}
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-white font-light tracking-wide leading-tight drop-shadow-md">
                        {content.headline}
                    </h1>
                    <p className="text-lg md:text-xl text-white/95 font-light max-w-2xl mx-auto drop-shadow-sm">
                        {content.subheadline}
                    </p>
                </div>

                {/* Buttons Container */}
                <div className="flex flex-col items-center space-y-4 animate-fade-in-up delay-100 w-full max-w-md">
                    <Button
                        onClick={() => setIsVideoOpen(true)}
                        className="w-full sm:w-auto bg-[#C4A053] hover:bg-[#B39043] text-white px-8 py-6 text-lg rounded-sm uppercase tracking-wider font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                        {content.videoCTA}
                    </Button>

                    <Button
                        onClick={onStartChat}
                        className="w-full sm:w-auto bg-[#2C5282] hover:bg-[#1A365D] text-white px-10 py-6 text-lg rounded-sm shadow-xl font-medium uppercase tracking-wide hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                        {content.emmaCTA}
                    </Button>
                </div>

                {/* Video Preview Container */}
                <div
                    className="relative w-full max-w-[600px] aspect-video bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden border border-white/20 shadow-2xl cursor-pointer group animate-fade-in-up delay-200 mt-8 mb-8"
                    onClick={handlePreviewClick}
                >
                    {isEnglish ? (
                        <>
                            <video
                                ref={previewVideoRef}
                                className="w-full h-full object-cover"
                                muted={isPreviewMuted}
                                loop
                                playsInline
                                autoPlay
                            >
                                <source
                                    src="https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695c3fa76aaf16223bba7094.mp4"
                                    type="video/mp4"
                                />
                            </video>
                            {/* Overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                            {/* Mute Indicator - Elegant bottom-right badge */}
                            {isPreviewMuted && (
                                <div className="absolute bottom-4 right-4 bg-gradient-to-r from-[#C9A961]/90 to-[#C9A961]/70 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 hover:scale-105 transition-transform duration-300 shadow-lg">
                                    <VolumeX className="w-4 h-4 text-white" />
                                    <span className="text-white text-xs font-medium tracking-wide">
                                        Click to unmute
                                    </span>
                                </div>
                            )}

                            {/* Play icon overlay when muted */}
                            {isPreviewMuted && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform duration-300">
                                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Placeholder image for video preview (Non-English) */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />

                            {/* Play Button Interface */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform duration-300">
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Video UI Chrome elements - Common */}
                    {!isEnglish && (
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white text-xs font-medium tracking-wider">
                            <div className="flex items-center gap-2">
                                <Play className="w-3 h-3 fill-white" />
                                <span>0:00 / 2:15</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <VideoModal
                isOpen={isVideoOpen}
                onClose={() => setIsVideoOpen(false)}
                videoUrl={isEnglish ? "https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/695c3fa76aaf16223bba7094.mp4" : undefined}
            />
        </div>
    );
};

export default Hero;
