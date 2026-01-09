import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Hero from './Hero';
import AutoplayVideo from './AutoplayVideo';
import EmmaSection from './EmmaSection';
import PropertiesShowcase from './PropertiesShowcase';
import ClassicOptin from './ClassicOptin';
import EmmaChat from './EmmaChat';
import Footer from './Footer';
import LanguageSelector from './LanguageSelector';
// import LeadCaptureForm from './LeadCaptureForm'; // We might still need this for property clicks
import { LanguageCode } from '@/utils/landing/languageDetection';
import { trackPageView } from '@/utils/landing/analytics';
import LeadCaptureForm from './LeadCaptureForm';

interface LandingLayoutProps {
    language: LanguageCode;
    translations: any;
}

const LandingLayout: React.FC<LandingLayoutProps> = ({ language, translations }) => {
    const [isEmmaOpen, setIsEmmaOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);

    useEffect(() => {
        trackPageView(language);

        const handleOpenForm = (e: CustomEvent) => {
            setSelectedPropertyId(e.detail?.interest);
            setIsFormOpen(true);
        };

        const handleOpenChat = () => {
            setIsEmmaOpen(true);
        };

        window.addEventListener('openLeadForm' as any, handleOpenForm);
        window.addEventListener('openEmmaChat' as any, handleOpenChat);

        return () => {
            window.removeEventListener('openLeadForm' as any, handleOpenForm);
            window.removeEventListener('openEmmaChat' as any, handleOpenChat);
        };
    }, [language]);

    // Fallback for missing translations to prevent crash
    const t = translations || {};
    const heroT = t.hero || {};

    return (
        <div className="min-h-screen bg-white font-sans text-landing-navy selection:bg-landing-gold selection:text-white">
            {/* SEO & Infrastructure */}
            <Helmet>
                {/* CRITICAL: Dynamic HTML lang attribute */}
                <html lang={language} />

                {/* Dynamic Title (Native Language) */}
                <title>{heroT.headline ? `${heroT.headline} | DelSolPrimeHomes` : 'Del Sol Prime Homes'}</title>

                {/* Dynamic Description (Native Language) */}
                <meta name="description" content={heroT.subheadline || "Independent guidance for Costa del Sol property"} />

                {/* SEO: Robots & Discovery */}
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta http-equiv="content-language" content={language} />

                {/* HREFLANG TAGS - Perfect Implementation (10 Languages + x-default) */}
                <link rel="alternate" hrefLang="en" href="https://www.delsolprimehomes.com/en/landing" />
                <link rel="alternate" hrefLang="nl" href="https://www.delsolprimehomes.com/nl/landing" />
                <link rel="alternate" hrefLang="de" href="https://www.delsolprimehomes.com/de/landing" />
                <link rel="alternate" hrefLang="fr" href="https://www.delsolprimehomes.com/fr/landing" />
                <link rel="alternate" hrefLang="fi" href="https://www.delsolprimehomes.com/fi/landing" />
                <link rel="alternate" hrefLang="pl" href="https://www.delsolprimehomes.com/pl/landing" />
                <link rel="alternate" hrefLang="da" href="https://www.delsolprimehomes.com/da/landing" />
                <link rel="alternate" hrefLang="hu" href="https://www.delsolprimehomes.com/hu/landing" />
                <link rel="alternate" hrefLang="sv" href="https://www.delsolprimehomes.com/sv/landing" />
                <link rel="alternate" hrefLang="no" href="https://www.delsolprimehomes.com/no/landing" />
                <link rel="alternate" hrefLang="x-default" href="https://www.delsolprimehomes.com/en/landing" />

                {/* CANONICAL URL - Language-Specific */}
                <link rel="canonical" href={`https://www.delsolprimehomes.com/${language}/landing`} />

                {/* Geographic Targeting (GEO) */}
                <meta name="geo.region" content="ES-AN" />
                <meta name="geo.placename" content="Costa del Sol" />
                <meta name="geo.position" content="36.5085;-4.8833" />
                <meta name="ICBM" content="36.5085, -4.8833" />

                {/* Open Graph (Social Sharing) */}
                <meta property="og:title" content={heroT.headline ? `${heroT.headline} | DelSolPrimeHomes` : 'Del Sol Prime Homes'} />
                <meta property="og:description" content={heroT.subheadline || "Independent guidance for Costa del Sol property"} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://www.delsolprimehomes.com/${language}/landing`} />
                <meta property="og:image" content="https://www.delsolprimehomes.com/og-image.jpg" />
                <meta property="og:locale" content={getLocaleCode(language)} />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={heroT.headline ? `${heroT.headline} | DelSolPrimeHomes` : 'Del Sol Prime Homes'} />
                <meta name="twitter:description" content={heroT.subheadline || "Independent guidance for Costa del Sol property"} />
                <meta name="twitter:image" content="https://www.delsolprimehomes.com/og-image.jpg" />

                {/* AEO: Schema.org JSON-LD (Critical for AI Engines) */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "RealEstateAgent",
                        "name": "DelSolPrimeHomes",
                        "url": `https://www.delsolprimehomes.com/${language}/landing`,
                        "logo": "https://www.delsolprimehomes.com/logo.png",
                        "description": heroT.subheadline || "Independent guidance for new-build property on the Costa del Sol",
                        "inLanguage": language,
                        "areaServed": {
                            "@type": "Place",
                            "name": "Costa del Sol, Spain",
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": "36.5085",
                                "longitude": "-4.8833"
                            }
                        },
                        "priceRange": "€350,000 - €5,000,000+",
                        "address": {
                            "@type": "PostalAddress",
                            "addressCountry": "ES",
                            "addressRegion": "Andalusia"
                        },
                        "sameAs": [
                            "https://www.facebook.com/delsolprimehomes",
                            "https://www.instagram.com/delsolprimehomes"
                        ]
                    })}
                </script>

                {/* FAQ Schema for SERP Real Estate (if available) */}
                {t.faq && (
                    <script type="application/ld+json">
                        {JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": t.faq.questions.map((q: any) => ({
                                "@type": "Question",
                                "name": q.question,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": q.answer
                                }
                            }))
                        })}
                    </script>
                )}
            </Helmet>

            {/* Fixed Minimal Header */}
            <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300 border-b border-gray-100">
                <div className="container mx-auto px-4 h-20 flex justify-between items-center">
                    {/* Left: Section Links (Desktop Only) - Updated links for new layout */}
                    <nav className="hidden lg:flex items-center gap-8 text-landing-navy text-sm font-medium tracking-wide">
                        <button onClick={() => document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-landing-gold transition-colors">
                            {t.video?.headline || "How it works"}
                        </button>
                        <span className="text-landing-gold/30">|</span>
                        <button onClick={() => document.getElementById('properties-section')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-landing-gold transition-colors">
                            {t.header?.apartments || "Properties"}
                        </button>
                    </nav>

                    {/* Left: Mobile Placeholder */}
                    <div className="lg:hidden" />

                    {/* Center: Logo */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <span
                            className="text-landing-gold font-serif text-xl md:text-2xl font-bold tracking-[0.15em] whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            DELSOLPRIMEHOMES
                        </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="hidden md:block">
                            <LanguageSelector currentLang={language} />
                        </div>
                        <button
                            onClick={() => setIsEmmaOpen(true)}
                            className="bg-landing-gold hover:bg-landing-goldDark text-white px-6 py-2.5 rounded-sm text-sm font-bold tracking-wide shadow-md transition-all hover:-translate-y-0.5"
                        >
                            {t.header?.cta || "Speak with Emma"}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Sections - NEW ORDER */}
            <main>
                {/* 1. HERO - Clarity First */}
                <Hero
                    onStartChat={() => setIsEmmaOpen(true)}
                    translations={translations}
                />

                {/* 2. VIDEO - Guidance Explanation */}
                <AutoplayVideo
                    language={language}
                    translations={translations}
                />

                {/* 3. EMMA SECTION - Primary Conversion */}
                <EmmaSection
                    onStartChat={() => setIsEmmaOpen(true)}
                    translations={translations?.emma}
                />

                {/* 4. FALLBACK PROPERTIES - De-emphasized */}
                <PropertiesShowcase
                    translations={translations}
                />

                {/* 5. CLASSIC OPT-IN - Last Resort */}
                <ClassicOptin
                    language={language}
                    translations={translations?.classicOptin}
                />
            </main>

            <Footer content={t.footer} />

            {/* Interactive Elements */}
            <EmmaChat
                language={language}
                isOpen={isEmmaOpen}
                onClose={() => setIsEmmaOpen(false)}
            />

            <LeadCaptureForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                language={language}
                translations={t.form || {}}
                propertyId={selectedPropertyId}
            />
        </div>
    );
};


// Helper function for locale codes to support OG tags
function getLocaleCode(language: string): string {
    const localeMap: Record<string, string> = {
        en: 'en_US',
        nl: 'nl_NL',
        de: 'de_DE',
        fr: 'fr_FR',
        fi: 'fi_FI',
        pl: 'pl_PL',
        da: 'da_DK',
        hu: 'hu_HU',
        sv: 'sv_SE',
        no: 'nb_NO'
    };
    return localeMap[language] || 'en_US';
}

export default LandingLayout;
