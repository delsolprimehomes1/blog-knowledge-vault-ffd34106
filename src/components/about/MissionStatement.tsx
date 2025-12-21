import { motion } from "framer-motion";
import { Target } from "lucide-react";

interface MissionStatementProps {
  mission: string;
  speakableSummary: string;
}

export const MissionStatement = ({ mission, speakableSummary }: MissionStatementProps) => {
  return (
    <section className="py-20 bg-white" aria-labelledby="mission-heading">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-prime-gold/10 mb-6">
              <Target className="w-8 h-8 text-prime-gold" />
            </div>
            <h2 id="mission-heading" className="font-serif text-3xl md:text-4xl font-bold text-prime-900 mb-4">
              Our Mission
            </h2>
          </div>

          {/* Mission statement - prominent for AI parsing */}
          <div className="mission-statement bg-gradient-to-r from-prime-50 to-prime-100/50 border-l-4 border-prime-gold rounded-r-xl p-8 md:p-10 mb-10">
            <p className="text-lg md:text-xl text-prime-800 leading-relaxed font-medium italic">
              "{mission}"
            </p>
          </div>

          {/* Speakable summary - optimized for voice assistants */}
          <div className="speakable-summary bg-slate-50 rounded-xl p-6 md:p-8">
            <p className="text-sm uppercase tracking-wider text-prime-gold font-semibold mb-3">
              About Us
            </p>
            <p className="text-base md:text-lg text-slate-700 leading-relaxed">
              {speakableSummary}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
