import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetargetingVideoModal } from "./RetargetingVideoModal";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import heroDesktop from "@/assets/hero-landing-desktop.jpg";
import heroMobile from "@/assets/hero-landing-mobile.jpg";

interface RetargetingHeroProps {
  language?: string;
}

export const RetargetingHero = ({ language = "en" }: RetargetingHeroProps) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const t = getRetargetingTranslations(language);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Ken Burns animation */}
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 20, ease: "easeOut" }}
        className="absolute inset-0"
      >
        {/* Desktop Image */}
        <img
          src={heroDesktop}
          alt="Costa del Sol luxury properties"
          className="hidden md:block absolute inset-0 w-full h-full object-cover"
        />
        {/* Mobile Image */}
        <img
          src={heroMobile}
          alt="Costa del Sol luxury properties"
          className="md:hidden absolute inset-0 w-full h-full object-cover object-top"
        />
      </motion.div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-landing-navy/50 mix-blend-multiply" />
      
      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-landing-navy/80 via-transparent to-landing-navy/30" />

      {/* Decorative blur circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-landing-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-[900px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <h1 
            className="font-serif text-[32px] md:text-[48px] lg:text-[56px] leading-tight text-white mb-6"
            style={{ 
              textShadow: "0 0 10px rgb(0 0 0), 0 0 30px rgb(0 0 0), 0 0 60px rgb(0 0 0 / 80%), 0 4px 4px rgb(0 0 0)" 
            }}
          >
            {t.heroH1}
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <p 
            className="text-lg md:text-xl text-white/90 font-light mb-10 max-w-[700px] mx-auto leading-relaxed"
            style={{ 
              textShadow: "0 2px 10px rgb(0 0 0 / 50%)" 
            }}
          >
            {t.heroSubheadline}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          <Button
            variant="default"
            size="lg"
            className="bg-gradient-to-r from-landing-gold to-[#d4b563] hover:from-[#b8994f] hover:to-landing-gold text-white px-8 py-6 text-base font-medium rounded-xl transition-all duration-300 shadow-[0_10px_40px_rgba(196,160,83,0.3)] hover:shadow-[0_15px_50px_rgba(196,160,83,0.4)] hover:scale-[1.02]"
            onClick={() => setIsVideoOpen(true)}
          >
            <Play className="w-4 h-4 mr-2" />
            {t.heroButton}
          </Button>
        </motion.div>

        {/* Video Modal */}
        <RetargetingVideoModal
          isOpen={isVideoOpen}
          onClose={() => setIsVideoOpen(false)}
          videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
        />
      </div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToContent}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 hover:text-white transition-colors cursor-pointer"
        aria-label="Scroll to content"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={32} />
        </motion.div>
      </motion.button>
    </section>
  );
};
