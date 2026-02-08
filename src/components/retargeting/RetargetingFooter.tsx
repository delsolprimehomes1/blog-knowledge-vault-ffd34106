import { Link } from "react-router-dom";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import { RetargetingLanguageSelector } from "./RetargetingLanguageSelector";

interface RetargetingFooterProps {
  language?: string;
}

export const RetargetingFooter = ({ language = "en" }: RetargetingFooterProps) => {
  const t = getRetargetingTranslations(language);

  return (
    <footer className="relative bg-gradient-to-br from-[#faf9f7] via-white to-[#faf9f7] py-12 md:py-16 overflow-hidden">
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-landing-gold/30 to-transparent" />
      
      {/* Decorative blur circles */}
      <div className="absolute top-10 right-20 w-40 h-40 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-20 w-32 h-32 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to={`/${language}`} className="inline-block">
            <img 
              src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
              alt="DelSolPrimeHomes"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-landing-navy/50 hover:text-landing-navy transition-colors duration-200 relative group"
            >
              {t.footerPrivacy}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-landing-gold group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              to="/terms"
              className="text-landing-navy/50 hover:text-landing-navy transition-colors duration-200 relative group"
            >
              {t.footerTerms}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-landing-gold group-hover:w-full transition-all duration-300" />
            </Link>
          </div>

          {/* Language Selector */}
          <div className="hidden md:block">
            <RetargetingLanguageSelector currentLang={language} scrolled={true} />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200/50 text-center">
          <p className="text-landing-navy/40 text-sm">
            {t.footerCopyright}
          </p>
        </div>
      </div>
    </footer>
  );
};
