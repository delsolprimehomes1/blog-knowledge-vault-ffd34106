import { motion } from "framer-motion";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import { ElfsightGoogleReviews } from "@/components/reviews/ElfsightGoogleReviews";

interface RetargetingTestimonialsProps {
  language?: string;
}

export const RetargetingTestimonials = ({ language = "en" }: RetargetingTestimonialsProps) => {
  const t = getRetargetingTranslations(language);

  return (
    <section className="relative bg-gradient-to-br from-white via-gray-50/30 to-white py-20 md:py-24 lg:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-10 right-20 w-80 h-80 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-20 w-64 h-64 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-16"
        >
          <p className="text-landing-gold text-sm tracking-widest uppercase mb-3">
            {t.testimonialSoftLine || "Real stories"}
          </p>
          <h2 className="text-2xl md:text-[32px] lg:text-[36px] font-serif text-landing-navy mb-4">
            {t.testimonialTitle}
          </h2>
          <p className="text-landing-navy/60 text-base md:text-lg max-w-2xl mx-auto">
            {t.testimonialSubtitle}
          </p>
        </motion.div>

        {/* Elfsight Google Reviews Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <ElfsightGoogleReviews 
            language={language} 
            className="max-w-5xl mx-auto"
          />
        </motion.div>
      </div>
    </section>
  );
};
