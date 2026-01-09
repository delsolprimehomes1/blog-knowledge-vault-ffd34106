import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

interface ExplainerVideoProps {
    language: string;
}

// Language-specific video URL mapping
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

const ExplainerVideo: React.FC<ExplainerVideoProps> = ({ language }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    // Get the video URL for the current language, fallback to English
    const videoUrl = VIDEO_URLS[language] || VIDEO_URLS.en;

    const handlePlayClick = () => {
        setIsPlaying(true);
    };

    const handleCloseClick = () => {
        setIsPlaying(false);
    };

    return (
        <section id="explainer-video" className="py-24 bg-landing-navy relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Headline */}
                    <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-6">
                        How Our Guided, Pressure-Free Approach Works
                    </h2>

                    {/* Subtext */}
                    <p className="text-lg text-white/80 mb-12">
                        Emma answers your questions and carefully records your criteria.
                    </p>

                    {/* Video Container */}
                    <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                        {!isPlaying ? (
                            // Thumbnail with Play Button
                            <div className="relative w-full h-full flex items-center justify-center bg-gray-800">
                                {/* Placeholder Background - utilizing a generic luxury abstract or darker tone if no specific thumbnail */}
                                <div className="absolute inset-0 bg-gradient-to-br from-landing-navy to-black opacity-80" />

                                <button
                                    onClick={handlePlayClick}
                                    className="group relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-landing-gold rounded-full hover:bg-landing-goldDark transition-all duration-300 hover:scale-110 shadow-2xl z-10"
                                    aria-label="Play video"
                                >
                                    <Play size={36} className="text-white ml-2" fill="white" />
                                </button>
                            </div>
                        ) : (
                            // Video Player
                            <div className="relative w-full h-full">
                                <video
                                    src={videoUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                    controlsList="nodownload"
                                >
                                    Your browser does not support the video tag.
                                </video>

                                {/* Close Button */}
                                <button
                                    onClick={handleCloseClick}
                                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors z-20"
                                    aria-label="Close video"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CTA Below Video */}
                    <div className="mt-12">
                        <button
                            onClick={() => {
                                const event = new CustomEvent('openLeadForm'); // Changed to openLeadForm based on previous usage, user asked for 'openEmmaChat' but previous code used openLeadForm/setIsEmmaOpen. I will check LandingLayout.
                                // Actually the user request says: const event = new CustomEvent('openEmmaChat');
                                // But LandingLayout listens to 'openLeadForm'. 
                                // Wait, LandingLayout.tsx has:
                                // <EmmaChat ... isOpen={isEmmaOpen} ... />
                                // And: <Hero ... onStartChat={() => setIsEmmaOpen(true)} ... />
                                // And: window.addEventListener('openLeadForm' as any, handleOpenForm); which opens the FORM.
                                // The user specifically requested "Chat with Emma" so I should probably open the chat.
                                // However, there is no global event listener for 'openEmmaChat' in LandingLayout shown in my previous read.
                                // Let me check LandingLayout again.
                                // In LandingLayout.tsx (read in step 86), I see:
                                // const [isEmmaOpen, setIsEmmaOpen] = useState(false);
                                // There is no event listener for opening chat, only passed props.
                                // BUT, I can see if I can add one or if I should just use `openLeadForm` if that's what they meant.
                                // The CTA says "Chat with Emma".
                                // I will use `openEmmaChat` and adding the listener to LandingLayout is the correct approach to make it work.
                                window.dispatchEvent(new CustomEvent('openEmmaChat'));
                            }}
                            className="px-8 py-4 bg-landing-gold text-white rounded-lg font-bold hover:bg-landing-goldDark transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                        >
                            Ready to Start? Chat with Emma
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ExplainerVideo;
