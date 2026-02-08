import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Menu as MenuIcon, X, ChevronDown, Scale, Users, Phone, Home, Landmark, GraduationCap, Newspaper, MessageCircleQuestion, GitCompare, BookMarked, Info, MapPin } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from '../../i18n';
import { Menu, MenuItem, ProductItem, HoveredLink } from '../ui/navbar-menu';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ContentLanguageSwitcher } from '../ContentLanguageSwitcher';

interface ContentContext {
  type: 'blog' | 'qa' | 'location' | 'comparison';
  hreflangGroupId: string | null;
  currentSlug: string;
  currentLanguage: string;
}

interface HeaderProps {
  variant?: 'transparent' | 'solid';
  contentContext?: ContentContext;
}

export const Header: React.FC<HeaderProps> = ({ variant = 'transparent', contentContext }) => {
  const { t, currentLanguage, setLanguage } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const isLightBackground = variant === 'solid' || isScrolled;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Supabase Storage base URL for navbar images
  const storageBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/navbar-images`;

  // Featured cities for the Explore dropdown - using Supabase Storage URLs with verified location-specific Unsplash fallbacks
  const featuredCities = [
    {
      title: "Marbella",
      description: t.header?.cities?.marbella || "Luxury living on the Golden Mile",
      href: `/${currentLanguage}/brochure/marbella`,
      src: `${storageBaseUrl}/marbella-navbar.jpg`,
      fallback: "https://images.unsplash.com/photo-1722600522832-c7ebd5ea1ace?w=400&h=300&fit=crop&q=80"
    },
    {
      title: "Estepona",
      description: t.header?.cities?.estepona || "Charming old town & beaches",
      href: `/${currentLanguage}/brochure/estepona`,
      src: `${storageBaseUrl}/estepona-navbar.jpg`,
      fallback: "https://images.unsplash.com/photo-1624361141205-e0fd424dd800?w=400&h=300&fit=crop&q=80"
    },
    {
      title: "Málaga",
      description: t.header?.cities?.malaga || "Culture, cuisine & coastline",
      href: `/${currentLanguage}/brochure/malaga-city`,
      src: `${storageBaseUrl}/malaga-navbar.jpg`,
      fallback: "https://images.unsplash.com/photo-1550152428-4fbab75a3b0e?w=400&h=300&fit=crop&q=80"
    },
    {
      title: "Sotogrande",
      description: t.header?.cities?.sotogrande || "Exclusive marina lifestyle",
      href: `/${currentLanguage}/brochure/sotogrande`,
      src: `${storageBaseUrl}/sotogrande-navbar.jpg`,
      fallback: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&q=80"
    },
  ];

  // Mobile menu portal content
  const mobileMenuContent = (
    <div 
      className={`fixed inset-0 bg-background z-[90] flex flex-col pt-24 px-6 gap-2 lg:hidden overflow-y-auto transition-all duration-300 ${
        isMobileMenuOpen 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full pointer-events-none'
      }`}
    >
      {/* Explore Section */}
      <MobileMenuSection 
        title={t.header?.menus?.explore || "Explore"} 
        isOpen={mobileSubmenu === 'explore'}
        onToggle={() => setMobileSubmenu(mobileSubmenu === 'explore' ? null : 'explore')}
      >
        <MobileLink to={`/${currentLanguage}/properties`} onClick={() => setIsMobileMenuOpen(false)} icon={<Home className="w-5 h-5" />}>
          {t.header?.items?.propertyFinder || "Property Finder"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/brochure/marbella`} onClick={() => setIsMobileMenuOpen(false)} icon={<Landmark className="w-5 h-5" />}>
          {t.header?.items?.cityBrochures || "City Brochures"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/locations`} onClick={() => setIsMobileMenuOpen(false)} icon={<MapPin className="w-5 h-5" />}>
          {t.header?.items?.locationGuides || "Location Guides"}
        </MobileLink>
      </MobileMenuSection>

      {/* Learn Section */}
      <MobileMenuSection 
        title={t.header?.menus?.learn || "Learn"} 
        isOpen={mobileSubmenu === 'learn'}
        onToggle={() => setMobileSubmenu(mobileSubmenu === 'learn' ? null : 'learn')}
      >
        <MobileLink to={`/${currentLanguage}/blog`} onClick={() => setIsMobileMenuOpen(false)} icon={<Newspaper className="w-5 h-5" />}>
          {t.header?.items?.blogInsights || "Blog & Insights"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/qa`} onClick={() => setIsMobileMenuOpen(false)} icon={<MessageCircleQuestion className="w-5 h-5" />}>
          {t.header?.items?.qaCenter || "Q&A Center"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/glossary`} onClick={() => setIsMobileMenuOpen(false)} icon={<BookMarked className="w-5 h-5" />}>
          {t.header?.items?.propertyGlossary || "Property Glossary"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/buyers-guide`} onClick={() => setIsMobileMenuOpen(false)} icon={<GraduationCap className="w-5 h-5" />}>
          {t.header?.items?.buyersGuide || "Buyer's Guide"}
        </MobileLink>
      </MobileMenuSection>

      {/* Compare Section */}
      <MobileMenuSection 
        title={t.header?.menus?.compare || "Compare"} 
        isOpen={mobileSubmenu === 'compare'}
        onToggle={() => setMobileSubmenu(mobileSubmenu === 'compare' ? null : 'compare')}
      >
        <MobileLink to={`/${currentLanguage}/compare`} onClick={() => setIsMobileMenuOpen(false)} icon={<GitCompare className="w-5 h-5" />}>
          {t.header?.items?.comparisonIndex || "Comparison Index"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/compare`} onClick={() => setIsMobileMenuOpen(false)} icon={<Scale className="w-5 h-5" />}>
          {t.header?.items?.cityVsCity || "City vs City"}
        </MobileLink>
      </MobileMenuSection>

      {/* About Section */}
      <MobileMenuSection 
        title={t.header?.menus?.about || "About"} 
        isOpen={mobileSubmenu === 'about'}
        onToggle={() => setMobileSubmenu(mobileSubmenu === 'about' ? null : 'about')}
      >
        <MobileLink to={`/${currentLanguage}/about`} onClick={() => setIsMobileMenuOpen(false)} icon={<Info className="w-5 h-5" />}>
          {t.header?.items?.aboutUs || "About Us"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/team`} onClick={() => setIsMobileMenuOpen(false)} icon={<Users className="w-5 h-5" />}>
          {t.header?.items?.ourTeam || "Our Team"}
        </MobileLink>
        <MobileLink to={`/${currentLanguage}/contact`} onClick={() => setIsMobileMenuOpen(false)} icon={<Phone className="w-5 h-5" />}>
          {t.header?.items?.contact || "Contact"}
        </MobileLink>
      </MobileMenuSection>
      
      {/* Language Selector */}
      <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.header?.language || "Language"}</span>
        {contentContext ? (
          <ContentLanguageSwitcher
            currentLanguage={contentContext.currentLanguage}
            hreflangGroupId={contentContext.hreflangGroupId}
            contentType={contentContext.type}
            currentSlug={contentContext.currentSlug}
            variant="default"
          />
        ) : (
          <LanguageSwitcher variant="default" className="w-full" />
        )}
      </div>
      
      <Button fullWidth onClick={() => { setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('openEmmaChat')); }} className="mt-auto mb-8">
        {t.common.chatWithEmma}
      </Button>
    </div>
  );

  return (
    <>
    <header 
      className={`fixed top-0 w-full z-[100] transition-all duration-500 ${
        isLightBackground 
          ? 'glass-nav py-3 border-b border-border/50 shadow-sm' 
          : 'bg-transparent py-4 border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 grid grid-cols-2 lg:grid-cols-3 items-center">
        {/* Logo - left aligned */}
        <Link to="/" className="flex items-center gap-2.5 z-50 justify-self-start">
          <img 
            src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png" 
            alt="DelSolPrimeHomes" 
            width={160}
            height={64}
            loading="eager"
            decoding="async"
            className={`h-14 md:h-16 w-auto min-w-[120px] object-contain transition-all duration-500 ${
              isLightBackground 
                ? 'brightness-0 sepia saturate-[10] hue-rotate-[15deg]' 
                : ''
            }`}
          />
        </Link>

        {/* Desktop Mega Menu - truly centered */}
        <div className="hidden lg:flex items-center justify-center">
          <Menu setActive={setActive}>
            {/* Explore Menu */}
            <MenuItem setActive={setActive} active={active} item={t.header?.menus?.explore || "Explore"}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/50">
                  {featuredCities.map((city) => (
                    <ProductItem key={city.title} {...city} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 pt-2">
                  <HoveredLink href={`/${currentLanguage}/properties`}>
                    <span className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      {t.header?.items?.propertyFinder || "Property Finder"}
                    </span>
                  </HoveredLink>
                  <HoveredLink href={`/${currentLanguage}/brochure/marbella`}>
                    <span className="flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      {t.header?.items?.cityBrochures || "City Brochures"}
                    </span>
                  </HoveredLink>
                  <HoveredLink href={`/${currentLanguage}/locations`}>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t.header?.items?.locationGuides || "Location Guides"}
                    </span>
                  </HoveredLink>
                </div>
              </div>
            </MenuItem>

            {/* Learn Menu */}
            <MenuItem setActive={setActive} active={active} item={t.header?.menus?.learn || "Learn"}>
              <div className="flex flex-col gap-1 min-w-[200px]">
                <HoveredLink href={`/${currentLanguage}/blog`}>
                  <span className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    {t.header?.items?.blogInsights || "Blog & Insights"}
                  </span>
                </HoveredLink>
                <HoveredLink href={`/${currentLanguage}/qa`}>
                  <span className="flex items-center gap-2">
                    <MessageCircleQuestion className="w-4 h-4" />
                    {t.header?.items?.qaCenter || "Q&A Center"}
                  </span>
                </HoveredLink>
                <HoveredLink href={`/${currentLanguage}/glossary`}>
                  <span className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4" />
                    {t.header?.items?.propertyGlossary || "Property Glossary"}
                  </span>
                </HoveredLink>
                <HoveredLink href={`/${currentLanguage}/buyers-guide`}>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {t.header?.items?.buyersGuide || "Buyer's Guide"}
                  </span>
                </HoveredLink>
              </div>
            </MenuItem>

            {/* Compare Menu */}
            <MenuItem setActive={setActive} active={active} item={t.header?.menus?.compare || "Compare"}>
              <div className="flex flex-col gap-1 min-w-[200px]">
                <HoveredLink href={`/${currentLanguage}/compare`}>
                  <span className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4" />
                    {t.header?.items?.comparisonIndex || "Comparison Index"}
                  </span>
                </HoveredLink>
                <HoveredLink href={`/${currentLanguage}/compare`}>
                  <span className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    {t.header?.items?.cityVsCity || "City vs City"}
                  </span>
                </HoveredLink>
              </div>
            </MenuItem>

            {/* About Menu */}
            <MenuItem setActive={setActive} active={active} item={t.header?.menus?.about || "About"}>
              <div className="flex flex-col gap-1 min-w-[200px]">
                <HoveredLink href={`/${currentLanguage}/about`}>
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t.header?.items?.aboutUs || "About Us"}
                  </span>
                </HoveredLink>
                <HoveredLink href={`/${currentLanguage}/team`}>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t.header?.items?.ourTeam || "Our Team"}
                  </span>
                </HoveredLink>
                <HoveredLink href={`/${currentLanguage}/contact`}>
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t.header?.items?.contact || "Contact"}
                  </span>
                </HoveredLink>
              </div>
            </MenuItem>
          </Menu>
        </div>

        {/* Actions - right aligned */}
        <div className="hidden lg:flex items-center gap-6 justify-self-end">
          {/* Language Selector - Content-aware or generic */}
          {contentContext ? (
            <ContentLanguageSwitcher
              currentLanguage={contentContext.currentLanguage}
              hreflangGroupId={contentContext.hreflangGroupId}
              contentType={contentContext.type}
              currentSlug={contentContext.currentSlug}
              variant="default"
            />
          ) : (
            <LanguageSwitcher 
              variant="compact" 
              className={isLightBackground ? '' : 'border-white/30 text-white [&_button]:text-white'}
            />
          )}

          <Button 
            variant={isLightBackground ? 'primary' : 'secondary'} 
            size="sm" 
            className={`font-nav tracking-wide ${!isLightBackground ? 'bg-prime-gold hover:bg-prime-gold/90 text-prime-900 shadow-lg shadow-prime-gold/20 border-none' : 'bg-prime-gold hover:bg-prime-gold/90 text-prime-900'}`}
            onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat'))}
          >
            {t.common.chatWithEmma}
          </Button>
        </div>

        {/* Mobile Toggle - positioned in grid column 2 (or 3 on lg) */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden z-[110] justify-self-end transition-colors duration-300 ${isLightBackground || isMobileMenuOpen ? 'text-foreground' : 'text-white'}`}
        >
          {isMobileMenuOpen ? <X size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>
    </header>
    
    {/* Mobile Menu Portal - rendered outside header to avoid stacking context issues */}
    {typeof document !== 'undefined' && createPortal(mobileMenuContent, document.body)}
    </>
  );
};

// Mobile Menu Section Component - CSS animated
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
      <div 
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1 pb-4 pl-2">
          {children}
        </div>
      </div>
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
