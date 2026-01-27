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
          <h2 className="text-2xl md:text-[32px] lg:text-[36px] font-medium text-landing-navy mb-4">
            Why people start with us — before looking at property
          </h2>
          <p className="text-landing-navy/60 text-base md:text-lg max-w-2xl mx-auto">
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
              className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl border border-gray-100 hover:border-landing-gold/20 transition-all duration-300 hover:scale-[1.02]"
            >
              {/* Quote mark with gold accent */}
              <div className="text-landing-gold text-5xl font-serif leading-none mb-4 opacity-80 group-hover:opacity-100 transition-opacity">"</div>

              {/* Quote text */}
              <p className="text-landing-navy text-base leading-relaxed mb-6">
                {testimonial.quote}
              </p>

              {/* Attribution */}
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.flag}
                  alt={testimonial.country}
                  className="w-8 h-5 object-cover rounded shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-8 h-5 bg-gray-200 rounded';
                    target.parentNode?.insertBefore(fallback, target);
                  }}
                />
                <div>
                  <p className="font-medium text-landing-navy text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-landing-navy/60 text-sm">
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
