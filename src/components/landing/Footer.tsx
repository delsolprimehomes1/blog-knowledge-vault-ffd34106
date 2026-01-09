import React from 'react';
import LanguageSelector from './LanguageSelector';

interface FooterProps {
    content?: any;
}

const Footer: React.FC<FooterProps> = ({ content }) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-3">
            <div className="container mx-auto px-4">
                <div className="flex flex-row items-center justify-between gap-4 flex-wrap">

                    {/* Logo */}
                    <span className="text-sm font-serif font-bold text-landing-gold tracking-widest">
                        DELSOLPRIMEHOMES
                    </span>

                    {/* Copyright & Links */}
                    <div className="flex flex-row items-center gap-3 md:gap-6 text-xs text-landing-text-secondary">
                        <span>© {currentYear} DelSolPrimeHomes</span>
                        <a href="/privacy" className="hover:text-landing-navy transition-colors">{content?.privacy || "Privacy"}</a>
                        <a href="/terms" className="hover:text-landing-navy transition-colors">{content?.terms || "Terms"}</a>
                    </div>

                    {/* Language Selector */}
                    <div className="scale-75 origin-right">
                        <LanguageSelector currentLang={window.location.pathname.split('/')[1] as any || 'en'} />
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;
