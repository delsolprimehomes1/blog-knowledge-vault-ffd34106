import { motion } from "framer-motion";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import retargetingVisualImage from "@/assets/retargeting-visual.jpg";

interface RetargetingVisualContextProps {
  language?: string;
}

export const RetargetingVisualContext = ({ language = "en" }: RetargetingVisualContextProps) => {
  const t = getRetargetingTranslations(language);

  return (
    <section className="relative bg-gradient-to-br from-[#faf9f7] via-white to-[#faf9f7] py-20 md:py-24 lg:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Image with glassmorphism container */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="order-2 md:order-1"
          >
            <div className="relative">
              {/* Glassmorphism container */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/50">
                <div className="aspect-[4/3] rounded-xl overflow-hidden">
                  <img 
                    src={retargetingVisualImage}
                    alt={t.visualImageAlt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/50">
                <span className="text-landing-navy/70 text-sm font-medium">{t.visualBadge}</span>
              </div>
            </div>
          </motion.div>

          {/* Statement with gold accent */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-1 md:order-2 text-center md:text-left"
          >
            {/* Gold accent bar */}
            <div className="hidden md:block w-12 h-1 bg-gradient-to-r from-landing-gold to-landing-gold/50 rounded-full mb-6" />
            
            <p className="font-serif italic text-2xl md:text-[28px] lg:text-[32px] text-landing-navy leading-relaxed">
              "{t.visualStatement}"
            </p>
            
            <p className="mt-6 text-landing-navy/60 text-base md:text-lg leading-relaxed">
              {t.visualSupport}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
