import React from 'react';
import { useParams } from 'react-router-dom';
import PropertyCard, { Property } from './PropertyCard';
import { LanguageCode } from '@/utils/landing/languageDetection';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';

interface PropertyCarouselProps {
    language: LanguageCode;
    translations: any;
    onPropertySelect?: (id: string, type: 'apartment' | 'villa') => void;
}

// --- REAL PROPERTIES DATA ---

const apartments: Property[] = [
    {
        id: "morasol",
        refNumber: "R5215237",
        name: "Morasol",
        location: "Manilva",
        description: "Exceptionally spacious apartments in Manilva, offering outstanding value for money and comfortable modern living on the Costa del Sol.",
        price: 351520,
        beds: 2,
        maxBeds: 3,
        baths: 2,
        size: 95,
        image: "/images/properties/morasol-main.jpg",
        imageNumbers: [1, 6, 7],
        category: "apartment"
    },
    {
        id: "360",
        refNumber: "R5133166",
        name: "360",
        location: "Mijas",
        description: "New resort-style apartments in Mijas, offering beautiful sea views and high-quality amenities in a prime Costa del Sol location.",
        price: 400000,
        beds: 1,
        maxBeds: 4,
        baths: 2,
        size: 105,
        image: "/images/properties/360-main.jpg",
        imageNumbers: [2, 5, 7],
        category: "apartment"
    },
    {
        id: "alura-living",
        refNumber: "R5083114",
        name: "Alura Living",
        location: "Casares Costa",
        description: "Located in Casares Costa, this resort-style development offers spacious apartments within walking distance of the beach, surrounded by golf courses and high-end communal amenities.",
        price: 442000,
        beds: 2,
        maxBeds: 3,
        baths: 2,
        size: 110,
        image: "/images/properties/alura-living-main.jpg",
        imageNumbers: [1, 5, 12],
        category: "apartment"
    },
    {
        id: "evoque",
        refNumber: "R5171560",
        name: "Evoque",
        location: "El Higuerón, Fuengirola",
        description: "Located in El Higuerón, Fuengirola, this modern residential development offers elevated sea views, spacious terraces, and resort-style wellness amenities in a prime Costa del Sol setting.",
        price: 499000,
        beds: 1,
        maxBeds: 3,
        baths: 2,
        size: 120,
        image: "/images/properties/evoque-main.jpg",
        imageNumbers: [1, 6, 15],
        category: "apartment"
    },
    {
        id: "one-estepona",
        refNumber: "R5152789",
        name: "One Estepona",
        location: "Estepona",
        description: "Located in Estepona, this contemporary residential development offers elegant Mediterranean architecture, generous terraces, and high-quality communal facilities, all within walking distance of the beach, restaurants, and shops.",
        price: 515000,
        beds: 2,
        maxBeds: 3,
        baths: 2,
        size: 125,
        image: "/images/properties/one-estepona-main.jpg",
        imageNumbers: [18, 2, 14],
        category: "apartment"
    },
    {
        id: "casatalaya-residences",
        refNumber: "R5063311",
        name: "Casatalaya Residences",
        location: "Benalmádena Costa",
        description: "Located in Benalmádena Costa, this boutique development offers spacious, high-end apartments with timeless architecture, walking distance to the beach, open panoramic sea views, and integrated smart-home technology with spa and gym facilities.",
        price: 800000,
        beds: 3,
        maxBeds: 3,
        baths: 3,
        size: 180,
        image: "/images/properties/casatalaya-residences-main.jpg",
        imageNumbers: [1, 8, 12],
        category: "apartment"
    }
];

const villas: Property[] = [
    {
        id: "savia",
        refNumber: "R4877248",
        name: "Savia",
        location: "Mijas",
        description: "New development in Mijas featuring spacious 3- and 4-bedroom semi-detached homes with private gardens, resort-style amenities, and a natural setting close to the coast. Surrounded by Mediterranean forest, just minutes from the beach and Málaga Airport.",
        price: 460000,
        beds: 3,
        maxBeds: 4,
        baths: 3,
        size: 150,
        image: "/images/properties/savia-main.jpg",
        imageNumbers: [2, 8, 10],
        category: "villa"
    },
    {
        id: "benjamins-dream",
        refNumber: "R5142595",
        name: "Benjamin's Dream",
        location: "Mijas Costa",
        description: "Luxury townhouses in Mijas Costa offering resort-style living, private rooftop solariums, and Mediterranean views, within walking distance of the beach, and close to Marbella.",
        price: 899000,
        beds: 3,
        maxBeds: 3,
        baths: 3,
        size: 170,
        image: "/images/properties/benjamins-dream-main.jpg",
        imageNumbers: [1, 4, 19],
        category: "villa"
    },
    {
        id: "terra-nova-hills",
        refNumber: "R4930933",
        name: "Terra Nova Hills",
        location: "La Mairena, Marbella",
        description: "Marbella Mountain is an exclusive collection of semi-detached villas set frontline to El Soto Golf in La Mairena, offering panoramic views of the golf course and the Mediterranean.",
        price: 1050000,
        beds: 3,
        maxBeds: 3,
        baths: 3,
        size: 200,
        image: "/images/properties/terra-nova-hills-main.jpg",
        imageNumbers: [11, 12, 3],
        category: "villa"
    },
    {
        id: "the-kos",
        refNumber: "R4593817",
        name: "The Kos",
        location: "Fuengirola, Higuerón",
        description: "Boutique residences in the Fuengirola; Higuerón Reserve, within walking distance of the beach, offering private pools, sea views, and resort-style amenities including spa, gym, and coworking spaces.",
        price: 1100000,
        beds: 3,
        maxBeds: 4,
        baths: 3,
        size: 220,
        image: "/images/properties/the-kos-main.jpg",
        imageNumbers: [19, 2, 15],
        category: "villa"
    },
    {
        id: "detached-villa-estepona",
        refNumber: "R4964905",
        name: "Detached Villa Estepona",
        location: "Estepona, Arena Beach",
        description: "Detached contemporary villa in Estepona offering stunning sea views, a private pool and generous terraces, located close to the beach in the sought-after Arena Beach area.",
        price: 1850000,
        beds: 4,
        maxBeds: 4,
        baths: 4,
        size: 300,
        image: "/images/properties/detached-villa-estepona-main.jpg",
        imageNumbers: [1, 2, 9],
        category: "villa"
    },
    {
        id: "villa-serenity",
        refNumber: "R5032771",
        name: "Villa Serenity",
        location: "Benalmádena",
        description: "An unrivalled luxury villa in Benalmádena offering breathtaking Mediterranean sea views, exceptional architecture, and resort-level wellness features in a prime Costa del Sol location.",
        price: 2200000,
        beds: 5,
        maxBeds: 5,
        baths: 5,
        size: 400,
        image: "/images/properties/villa-serenity-main.jpg",
        imageNumbers: [1, 13, 16],
        category: "villa"
    }
];


// Reusable Property Section Component
const PropertySection = ({ id, title, subtitle, properties, lang }: { id: string, title?: string, subtitle?: string, properties: Property[], lang: LanguageCode }) => (
    <section id={id} className="scroll-mt-28 mb-20 animate-fade-in">
        <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif text-[#1A2332]">
                {title}
            </h2>
            {subtitle && (
                <p className="text-gray-500 font-light max-w-2xl mx-auto">
                    {subtitle}
                </p>
            )}
            <div className="w-24 h-0.5 bg-[#C4A053] mx-auto opacity-30 mt-6 rounded-full"></div>
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden px-4 md:px-0">
            <Carousel opts={{ loop: true }} className="w-full">
                <CarouselContent className="-ml-4">
                    {properties.map((property) => (
                        <CarouselItem key={property.id} className="pl-4 basis-full sm:basis-1/2">
                            <PropertyCard property={property} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="flex justify-center gap-4 mt-8">
                    <CarouselPrevious className="static translate-y-0 h-10 w-10 border-primary/20 hover:bg-primary/5 hover:text-primary" />
                    <CarouselNext className="static translate-y-0 h-10 w-10 border-primary/20 hover:bg-primary/5 hover:text-primary" />
                </div>
            </Carousel>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
            ))}
        </div>
    </section>
);

const PropertyCarousel: React.FC = () => {
    const { lang } = useParams();

    const sectionHeadings = {
        en: {
            apartments: "Apartments & Penthouses",
            villas: "Townhouses & Villas"
        },
        nl: {
            apartments: "Appartementen & Penthouses",
            villas: "Townhouses & Villa's"
        },
        fr: {
            apartments: "Appartements & Penthouses",
            villas: "Maisons de ville & Villas"
        },
        de: {
            apartments: "Apartments & Penthäuser",
            villas: "Reihenhäuser & Villen"
        },
        pl: {
            apartments: "Apartamenty i Penthouse'y",
            villas: "Domy szeregowe i Wille"
        },
        sv: {
            apartments: "Lägenheter & Takvåningar",
            villas: "Radhus & Villor"
        },
        da: {
            apartments: "Lejligheder & Penthouselejligheder",
            villas: "Rækkehuse & Villaer"
        },
        fi: {
            apartments: "Huoneistot & Kattohuoneistot",
            villas: "Rivitalot & Huvilat"
        },
        hu: {
            apartments: "Apartmanok & Penthouse-ok",
            villas: "Sorházak & Villák"
        },
        no: {
            apartments: "Leiligheter & Penthouse",
            villas: "Rekkehus & Villaer"
        }
    };

    const currentHeadings = sectionHeadings[lang as keyof typeof sectionHeadings] || sectionHeadings.en;

    return (
        <div className="py-24 bg-[#FAFAFA]" id="properties-section">
            <div className="container mx-auto px-4">

                {/* Header Copy */}
                <div className="text-center mb-20 space-y-3">
                    <h3 className="text-xl md:text-2xl font-serif text-[#1A2332] tracking-wide">
                        Find Your Perfect Home
                    </h3>
                    <p className="text-gray-500 font-light italic text-lg">
                        Browse our hand-picked selection of premium properties on the Costa del Sol
                    </p>
                </div>

                {/* Apartments Section */}
                <PropertySection
                    id="apartments-section"
                    title={currentHeadings.apartments}
                    properties={apartments}
                    lang={lang as LanguageCode}
                />

                {/* Villas Section */}
                <PropertySection
                    id="villas-section"
                    title={currentHeadings.villas}
                    properties={villas}
                    lang={lang as LanguageCode}
                />
            </div>
        </div>
    );
};

export default PropertyCarousel;
