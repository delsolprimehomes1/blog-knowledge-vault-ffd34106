import { motion } from "framer-motion";

export const RetargetingVisualContext = () => {
  return (
    <section className="bg-[#faf9f7] py-20 md:py-24 lg:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Image placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="order-2 md:order-1"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 mx-auto mb-4 bg-slate-300/50 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">Research & Documentation</p>
              </div>
            </div>
          </motion.div>
          
          {/* Statement */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-1 md:order-2 text-center md:text-left"
          >
            <p className="font-serif italic text-2xl md:text-[28px] text-[#1a1f2e] leading-relaxed">
              "We start with explanation, not listings."
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
