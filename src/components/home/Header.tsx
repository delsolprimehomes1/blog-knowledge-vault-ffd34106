import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu as MenuIcon, X, ChevronDown, MapPin, BookOpen, Scale, Building2, FileText, HelpCircle, Users, Phone, Home, Map, Landmark, GraduationCap, Newspaper, MessageCircleQuestion, GitCompare, BookMarked, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../../types/home';
import { LANGUAGE_NAMES } from '../../constants/home';
import { Button } from './ui/Button';
import { useTranslation } from '../../i18n';
import { Menu, MenuItem, ProductItem, HoveredLink } from '../ui/navbar-menu';

interface HeaderProps {
  variant?: 'transparent' | 'solid';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'transparent' }) => {
  const { t, currentLanguage, setLanguage } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const isLightBackground = variant === 'solid' || isScrolled;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Supabase Storage base URL for navbar images
  const storageBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/navbar-images`;

  // Featured cities for the Explore dropdown - using Supabase Storage URLs with verified location-specific Unsplash fallbacks
  const featuredCities = [
    {
      title: "Marbella",
      description: "Luxury living on the Golden Mile",
      href: "/brochure/marbella",
      src: `${storageBaseUrl}/marbella-navbar.jpg`,
      // Puerto Banús marina sign, Marbella - verified photo ID: 1722600522832-c7ebd5ea1ace
      fallback: "https://images.unsplash.com/photo-1722600522832-c7ebd5ea1ace?w=400&h=300&fit=crop&q=80"
    },
    {
      title: "Estepona",
      description: "Charming old town & beaches",
      href: "/brochure/estepona",
      src: `${storageBaseUrl}/estepona-navbar.jpg`,
      // Andalusian white village street - verified photo ID: 1624361141205-e0fd424dd800
      fallback: "https://images.unsplash.com/photo-1624361141205-e0fd424dd800?w=400&h=300&fit=crop&q=80"
    },
    {
      title: "Málaga",
      description: "Culture, cuisine & coastline",
      href: "/brochure/malaga",
      src: `${storageBaseUrl}/malaga-navbar.jpg`,
      // Málaga aerial cityscape with buildings - verified photo ID: 1550152428-4fbab75a3b0e
      fallback: "https://images.unsplash.com/photo-1550152428-4fbab75a3b0e?w=400&h=300&fit=crop&q=80"
    },
    {
      title: "Sotogrande",
      description: "Exclusive marina lifestyle",
      href: "/brochure/sotogrande",
      src: `${storageBaseUrl}/sotogrande-navbar.jpg`,
      // Luxury marina with yachts - verified photo ID: 1544551763-46a013bb70d5
      fallback: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&q=80"
    },
  ];

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isLightBackground 
          ? 'glass-nav py-3 border-b border-border/50 shadow-sm' 
          : 'bg-transparent py-4 border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 z-50">
          <img 
            src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png" 
            alt="DelSolPrimeHomes" 
            className={`h-12 md:h-16 w-auto object-contain transition-all duration-500 ${
              isLightBackground 
                ? 'brightness-0 sepia saturate-[10] hue-rotate-[15deg]' 
                : ''
            }`}
          />
        </Link>

        {/* Desktop Mega Menu */}
        <div className="hidden lg:flex items-center">
          <Menu setActive={setActive}>
            {/* Explore Menu */}
            <MenuItem setActive={setActive} active={active} item="Explore">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/50">
                  {featuredCities.map((city) => (
                    <ProductItem key={city.title} {...city} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 pt-2">
                  <HoveredLink href="/property-finder">
                    <span className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Property Finder
                    </span>
                  </HoveredLink>
                  <HoveredLink href="/locations">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      All Locations
                    </span>
                  </HoveredLink>
                  <HoveredLink href="#areas">
                    <span className="flex items-center gap-2">
                      <Map className="w-4 h-4" />
                      Featured Areas
                    </span>
                  </HoveredLink>
                  <HoveredLink href="/brochure/marbella">
                    <span className="flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      City Brochures
                    </span>
                  </HoveredLink>
                </div>
              </div>
            </MenuItem>

            {/* Learn Menu */}
            <MenuItem setActive={setActive} active={active} item="Learn">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <HoveredLink href="/blog">
                  <span className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    Blog & Insights
                  </span>
                </HoveredLink>
                <HoveredLink href="/qa">
                  <span className="flex items-center gap-2">
                    <MessageCircleQuestion className="w-4 h-4" />
                    Q&A Center
                  </span>
                </HoveredLink>
                <HoveredLink href="/glossary">
                  <span className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4" />
                    Property Glossary
                  </span>
                </HoveredLink>
                <HoveredLink href="#guide">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Buyer's Guide
                  </span>
                </HoveredLink>
              </div>
            </MenuItem>

            {/* Compare Menu */}
            <MenuItem setActive={setActive} active={active} item="Compare">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <HoveredLink href="/compare">
                  <span className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4" />
                    Comparison Index
                  </span>
                </HoveredLink>
                <HoveredLink href="/compare">
                  <span className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    City vs City
                  </span>
                </HoveredLink>
              </div>
            </MenuItem>

            {/* About Menu */}
            <MenuItem setActive={setActive} active={active} item="About">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <HoveredLink href="/about">
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    About Us
                  </span>
                </HoveredLink>
                <HoveredLink href="/about">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Our Team
                  </span>
                </HoveredLink>
                <HoveredLink href="#contact">
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact
                  </span>
                </HoveredLink>
              </div>
            </MenuItem>
          </Menu>
        </div>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-6">
          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={`flex items-center gap-1.5 text-sm font-nav font-medium tracking-wide transition-colors duration-300 ${isLightBackground ? 'text-prime-900 hover:text-prime-gold' : 'text-white hover:text-prime-gold'}`}
            >
              {currentLanguage} <ChevronDown size={14} className={`transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-4 w-48 bg-white rounded-xl shadow-2xl shadow-prime-900/15 py-2 border border-prime-gold/20 overflow-hidden"
                >
                  {Object.values(Language).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLangMenuOpen(false);
                      }}
                      className={`px-4 py-2.5 w-full text-left text-sm font-nav hover:bg-prime-gold/10 transition-colors ${currentLanguage === lang ? 'text-prime-gold font-bold bg-prime-gold/5' : 'text-prime-900/70'}`}
                    >
                      {LANGUAGE_NAMES[lang]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button variant={isLightBackground ? 'primary' : 'secondary'} size="sm" className={`font-nav tracking-wide ${!isLightBackground ? 'bg-prime-gold hover:bg-prime-gold/90 text-prime-900 shadow-lg shadow-prime-gold/20 border-none' : 'bg-prime-gold hover:bg-prime-gold/90 text-prime-900'}`}>
            {t.common.bookCall}
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden z-50 transition-colors duration-300 ${isLightBackground || isMobileMenuOpen ? 'text-foreground' : 'text-white'}`}
        >
          {isMobileMenuOpen ? <X size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-card z-40 flex flex-col pt-24 px-6 gap-2 lg:hidden overflow-y-auto"
          >
            {/* Explore Section */}
            <MobileMenuSection 
              title="Explore" 
              isOpen={mobileSubmenu === 'explore'}
              onToggle={() => setMobileSubmenu(mobileSubmenu === 'explore' ? null : 'explore')}
            >
              <MobileLink to="/property-finder" onClick={() => setIsMobileMenuOpen(false)} icon={<Home className="w-5 h-5" />}>
                Property Finder
              </MobileLink>
              <MobileLink to="/locations" onClick={() => setIsMobileMenuOpen(false)} icon={<MapPin className="w-5 h-5" />}>
                All Locations
              </MobileLink>
              <MobileLink href="#areas" onClick={() => setIsMobileMenuOpen(false)} icon={<Map className="w-5 h-5" />}>
                Featured Areas
              </MobileLink>
              <MobileLink to="/brochure/marbella" onClick={() => setIsMobileMenuOpen(false)} icon={<Landmark className="w-5 h-5" />}>
                City Brochures
              </MobileLink>
            </MobileMenuSection>

            {/* Learn Section */}
            <MobileMenuSection 
              title="Learn" 
              isOpen={mobileSubmenu === 'learn'}
              onToggle={() => setMobileSubmenu(mobileSubmenu === 'learn' ? null : 'learn')}
            >
              <MobileLink to="/blog" onClick={() => setIsMobileMenuOpen(false)} icon={<Newspaper className="w-5 h-5" />}>
                Blog & Insights
              </MobileLink>
              <MobileLink to="/qa" onClick={() => setIsMobileMenuOpen(false)} icon={<MessageCircleQuestion className="w-5 h-5" />}>
                Q&A Center
              </MobileLink>
              <MobileLink to="/glossary" onClick={() => setIsMobileMenuOpen(false)} icon={<BookMarked className="w-5 h-5" />}>
                Property Glossary
              </MobileLink>
              <MobileLink href="#guide" onClick={() => setIsMobileMenuOpen(false)} icon={<GraduationCap className="w-5 h-5" />}>
                Buyer's Guide
              </MobileLink>
            </MobileMenuSection>

            {/* Compare Section */}
            <MobileMenuSection 
              title="Compare" 
              isOpen={mobileSubmenu === 'compare'}
              onToggle={() => setMobileSubmenu(mobileSubmenu === 'compare' ? null : 'compare')}
            >
              <MobileLink to="/compare" onClick={() => setIsMobileMenuOpen(false)} icon={<GitCompare className="w-5 h-5" />}>
                Comparison Index
              </MobileLink>
              <MobileLink to="/compare" onClick={() => setIsMobileMenuOpen(false)} icon={<Scale className="w-5 h-5" />}>
                City vs City
              </MobileLink>
            </MobileMenuSection>

            {/* About Section */}
            <MobileMenuSection 
              title="About" 
              isOpen={mobileSubmenu === 'about'}
              onToggle={() => setMobileSubmenu(mobileSubmenu === 'about' ? null : 'about')}
            >
              <MobileLink to="/about" onClick={() => setIsMobileMenuOpen(false)} icon={<Info className="w-5 h-5" />}>
                About Us
              </MobileLink>
              <MobileLink to="/about" onClick={() => setIsMobileMenuOpen(false)} icon={<Users className="w-5 h-5" />}>
                Our Team
              </MobileLink>
              <MobileLink href="#contact" onClick={() => setIsMobileMenuOpen(false)} icon={<Phone className="w-5 h-5" />}>
                Contact
              </MobileLink>
            </MobileMenuSection>
            
            {/* Language Selector */}
            <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Language</span>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(Language).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${currentLanguage === lang ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
                  >
                    {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </div>
            </div>
            
            <Button fullWidth onClick={() => setIsMobileMenuOpen(false)} className="mt-auto mb-8">
              {t.common.bookCall}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// Mobile Menu Section Component
const MobileMenuSection = ({ 
  title, 
  children, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode; 
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="border-b border-border">
      <button 
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-lg font-semibold text-foreground"
      >
        {title}
        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pb-4 pl-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mobile Link Component
const MobileLink = ({ 
  children, 
  to, 
  href, 
  onClick, 
  icon 
}: { 
  children: React.ReactNode; 
  to?: string; 
  href?: string;
  onClick: () => void; 
  icon: React.ReactNode;
}) => {
  const className = "flex items-center gap-3 py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors";
  
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {icon}
        {children}
      </Link>
    );
  }
  
  return (
    <a href={href} onClick={onClick} className={className}>
      {icon}
      {children}
    </a>
  );
};
