import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Language } from '../../types/home';
import { LANGUAGE_NAMES } from '../../constants/home';
import { Button } from './ui/Button';
import { useTranslation } from '../../i18n';

export const Header: React.FC = () => {
  const { t, currentLanguage, setLanguage } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
        isScrolled 
          ? 'glass-nav py-3 border-slate-200/50 shadow-sm' 
          : 'bg-transparent py-6 border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 z-50">
          <img 
            src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png" 
            alt="DelSolPrimeHomes" 
            className="h-14 md:h-20 w-auto object-contain transition-all duration-500"
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          <Link 
            to="/property-finder"
            className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
          >
            {t.nav.properties}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <a 
            href="#areas"
            className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
          >
            {t.nav.areas}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a 
            href="#about"
            className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
          >
            {t.nav.aboutUs}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a 
            href="#guide"
            className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
          >
            {t.nav.buyersGuide}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
          </a>
          <Link 
            to="/blog"
            className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
          >
            {t.nav.blog}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </nav>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-6">
          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-300 ${isScrolled ? 'text-slate-700 hover:text-prime-900' : 'text-white hover:text-prime-gold'}`}
            >
              {currentLanguage} <ChevronDown size={14} className={`transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isLangMenuOpen && (
              <div className="absolute top-full right-0 mt-4 w-48 bg-white rounded-xl shadow-2xl shadow-slate-900/10 py-2 border border-slate-100 grid grid-cols-1 overflow-hidden animate-fade-in-up origin-top-right">
                {Object.values(Language).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setIsLangMenuOpen(false);
                    }}
                    className={`px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors ${currentLanguage === lang ? 'text-prime-gold font-bold bg-slate-50/50' : 'text-slate-600'}`}
                  >
                    {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant={isScrolled ? 'primary' : 'secondary'} size="sm" className={!isScrolled ? 'shadow-lg shadow-black/10' : ''}>
            {t.common.bookCall}
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden z-50 transition-colors duration-300 ${isScrolled || isMobileMenuOpen ? 'text-slate-900' : 'text-white'}`}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 bg-white z-40 flex flex-col pt-32 px-8 gap-8 lg:hidden transition-transform duration-500 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <Link 
          to="/property-finder"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
        >
          {t.nav.properties}
        </Link>
        <a 
          href="#areas"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
        >
          {t.nav.areas}
        </a>
        <a 
          href="#about"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
        >
          {t.nav.aboutUs}
        </a>
        <a 
          href="#guide"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
        >
          {t.nav.buyersGuide}
        </a>
        <Link 
          to="/blog"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
        >
          {t.nav.blog}
        </Link>
        
        <div className="flex flex-col gap-4 mt-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Language</span>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(Language).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${currentLanguage === lang ? 'border-prime-900 bg-prime-900 text-white' : 'border-slate-200 text-slate-600'}`}
              >
                {LANGUAGE_NAMES[lang]}
              </button>
            ))}
          </div>
        </div>
        
        <Button fullWidth onClick={() => setIsMobileMenuOpen(false)} className="mt-auto mb-8">
          {t.common.bookCall}
        </Button>
      </div>
    </header>
  );
};