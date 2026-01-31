import React from 'react';
import { ElfsightGoogleReviews } from '@/components/reviews/ElfsightGoogleReviews';

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

interface TestimonialsSectionProps {
    language: string;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ language }) => {
    // Get content for current language, fallback to English
    const t = translations[language]?.testimonials || translations['en'].testimonials;

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

                {/* Elfsight Google Reviews Widget */}
                <ElfsightGoogleReviews 
                    language={language} 
                    className="max-w-5xl mx-auto"
                />
            </div>
        </section>
    );
};

export default TestimonialsSection;
