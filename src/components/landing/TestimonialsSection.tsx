import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// Import translations just in case we need a fallback, 
// but primarily we should expect them to be passed or loaded via a hook context if available.
// However, the request says to add to translation files. 
// We'll trust the LandingLayout or a hook to provide the translations or load them here.
// Assuming we fetch translations based on the language prop.

import en from '../../translations/landing/en.json';
import nl from '../../translations/landing/nl.json';
import de from '../../translations/landing/de.json';
import fr from '../../translations/landing/fr.json';
import fi from '../../translations/landing/fi.json';
import pl from '../../translations/landing/pl.json';
import da from '../../translations/landing/da.json';
import hu from '../../translations/landing/hu.json';
import sv from '../../translations/landing/sv.json';
import no from '../../translations/landing/no.json';

const translations: Record<string, any> = {
    en, nl, de, fr, fi, pl, da, hu, sv, no
};

interface Testimonial {
    country: string;
    flagCode: string; // 'nl', 'fr', 'sv' - ensuring we map correctly
    headline: string;
    body: string;
    name: string;
}

interface TestimonialsSectionProps {
    language: string;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ language }) => {
    // Get content for current language, fallback to English
    const t = translations[language]?.testimonials || translations['en'].testimonials;

    // Mapping the raw translation reviews to include the flag code for the image
    // The translation reviews array order is fixed: 0=Netherlands, 1=France, 2=Sweden
    // We need to ensure we map them correctly.

    const reviews: Testimonial[] = useMemo(() => {
        const rawReviews = t.reviews || [];
        // Ensure we have 3 items, fallback to English if missing
        const safeReviews = rawReviews.length === 3 ? rawReviews : translations['en'].testimonials.reviews;

        return [
            { ...safeReviews[0], flagCode: 'nl' },
            { ...safeReviews[1], flagCode: 'fr' },
            { ...safeReviews[2], flagCode: 'se' } // Sweden is 'se' or 'sv' usually. Filename is se.svg.
        ];
    }, [t]);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="font-playfair font-bold text-4xl text-[#1A2332] mb-4">
                        {t.heading}
                    </h2>
                    <p className="font-lato text-xl text-gray-500">
                        {t.subheading}
                    </p>
                </div>

                {/* Mobile View: Swiper Carousel */}
                <div className="md:hidden">
                    <Swiper
                        modules={[Pagination, Autoplay]}
                        spaceBetween={20}
                        slidesPerView={1}
                        loop={true}
                        autoplay={{
                            delay: 5000,
                            disableOnInteraction: false,
                        }}
                        pagination={{
                            clickable: true,
                            dynamicBullets: true,
                            bulletActiveClass: 'bg-[#C4A053] opacity-100',
                            bulletClass: 'swiper-pagination-bullet bg-gray-300 opacity-100' // Custom styling needed via global css often better
                        }}
                        className="pb-12"
                    >
                        {reviews.map((review, index) => (
                            <SwiperSlide key={`mobile-review-${index}`}>
                                <TestimonialCard review={review} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    {/* Custom styles for swiper bullets if not working directly via classes */}
                    <style>{`
            .swiper-pagination-bullet-active {
              background-color: #C4A053 !important;
            }
          `}</style>
                </div>

                {/* Desktop View: Grid */}
                <div className="hidden md:grid grid-cols-3 gap-8">
                    {reviews.map((review, index) => (
                        <motion.div
                            key={`desktop-review-${index}`}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                                duration: 0.6,
                                delay: index * 0.1,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                            variants={cardVariants}
                            className="h-full"
                        >
                            <TestimonialCard review={review} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const TestimonialCard: React.FC<{ review: Testimonial }> = ({ review }) => {
    return (
        <div className="bg-white rounded-2xl shadow-lg p-8 h-full border border-gray-100 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group">
            <div className="flex flex-col items-center text-center h-full">
                {/* Flag Icon */}
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 mb-6 shadow-sm">
                    <img
                        src={`/flags/${review.flagCode}.svg`}
                        alt={`${review.country} flag`}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Headline */}
                <h3 className="font-playfair text-2xl font-bold text-[#1A2332] mb-4 leading-tight group-hover:text-[#C4A053] transition-colors">
                    "{review.headline}"
                </h3>

                {/* Body */}
                <p className="font-lato text-gray-500 mb-8 flex-grow leading-relaxed">
                    {review.body}
                </p>

                {/* Name */}
                <div className="font-lato font-bold text-[#1A2332] text-base border-t border-gray-100 pt-4 w-full">
                    {review.name}
                </div>
            </div>
        </div>
    );
};

export default TestimonialsSection;
