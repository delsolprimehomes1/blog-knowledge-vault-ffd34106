import { motion } from "framer-motion";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

interface RetargetingPositioningProps {
  language?: string;
}

export const RetargetingPositioning = ({ language = "en" }: RetargetingPositioningProps) => {
  const t = getRetargetingTranslations(language);

  return (
    <section className="relative bg-landing-navy py-24 md:py-28 lg:py-32 overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-landing-navy via-[#1e2838] to-landing-navy" />
      
      {/* Decorative blur circles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-landing-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-landing-gold/3 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        <p 
          className="font-serif text-[28px] md:text-[36px] lg:text-[44px] text-white leading-snug mb-8 whitespace-pre-line"
          style={{ 
            textShadow: "0 0 40px rgba(196, 160, 83, 0.1)" 
          }}
        >
          "{t.positioningMain}"
        </p>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/90 font-light"
        >
          {t.positioningSupport}
        </motion.p>

        {/* Decorative gold line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-24 h-0.5 bg-gradient-to-r from-transparent via-landing-gold to-transparent mx-auto mt-10"
        />
      </motion.div>
    </section>
  );
};
