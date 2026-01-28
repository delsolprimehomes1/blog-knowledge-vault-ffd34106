import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  RetargetingHero,
  RetargetingIntro,
  RetargetingVisualContext,
  RetargetingTestimonials,
  RetargetingPositioning,
  RetargetingProjects,
  RetargetingForm,
  RetargetingFooter,
} from "@/components/retargeting";

const RetargetingLanding = () => {
  const [scrolled, setScrolled] = useState(false);
  const { lang } = useParams<{ lang: string }>();
  const language = lang || "en";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Glassmorphism Header - Fixed */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100/50"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto py-4 md:py-5 px-6">
          <div className="flex items-center justify-center">
            <Link to={`/${language}`} className="inline-block">
              <span
                className={`text-lg md:text-xl tracking-widest font-light transition-colors duration-300 ${
                  scrolled ? "text-landing-navy" : "text-white"
                }`}
                style={
                  !scrolled
                    ? { textShadow: "0 2px 10px rgba(0,0,0,0.3)" }
                    : undefined
                }
              >
                DEL
                <span className="text-landing-gold">SOL</span>
                PRIMEHOMES
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Page Sections */}
      <RetargetingHero language={language} />
      <RetargetingIntro language={language} />
      <RetargetingVisualContext language={language} />
      <RetargetingTestimonials language={language} />
      <RetargetingPositioning language={language} />
      <RetargetingProjects language={language} />
      <RetargetingForm language={language} />
      <RetargetingFooter language={language} />
    </div>
  );
};

export default RetargetingLanding;
