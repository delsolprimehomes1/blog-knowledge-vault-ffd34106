import { motion } from "framer-motion";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

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
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 via-slate-50 to-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {/* Modern abstract visual */}
                  <div className="relative w-full h-full flex items-center justify-center p-8">
                    {/* Decorative elements representing research/documents */}
                    <div className="absolute top-6 left-6 w-32 h-40 bg-white rounded-lg shadow-lg transform -rotate-6 border border-gray-100">
                      <div className="p-3 space-y-2">
                        <div className="h-2 bg-landing-navy/20 rounded w-3/4" />
                        <div className="h-2 bg-landing-navy/10 rounded w-full" />
                        <div className="h-2 bg-landing-navy/10 rounded w-2/3" />
                        <div className="h-2 bg-landing-gold/30 rounded w-1/2 mt-4" />
                      </div>
                    </div>
                    <div className="absolute top-10 right-8 w-28 h-36 bg-white rounded-lg shadow-lg transform rotate-3 border border-gray-100">
                      <div className="p-3 space-y-2">
                        <div className="h-2 bg-landing-navy/20 rounded w-2/3" />
                        <div className="h-2 bg-landing-navy/10 rounded w-full" />
                        <div className="h-2 bg-landing-navy/10 rounded w-3/4" />
                      </div>
                    </div>
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-36 h-28 bg-white rounded-lg shadow-xl transform border border-gray-100 z-10">
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-landing-gold/40 rounded w-1/2" />
                        <div className="h-2 bg-landing-navy/10 rounded w-full" />
                        <div className="h-2 bg-landing-navy/10 rounded w-2/3" />
                        <div className="flex gap-1 mt-2">
                          <div className="w-4 h-4 bg-landing-gold/20 rounded" />
                          <div className="w-4 h-4 bg-landing-navy/10 rounded" />
                          <div className="w-4 h-4 bg-landing-navy/10 rounded" />
                        </div>
                      </div>
                    </div>
                    {/* Central icon */}
                    <div className="absolute bottom-6 right-12 w-12 h-12 bg-landing-gold/10 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-landing-gold"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
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
