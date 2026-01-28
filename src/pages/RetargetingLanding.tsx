import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RetargetingHero,
  RetargetingAutoplayVideo,
  RetargetingTestimonials,
  RetargetingEmmaSection,
  RetargetingProjects,
  RetargetingForm,
  RetargetingFooter,
} from "@/components/retargeting";
import { RetargetingMeta } from "@/components/retargeting/RetargetingMeta";
import { RetargetingHreflang } from "@/components/retargeting/RetargetingHreflang";
import { RetargetingLanguageSelector } from "@/components/retargeting/RetargetingLanguageSelector";
import { getLanguageFromPath } from "@/lib/retargetingRoutes";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import EmmaChat from "@/components/landing/EmmaChat";

const RetargetingLanding = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isEmmaOpen, setIsEmmaOpen] = useState(false);
  const location = useLocation();
  
  // Get language from URL path (works for all 11 language URLs)
  const language = getLanguageFromPath(location.pathname);
  const t = getRetargetingTranslations(language);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Listen for Emma chat open events
  useEffect(() => {
    const handleOpenEmma = () => setIsEmmaOpen(true);
    window.addEventListener("openEmmaChat", handleOpenEmma);
    window.addEventListener("openChatbot", handleOpenEmma);
    return () => {
      window.removeEventListener("openEmmaChat", handleOpenEmma);
      window.removeEventListener("openChatbot", handleOpenEmma);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <RetargetingMeta language={language} />
      <RetargetingHreflang currentLang={language} />

      {/* Fixed White Header - Matching Landing Page */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100/50"
            : "bg-white/90 backdrop-blur-md"
        }`}
      >
        <div className="max-w-6xl mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            {/* Property Category Links - Desktop Only */}
            <div className="hidden lg:flex items-center gap-6 text-sm">
              <a
                href="#properties"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-landing-navy/70 hover:text-landing-navy transition-colors cursor-pointer"
              >
                {t.headerApartments}
              </a>
              <a
                href="#properties"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-landing-navy/70 hover:text-landing-navy transition-colors cursor-pointer"
              >
                {t.headerPenthouses}
              </a>
              <a
                href="#properties"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-landing-navy/70 hover:text-landing-navy transition-colors cursor-pointer"
              >
                {t.headerTownhouses}
              </a>
              <a
                href="#properties"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-landing-navy/70 hover:text-landing-navy transition-colors cursor-pointer"
              >
                {t.headerVillas}
              </a>
            </div>
            
            {/* Centered Logo */}
            <Link to={`/${language}`} className="inline-block lg:absolute lg:left-1/2 lg:-translate-x-1/2">
              <span className="text-landing-navy text-lg md:text-xl tracking-widest font-light">
                DEL
                <span className="text-landing-gold">SOL</span>
                PRIMEHOMES
              </span>
            </Link>

            {/* Right Side - Emma CTA + Language Selector */}
            <div className="flex items-center gap-4">
              {/* Emma CTA - Desktop */}
              <Button
                onClick={() => setIsEmmaOpen(true)}
                className="hidden md:flex bg-landing-navy hover:bg-landing-navy/90 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {t.headerCta}
              </Button>

              {/* Language Selector */}
              <RetargetingLanguageSelector currentLang={language} scrolled={true} />
            </div>
          </div>
        </div>
      </header>

      {/* Page Sections - Matching Landing Page Order */}
      <RetargetingHero language={language} />
      <RetargetingAutoplayVideo language={language} />
      <RetargetingTestimonials language={language} />
      <RetargetingEmmaSection language={language} />
      <RetargetingProjects language={language} />
      <RetargetingForm language={language} />
      <RetargetingFooter language={language} />

      {/* Emma Chat Modal */}
      <EmmaChat 
        isOpen={isEmmaOpen} 
        onClose={() => setIsEmmaOpen(false)}
        language={language}
      />
    </div>
  );
};

export default RetargetingLanding;
