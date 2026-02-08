import React from 'react';
import LanguageSelector from './LanguageSelector';

interface FooterProps {
    content?: any;
}

const Footer: React.FC<FooterProps> = ({ content }) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-3 sm:py-4">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Mobile: Stack vertically, Desktop: Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">

                    {/* Logo */}
                    <div className="relative p-1.5 rounded-lg shadow-[0_0_20px_rgba(26,35,50,0.25)]">
                        <img 
                            src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
                            alt="DelSolPrimeHomes"
                            className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                        />
                    </div>

                    {/* Copyright & Links */}
                    <div className="flex flex-row items-center gap-2 sm:gap-3 md:gap-6 text-[10px] sm:text-xs text-landing-text-secondary">
                        <span>© {currentYear}</span>
                        <a href="/privacy" className="hover:text-landing-navy transition-colors">{content?.privacy || "Privacy"}</a>
                        <a href="/terms" className="hover:text-landing-navy transition-colors">{content?.terms || "Terms"}</a>
                        <a href="/crm/agent/login" className="hover:text-landing-navy transition-colors">Dashboard</a>
                    </div>

                    {/* Language Selector - Hidden on mobile (already in header) */}
                    <div className="hidden sm:block scale-75 origin-right">
                        <LanguageSelector currentLang={window.location.pathname.split('/')[1] as any || 'en'} />
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;
