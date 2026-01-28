import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

interface RetargetingEmmaSectionProps {
  language?: string;
}

export const RetargetingEmmaSection = ({ language = "en" }: RetargetingEmmaSectionProps) => {
  const t = getRetargetingTranslations(language);

  const handleEmmaClick = () => {
    window.dispatchEvent(new CustomEvent("openEmmaChat"));
  };

  return (
    <section className="relative bg-gradient-to-br from-white via-gray-50/30 to-white py-20 md:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-10 left-20 w-64 h-64 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-20 w-80 h-80 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl border border-white/50 text-center"
        >
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-landing-gold/20 to-landing-gold/5 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-landing-gold" />
          </div>

          {/* Statement */}
          <h2 className="font-serif text-2xl md:text-[32px] lg:text-[36px] text-landing-navy leading-snug mb-4">
            {t.emmaStatement}
          </h2>

          {/* Explanation */}
          <p className="text-landing-navy/60 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {t.emmaExplanation}
          </p>

          {/* CTA Button */}
          <Button
            onClick={handleEmmaClick}
            className="bg-landing-navy hover:bg-landing-navy/90 text-white px-8 py-6 text-base font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t.emmaCta}
          </Button>

          {/* Microcopy */}
          <p className="mt-4 text-landing-navy/40 text-sm">
            {t.emmaMicrocopy}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
