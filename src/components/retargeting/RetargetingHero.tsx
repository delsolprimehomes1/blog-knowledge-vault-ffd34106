import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RetargetingHero = () => {
  return (
    <section className="min-h-[80vh] md:min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-stone-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-[900px] mx-auto px-6 text-center"
      >
        <h1 className="font-serif text-[32px] md:text-[48px] lg:text-[56px] leading-tight text-[#1a1f2e] mb-6">
          Understand the Costa del Sol property market — calmly and independently.
        </h1>
        
        <p className="text-lg md:text-xl text-[#6b7280] font-light mb-10 max-w-[700px] mx-auto leading-relaxed">
          Clear explanations, structured insight and human expertise — before you speak to anyone.
        </p>
        
        <Button
          variant="default"
          size="lg"
          className="bg-[#c9a962] hover:bg-[#b8994f] text-white px-8 py-6 text-base font-medium rounded-md transition-colors duration-200"
          onClick={() => {
            // Video modal will be added in Phase 2
            console.log("Video modal - Phase 2");
          }}
        >
          <Play className="w-4 h-4 mr-2" />
          Watch the 60-second overview
        </Button>
      </motion.div>
    </section>
  );
};
