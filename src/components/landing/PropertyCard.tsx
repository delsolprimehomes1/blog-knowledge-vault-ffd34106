import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getHighResImageUrl } from '@/lib/imageUrlTransformer';

interface PropertyCardProps {
    property: {
        id: string;
        category: 'apartment' | 'villa';
        location: string;
        beds_min: number;
        beds_max?: number;
        baths: number;
        size_sqm: number;
        price_eur: number;
        images: string[];
        description: string;
    };
    lang: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, lang }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat(lang, {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    const formatBeds = () => {
        if (property.beds_max && property.beds_max !== property.beds_min) {
            return `${property.beds_min}-${property.beds_max}`;
        }
        return `${property.beds_min}`;
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) =>
            prev === property.images.length - 1 ? 0 : prev + 1
        );
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) =>
            prev === 0 ? property.images.length - 1 : prev - 1
        );
    };

    // COMPLETE TRANSLATION LABELS - ALL 10 LANGUAGES
    const labels = {
        en: {
            from: 'From',
            beds: 'Beds',
            baths: 'Baths',
            moreInfo: 'More Info',
            apartmentTitle: 'New Luxury Apartments',
            villaTitle: 'Exclusive Villas'
        },
        nl: {
            from: 'Vanaf',
            beds: 'Slaapkamers',
            baths: 'Badkamers',
            moreInfo: 'Meer Info',
            apartmentTitle: 'Nieuwe Luxe Appartementen',
            villaTitle: 'Exclusieve Villa\'s'
        },
        fr: {
            from: 'À partir de',
            beds: 'Chambres',
            baths: 'Salles de bain',
            moreInfo: 'Plus d\'info',
            apartmentTitle: 'Nouveaux Appartements de Luxe',
            villaTitle: 'Villas Exclusives'
        },
        de: {
            from: 'Ab',
            beds: 'Schlafzimmer',
            baths: 'Badezimmer',
            moreInfo: 'Mehr Info',
            apartmentTitle: 'Neue Luxuswohnungen',
            villaTitle: 'Exklusive Villen'
        },
        pl: {
            from: 'Od',
            beds: 'Sypialnie',
            baths: 'Łazienki',
            moreInfo: 'Więcej Info',
            apartmentTitle: 'Nowe Luksusowe Apartamenty',
            villaTitle: 'Ekskluzywne Wille'
        },
        sv: {
            from: 'Från',
            beds: 'Sovrum',
            baths: 'Badrum',
            moreInfo: 'Mer Info',
            apartmentTitle: 'Nya Lyxlägenheter',
            villaTitle: 'Exklusiva Villor'
        },
        da: {
            from: 'Fra',
            beds: 'Soveværelser',
            baths: 'Badeværelser',
            moreInfo: 'Mere Info',
            apartmentTitle: 'Nye Luksuslejligheder',
            villaTitle: 'Eksklusive Villaer'
        },
        fi: {
            from: 'Alkaen',
            beds: 'Makuuhuoneet',
            baths: 'Kylpyhuoneet',
            moreInfo: 'Lisätietoja',
            apartmentTitle: 'Uudet Luksushuoneistot',
            villaTitle: 'Yksinomaiset Huvilat'
        },
        hu: {
            from: 'Től',
            beds: 'Hálószobák',
            baths: 'Fürdőszobák',
            moreInfo: 'Több Info',
            apartmentTitle: 'Új Luxus Apartmanok',
            villaTitle: 'Exkluzív Villák'
        },
        no: {
            from: 'Fra',
            beds: 'Soverom',
            baths: 'Baderom',
            moreInfo: 'Mer Info',
            apartmentTitle: 'Nye Luksusleiligheter',
            villaTitle: 'Eksklusive Villaer'
        }
    };

    const currentLabels = labels[lang as keyof typeof labels] || labels.en;

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col">

            {/* IMAGE CAROUSEL */}
            <div className="relative h-64 overflow-hidden group">
                {/* Current Image */}
                <img
                    src={getHighResImageUrl(property.images[currentImageIndex], 'card')}
                    alt={`Property in ${property.location}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const img = e.currentTarget;
                        // First try w400 fallback
                        const fallbackUrl = img.src.replace(/\/w\d+\//g, '/w400/');
                        if (img.src !== fallbackUrl) {
                            img.src = fallbackUrl;
                        } else {
                            // If w400 also fails, use placeholder
                            img.src = '/images/properties/placeholder.jpg';
                        }
                    }}
                />

                {/* Image Counter */}
                {property.images.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {currentImageIndex + 1} / {property.images.length}
                    </div>
                )}

                {/* Navigation Arrows */}
                {property.images.length > 1 && (
                    <>
                        {/* Previous Arrow */}
                        <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-800" />
                        </button>

                        {/* Next Arrow */}
                        <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-800" />
                        </button>
                    </>
                )}

                {/* Dots Indicator */}
                {property.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {property.images.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(index);
                                }}
                                className={`h-2 rounded-full transition-all ${index === currentImageIndex
                                        ? 'bg-white w-6'
                                        : 'bg-white/60 hover:bg-white/80 w-2'
                                    }`}
                                aria-label={`Go to image ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* CONTENT */}
            <div className="p-6 flex-1 flex flex-col">

                {/* GENERIC TITLE - NO PROPERTY NAME - TRANSLATED */}
                <h3 className="text-2xl font-serif text-gray-900 mb-2">
                    {property.category === 'apartment'
                        ? currentLabels.apartmentTitle
                        : currentLabels.villaTitle
                    }
                </h3>

                {/* Location */}
                <p className="text-gray-600 mb-4 flex items-center gap-2">
                    <span className="text-primary">📍</span>
                    {property.location}
                </p>

                {/* Description */}
                <p className="text-sm text-gray-700 mb-4 line-clamp-3 flex-1">
                    {property.description}
                </p>

                {/* Details - TRANSLATED LABELS */}
                <div className="flex justify-between text-sm text-gray-700 mb-4 pb-4 border-b">
                    <span>{formatBeds()} {currentLabels.beds}</span>
                    <span>{property.baths} {currentLabels.baths}</span>
                    <span>{property.size_sqm}m²</span>
                </div>

                {/* Price - TRANSLATED "FROM" */}
                <p className="text-2xl font-semibold text-primary mb-4">
                    {currentLabels.from} {formatPrice(property.price_eur)}
                </p>

                {/* CTA - TRANSLATED */}
                <Button
                    asChild
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                    <a href={`/${lang}/optin?property=${property.id}`}>
                        {currentLabels.moreInfo}
                    </a>
                </Button>
            </div>
        </div>
    );
};

export default PropertyCard;
