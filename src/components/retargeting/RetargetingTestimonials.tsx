import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

interface RetargetingTestimonialsProps {
  language?: string;
}

const flagMap: Record<string, string> = {
  "United Kingdom": "/flags/gb.svg",
  "Vereinigtes Königreich": "/flags/gb.svg",
  "Verenigd Koninkrijk": "/flags/gb.svg",
  "Royaume-Uni": "/flags/gb.svg",
  "Reino Unido": "/flags/gb.svg",
  "Wielka Brytania": "/flags/gb.svg",
  "Storbritannien": "/flags/gb.svg",
  "Egyesült Királyság": "/flags/gb.svg",
  "Iso-Britannia": "/flags/gb.svg",
  "Storbritannia": "/flags/gb.svg",
  "Netherlands": "/flags/nl.svg",
  "Niederlande": "/flags/nl.svg",
  "Nederland": "/flags/nl.svg",
  "Pays-Bas": "/flags/nl.svg",
  "Países Bajos": "/flags/nl.svg",
  "Holandia": "/flags/nl.svg",
  "Nederländerna": "/flags/nl.svg",
  "Holland": "/flags/nl.svg",
  "Alankomaat": "/flags/nl.svg",
  "Germany": "/flags/de.svg",
  "Deutschland": "/flags/de.svg",
  "Duitsland": "/flags/de.svg",
  "Allemagne": "/flags/de.svg",
  "Alemania": "/flags/de.svg",
  "Niemcy": "/flags/de.svg",
  "Tyskland": "/flags/de.svg",
  "Németország": "/flags/de.svg",
  "Saksa": "/flags/de.svg",
};

const TestimonialCard = ({ testimonial, index }: { testimonial: { quote: string; author: string; country: string; headline?: string }; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="h-full bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl border border-gray-100 hover:border-landing-gold/20 transition-all duration-300 hover:scale-[1.02]"
  >
    {/* Flag */}
    <div className="flex items-center gap-3 mb-4">
      <img
        src={flagMap[testimonial.country] || "/flags/gb.svg"}
        alt={testimonial.country}
        className="w-8 h-5 object-cover rounded shadow-sm"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      <span className="text-landing-navy/50 text-sm">{testimonial.country}</span>
    </div>

    {/* Headline */}
    {testimonial.headline && (
      <h3 className="font-serif text-lg md:text-xl text-landing-navy mb-3 leading-snug">
        "{testimonial.headline}"
      </h3>
    )}

    {/* Quote */}
    <p className="text-landing-navy/70 text-sm md:text-base leading-relaxed mb-4">
      {testimonial.quote}
    </p>

    {/* Author */}
    <p className="font-medium text-landing-navy text-sm">
      — {testimonial.author}
    </p>
  </motion.div>
);

export const RetargetingTestimonials = ({ language = "en" }: RetargetingTestimonialsProps) => {
  const t = getRetargetingTranslations(language);

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
          <p className="text-landing-gold text-sm tracking-widest uppercase mb-3">
            {t.testimonialSoftLine || "Real stories"}
          </p>
          <h2 className="text-2xl md:text-[32px] lg:text-[36px] font-serif text-landing-navy mb-4">
            {t.testimonialTitle}
          </h2>
          <p className="text-landing-navy/60 text-base md:text-lg max-w-2xl mx-auto">
            {t.testimonialSubtitle}
          </p>
        </motion.div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={16}
            slidesPerView={1.1}
            centeredSlides
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="pb-10"
          >
            {t.testimonials.map((testimonial, index) => (
              <SwiperSlide key={testimonial.author}>
                <TestimonialCard testimonial={testimonial} index={index} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 md:gap-8">
          {t.testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.author} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
