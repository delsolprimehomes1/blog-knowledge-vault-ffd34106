import { motion } from "framer-motion";

export const RetargetingIntro = () => {
  return (
    <section className="bg-white py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-[700px] mx-auto px-6 text-center"
      >
        <p className="text-lg md:text-xl text-[#1a1f2e] leading-relaxed font-normal">
          In one minute, you'll see how we help people understand the market before making any decisions.
        </p>
      </motion.div>
    </section>
  );
};
