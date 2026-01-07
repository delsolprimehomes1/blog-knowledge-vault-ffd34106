import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Hero from './Hero';
import EmmaChat from './EmmaChat';
import TestimonialSection from './TestimonialSection';
import PropertyTypeSelector from './PropertyTypeSelector';
import PropertyCarousel from './PropertyCarousel';
import Footer from './Footer';
import LanguageSelector from './LanguageSelector';
import LeadCaptureForm from './LeadCaptureForm';
import StickyActionButton from './StickyActionButton';
import PrePropertiesAction from './PrePropertiesAction';
import BridgingStatement from './BridgingStatement';
import PropertyCategories from './PropertyCategories';
import ExplainerVideo from './ExplainerVideo';
import { LanguageCode } from '@/utils/landing/languageDetection';
import { trackPageView } from '@/utils/landing/analytics';

interface LandingLayoutProps {
    language: LanguageCode;
    translations: any; // Using any for flexibility with JSON import structures
}

const LandingLayout: React.FC<LandingLayoutProps> = ({ language, translations }) => {
    const [isEmmaOpen, setIsEmmaOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);

    useEffect(() => {
        trackPageView(language);

        // Listen for custom events from EmmaChat or other components
        const handleOpenForm = (e: CustomEvent) => {
            setSelectedPropertyId(e.detail?.interest);
            setIsFormOpen(true);
        };

        window.addEventListener('openLeadForm' as any, handleOpenForm);
        return () => window.removeEventListener('openLeadForm' as any, handleOpenForm);
    }, [language]);

    const handlePropertySelect = (id: string) => {
        setSelectedPropertyId(id);
        setIsFormOpen(true);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#2C3E50]">
            {/* Dynamic Head Tags */}
            <Helmet>
                <html lang={language} />
                <title>{translations.hero.headline} | DelSolPrimeHomes</title>
                <meta name="description" content={translations.hero.subheadline} />

                {/* Hreflang Tags */}
                <link rel="alternate" hrefLang="en" href="https://www.delsolprimehomes.com/en/landing" />
                <link rel="alternate" hrefLang="nl" href="https://www.delsolprimehomes.com/nl/landing" />
                <link rel="alternate" hrefLang="fr" href="https://www.delsolprimehomes.com/fr/landing" />
                <link rel="alternate" hrefLang="de" href="https://www.delsolprimehomes.com/de/landing" />
                <link rel="alternate" hrefLang="fi" href="https://www.delsolprimehomes.com/fi/landing" />
                <link rel="alternate" hrefLang="pl" href="https://www.delsolprimehomes.com/pl/landing" />
                <link rel="alternate" hrefLang="da" href="https://www.delsolprimehomes.com/da/landing" />
                <link rel="alternate" hrefLang="hu" href="https://www.delsolprimehomes.com/hu/landing" />
                <link rel="alternate" hrefLang="sv" href="https://www.delsolprimehomes.com/sv/landing" />
                <link rel="alternate" hrefLang="no" href="https://www.delsolprimehomes.com/no/landing" />
                <link rel="alternate" hrefLang="x-default" href="https://www.delsolprimehomes.com/en/landing" />

                <link rel="canonical" href={`https://www.delsolprimehomes.com/${language}/landing`} />
            </Helmet>

            {/* Navigation Header */}
            <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm transition-all duration-300">
                <div className="container mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
                    {/* Left Links */}
                    <div className="hidden lg:flex items-center gap-6 text-[#2C3E50] text-sm font-medium tracking-wide font-serif italic">
                        <span>Apartments & Penthouses</span>
                        <span className="text-[#C4A053]">|</span>
                        <span>Townhouses & Villas</span>
                    </div>

                    {/* Center Logo */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="flex flex-col items-center">
                            <span className="text-[#C4A053] font-serif text-2xl font-bold tracking-widest whitespace-nowrap cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                DELSOLPRIMEHOMES
                            </span>
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-6">
                        {/* Desktop Header CTA */}
                        <button
                            onClick={() => setIsEmmaOpen(true)}
                            className="hidden md:block bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-md transition-all"
                        >
                            {translations.header?.cta || "Get your private shortlist"}
                        </button>

                        <div className="flex items-center gap-3">
                            <LanguageSelector currentLang={language} />
                        </div>
                    </div>
                </div>
            </header>

            <Hero
                onStartChat={() => setIsEmmaOpen(true)}
                onOpenVideo={() => {
                    const videoSection = document.getElementById('explainer-video');
                    if (videoSection) {
                        videoSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }}
            />

            <ExplainerVideo />

            <TestimonialSection />

            <BridgingStatement />

            <PrePropertiesAction
                onOpenChat={() => setIsEmmaOpen(true)}
            />

            <PropertyCategories />

            {/* Note: This logic keeps PropertyTypeSelector for mobile via display classes in component or we should hide it?
                The PropertyCategories component is 'hidden md:block'.
                The PropertyTypeSelector might be redundant on Desktop now.
                Let's hide PropertyTypeSelector on desktop if possible, or keep it as sticky nav.
                For now, keeping it but it might look crowded.
                Actually, PropertyCategories sends to #apartments-section.
                Let's keep PropertyTypeSelector for mobile mostly.
            */}
            <div className="md:hidden">
                <PropertyTypeSelector
                    translations={translations.properties.types}
                    onSelect={(type) => {
                        const element = document.getElementById('properties-section');
                        element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                />
            </div>

            <PropertyCarousel />

            <Footer content={translations.footer} />

            <StickyActionButton
                onOpenChat={() => setIsEmmaOpen(true)}
            />

            <EmmaChat
                language={language}
                isOpen={isEmmaOpen}
                onClose={() => setIsEmmaOpen(false)}
            />

            <LeadCaptureForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                language={language}
                translations={translations.form}
                propertyId={selectedPropertyId}
            />
        </div>
    );
};

export default LandingLayout;
