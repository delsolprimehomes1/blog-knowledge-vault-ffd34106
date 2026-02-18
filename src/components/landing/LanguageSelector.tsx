import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES } from '@/utils/landing/languageDetection';
import { trackEvent } from '@/utils/landing/analytics';

interface LanguageSelectorProps {
    currentLang: LanguageCode;
    onLanguageChange?: (lang: LanguageCode) => void;
}

const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
    en: '🇬🇧',
    nl: '🇳🇱',
    fr: '🇫🇷',
    de: '🇩🇪',
    fi: '🇫🇮',
    pl: '🇵🇱',
    da: '🇩🇰',
    hu: '🇭🇺',
    sv: '🇸🇪',
    no: '🇳🇴'
};

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
    en: 'English',
    nl: 'Nederlands',
    fr: 'Français',
    de: 'Deutsch',
    fi: 'Suomi',
    pl: 'Polski',
    da: 'Dansk',
    hu: 'Magyar',
    sv: 'Svenska',
    no: 'Norsk'
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onLanguageChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (newLang: LanguageCode) => {
        setIsOpen(false);
        trackEvent('language_switch', {
            category: 'Engagement',
            from_language: currentLang,
            to_language: newLang
        });

        if (onLanguageChange) {
            onLanguageChange(newLang);
        } else {
            const currentUrl = new URL(window.location.href);
            const newPath = currentUrl.pathname.replace(`/${currentLang}/`, `/${newLang}/`);
            currentUrl.pathname = newPath;
            window.location.href = currentUrl.toString();
        }
    };

    return (
        <div className="relative z-50" ref={containerRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-landing-navy opacity-70 hover:opacity-100 transition-opacity"
            >
                <span className="text-base">{LANGUAGE_FLAGS[currentLang]}</span>
                <span className="uppercase">{currentLang}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50">
                    <div className="py-2">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageChange(lang)}
                                className={`flex items-center gap-2 w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 transition-colors ${currentLang === lang ? 'font-bold text-landing-gold' : 'text-landing-navy'}`}
                            >
                                <span>{LANGUAGE_FLAGS[lang]}</span>
                                {LANGUAGE_NAMES[lang]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
