import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Language } from '../../types/home';
import { LANGUAGE_NAMES, NAV_LINKS } from '../../constants/home';
import { Button } from './ui/Button';

interface HeaderProps {
  currentLang?: Language;
  setLang?: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentLang = Language.EN, setLang }) => {
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
          {NAV_LINKS.map((link) => (
            link.href === '/blog' ? (
              <Link 
                key={link.href} 
                to="/blog"
                className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ) : (
              <a 
                key={link.href} 
                href={`#${currentLang}${link.href}`}
                className={`text-sm font-medium hover:text-prime-gold transition-colors duration-300 relative group font-nav ${isScrolled ? 'text-slate-700' : 'text-white/90'}`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-prime-gold transition-all duration-300 group-hover:w-full"></span>
              </a>
            )
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-6">
          {/* Language Selector */}
          {setLang && (
            <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-300 ${isScrolled ? 'text-slate-700 hover:text-prime-900' : 'text-white hover:text-prime-gold'}`}
              >
                {currentLang} <ChevronDown size={14} className={`transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isLangMenuOpen && (
                <div className="absolute top-full right-0 mt-4 w-48 bg-white rounded-xl shadow-2xl shadow-slate-900/10 py-2 border border-slate-100 grid grid-cols-1 overflow-hidden animate-fade-in-up origin-top-right">
                  {Object.values(Language).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLang(lang);
                        setIsLangMenuOpen(false);
                      }}
                      className={`px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors ${currentLang === lang ? 'text-prime-gold font-bold bg-slate-50/50' : 'text-slate-600'}`}
                    >
                      {LANGUAGE_NAMES[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button variant={isScrolled ? 'primary' : 'secondary'} size="sm" className={!isScrolled ? 'shadow-lg shadow-black/10' : ''}>
            Book a Call
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
      <div className={`fixed inset-0 bg-white/95 backdrop-blur-xl z-40 flex flex-col pt-32 px-8 gap-8 lg:hidden transition-transform duration-500 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {NAV_LINKS.map((link) => (
          link.href === '/blog' ? (
            <Link 
              key={link.href} 
              to="/blog"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
            >
              {link.label}
            </Link>
          ) : (
            <a 
              key={link.href} 
              href={`#${currentLang}${link.href}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-serif font-medium text-slate-800 border-b border-slate-100 pb-4 font-nav"
            >
              {link.label}
            </a>
          )
        ))}
        
        {setLang && (
          <div className="flex flex-col gap-4 mt-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Language</span>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(Language).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLang(lang);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${currentLang === lang ? 'border-prime-900 bg-prime-900 text-white' : 'border-slate-200 text-slate-600'}`}
                >
                  {LANGUAGE_NAMES[lang]}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <Button fullWidth onClick={() => setIsMobileMenuOpen(false)} className="mt-auto mb-8">
           Book a Call
        </Button>
      </div>
    </header>
  );
};