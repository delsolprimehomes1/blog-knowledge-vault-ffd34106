import { motion } from "framer-motion";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

interface RetargetingIntroProps {
  language?: string;
}

export const RetargetingIntro = ({ language = "en" }: RetargetingIntroProps) => {
  const t = getRetargetingTranslations(language);

  return (
    <section className="relative bg-white py-16 md:py-20 overflow-hidden">
      {/* Subtle decorative blur circles */}
      <div className="absolute top-0 left-1/4 w-48 h-48 bg-landing-gold/3 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-landing-navy/3 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-[700px] mx-auto px-6 text-center"
      >
        <p className="text-lg md:text-xl lg:text-[22px] text-landing-navy leading-relaxed font-normal">
          {t.introText}
        </p>
      </motion.div>
    </section>
  );
};
