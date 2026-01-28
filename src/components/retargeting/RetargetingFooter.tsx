import { Link } from "react-router-dom";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

interface RetargetingFooterProps {
  language?: string;
}

export const RetargetingFooter = ({ language = "en" }: RetargetingFooterProps) => {
  const t = getRetargetingTranslations(language);

  return (
    <footer className="relative bg-landing-navy py-12 md:py-16 overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#151b27] to-landing-navy" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-landing-gold/20 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-6">
            <span className="text-white text-xl md:text-2xl tracking-widest font-light">
              DEL
              <span className="text-landing-gold">SOL</span>
              PRIMEHOMES
            </span>
          </div>

          {/* Copyright */}
          <p className="text-white/60 text-sm mb-4">
            {t.footerCopyright}
          </p>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-white/50 hover:text-white/90 transition-colors duration-200 relative group"
            >
              {t.footerPrivacy}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-landing-gold group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              to="/terms"
              className="text-white/50 hover:text-white/90 transition-colors duration-200 relative group"
            >
              {t.footerTerms}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-landing-gold group-hover:w-full transition-all duration-300" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
