import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import VideoModal from './VideoModal';
import { Play } from 'lucide-react';
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

const Hero: React.FC<HeroProps> = ({ content, onStartChat }) => {
    const [isVideoOpen, setIsVideoOpen] = useState(false);

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
            <div className="relative z-10 container mx-auto px-4 pt-32 pb-12 flex flex-col items-center justify-center min-h-screen text-center space-y-8">

                {/* Text Content */}
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-white font-light tracking-wide leading-tight drop-shadow-md">
                        {content.headline}
                    </h1>
                    <p className="text-lg md:text-xl text-white/95 font-light max-w-2xl mx-auto drop-shadow-sm">
                        {content.subheadline}
                    </p>
                </div>

                {/* Watch Intro Button */}
                <div className="animate-fade-in-up delay-100">
                    <Button
                        onClick={() => setIsVideoOpen(true)}
                        className="bg-[#C4A053] hover:bg-[#B39043] text-white px-8 py-6 text-lg rounded-sm uppercase tracking-wider font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                        {content.videoCTA}
                    </Button>
                </div>

                {/* Video Preview Container (Visual Mockup based on user image) */}
                <div
                    className="relative w-full max-w-3xl aspect-video bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden border border-white/20 shadow-2xl cursor-pointer group animate-fade-in-up delay-200 mt-8"
                    onClick={() => setIsVideoOpen(true)}

        <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
            </div>
            );
};

            export default Hero;
