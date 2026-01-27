import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "We weren't ready to view properties. We just wanted to understand how the process works in Spain. Del Sol explained everything clearly, with no pressure to move forward.",
    name: "Michael & Sarah",
    country: "United Kingdom",
    flag: "/flags/gb.svg",
  },
  {
    quote: "I appreciated that they didn't start with listings. They started with questions about what we actually needed to know. That built trust immediately.",
    name: "Erik",
    country: "Netherlands",
    flag: "/flags/nl.svg",
  },
  {
    quote: "After speaking with several agencies who just wanted to show us properties, this approach felt completely different. Education first, decisions later.",
    name: "Thomas & Anna",
    country: "Germany",
    flag: "/flags/de.svg",
  },
];

export const RetargetingTestimonials = () => {
  return (
    <section className="bg-white py-20 md:py-24 lg:py-28">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-16"
        >
          <h2 className="text-2xl md:text-[32px] lg:text-[36px] font-medium text-[#1a1f2e] mb-4">
            Why people start with us — before looking at property
          </h2>
          <p className="text-[#6b7280] text-base md:text-lg max-w-2xl mx-auto">
            Experiences from people who wanted clarity before taking the next step.
          </p>
        </motion.div>
        
        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg p-6 md:p-8 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-slate-100"
            >
              {/* Quote mark */}
              <div className="text-[#c9a962] text-5xl font-serif leading-none mb-4">"</div>
              
              {/* Quote text */}
              <p className="text-[#1a1f2e] text-base leading-relaxed mb-6">
                {testimonial.quote}
              </p>
              
              {/* Attribution */}
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.flag}
                  alt={testimonial.country}
                  className="w-6 h-4 object-cover rounded-sm"
                />
                <div>
                  <p className="font-medium text-[#1a1f2e] text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-[#6b7280] text-sm">
                    {testimonial.country}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
