import { motion } from "framer-motion";

export const RetargetingPositioning = () => {
  return (
    <section className="bg-[#1a1f2e] py-24 md:py-28 lg:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto px-6 text-center"
      >
        <p className="font-serif text-[28px] md:text-[36px] lg:text-[40px] text-white leading-snug mb-8">
          "We don't begin with properties.
          <br />
          We begin with understanding."
        </p>
        
        <p className="text-lg md:text-xl text-white/90 font-light">
          Locations, timing, legal context and lifestyle — explained first.
        </p>
      </motion.div>
    </section>
  );
};
