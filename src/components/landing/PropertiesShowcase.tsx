import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, ArrowRight, Bed, Bath, Square } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { PropertyImageCarousel } from './PropertyImageCarousel';

interface Property {
    id: string;
    category: 'apartment' | 'villa';
    location: string;
    beds_min: number;
    beds_max?: number;
    baths: number;
    size_sqm: number;
    price_eur: number;
    images: string[];
    title?: string;
    descriptions?: Record<string, string>;
}

interface PropertiesShowcaseProps {
    translations?: any;
    language?: string;
}

const PropertiesShowcase: React.FC<PropertiesShowcaseProps> = ({ translations, language }) => {
    const lang = language || 'en';
    const [apartments, setApartments] = useState<Property[]>([]);
    const [villas, setVillas] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const t = translations?.fallback || {};

    // Translations for property showcase labels
    const labels = {
        en: { 
            apartmentSection: "Apartments & Penthouses", 
            villaSection: "Townhouses & Villas",
            apartmentTitle: "Luxury Apartment",
            villaTitle: "Exclusive Villa",
            view: "View",
            subtitle: "6 carefully selected new-build projects"
        },
        de: { 
            apartmentSection: "Wohnungen & Penthäuser", 
            villaSection: "Reihenhäuser & Villen",
            apartmentTitle: "Luxuswohnung",
            villaTitle: "Exklusive Villa",
            view: "Ansehen",
            subtitle: "6 sorgfältig ausgewählte Neubauprojekte"
        },
        nl: { 
            apartmentSection: "Appartementen & Penthouses", 
            villaSection: "Townhouses & Villa's",
            apartmentTitle: "Luxe Appartement",
            villaTitle: "Exclusieve Villa",
            view: "Bekijken",
            subtitle: "6 zorgvuldig geselecteerde nieuwbouwprojecten"
        },
        fr: { 
            apartmentSection: "Appartements & Penthouses", 
            villaSection: "Maisons de ville & Villas",
            apartmentTitle: "Appartement de Luxe",
            villaTitle: "Villa Exclusive",
            view: "Voir",
            subtitle: "6 projets neufs soigneusement sélectionnés"
        },
        pl: { 
            apartmentSection: "Apartamenty & Penthousy", 
            villaSection: "Domy szeregowe & Wille",
            apartmentTitle: "Luksusowy Apartament",
            villaTitle: "Ekskluzywna Willa",
            view: "Zobacz",
            subtitle: "6 starannie wybranych projektów deweloperskich"
        },
        sv: { 
            apartmentSection: "Lägenheter & Takvåningar", 
            villaSection: "Radhus & Villor",
            apartmentTitle: "Lyxlägenhet",
            villaTitle: "Exklusiv Villa",
            view: "Visa",
            subtitle: "6 noggrant utvalda nybyggnadsprojekt"
        },
        da: { 
            apartmentSection: "Lejligheder & Penthouses", 
            villaSection: "Rækkehuse & Villaer",
            apartmentTitle: "Luksuslejlighed",
            villaTitle: "Eksklusiv Villa",
            view: "Se",
            subtitle: "6 omhyggeligt udvalgte nybyggeriprojekter"
        },
        hu: { 
            apartmentSection: "Apartmanok & Penthouse-ok", 
            villaSection: "Sorházak & Villák",
            apartmentTitle: "Luxus Apartman",
            villaTitle: "Exkluzív Villa",
            view: "Megtekintés",
            subtitle: "6 gondosan kiválasztott új építésű projekt"
        },
        fi: { 
            apartmentSection: "Asunnot & Kattohuoneistot", 
            villaSection: "Rivitalot & Huvilat",
            apartmentTitle: "Luksusasunto",
            villaTitle: "Yksinomainen Huvila",
            view: "Näytä",
            subtitle: "6 huolellisesti valittua uudisrakennusprojektia"
        },
        no: { 
            apartmentSection: "Leiligheter & Penthouses", 
            villaSection: "Rekkehus & Villaer",
            apartmentTitle: "Luksusleilighet",
            villaTitle: "Eksklusiv Villa",
            view: "Se",
            subtitle: "6 nøye utvalgte nybyggprosjekter"
        }
    };

    const currentLabels = labels[lang as keyof typeof labels] || labels.en;

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                if (data) {
                    const typedData = data as Property[];
                    setApartments(typedData.filter(p => p.category === 'apartment').slice(0, 6));
                    setVillas(typedData.filter(p => p.category === 'villa').slice(0, 6));
                }
            } catch (error) {
                console.error('Error fetching:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
    };

    const formatBeds = (property: Property) => {
        if (property.beds_max && property.beds_max !== property.beds_min) {
            return `${property.beds_min}-${property.beds_max}`;
        }
        return `${property.beds_min}`;
    };

    const PropertyCard = ({ property, index }: { property: Property; index: number }) => {
        const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.05 });
        const displayTitle = property.title || `${property.category === 'apartment' ? currentLabels.apartmentTitle : currentLabels.villaTitle}`;

        // Get localized description (fallback to English if not available)
        const description = property.descriptions?.[lang] || property.descriptions?.en || '';

        return (
            <div
                ref={elementRef as React.RefObject<HTMLDivElement>}
                style={{ transitionDelay: `${index * 75}ms` }}
                className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}
            >
                {/* Image Carousel */}
                <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-gray-100 cursor-pointer">
                    <PropertyImageCarousel
                        images={property.images || []}
                        alt={displayTitle}
                    />
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 px-2 py-0.5 sm:px-3 sm:py-1 bg-white/95 backdrop-blur-sm rounded-md sm:rounded-lg shadow-sm z-20">
                        <p className="font-bold text-landing-navy text-xs sm:text-sm">{formatPrice(property.price_eur)}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-landing-navy mb-1 line-clamp-1 group-hover:text-landing-gold transition-colors">
                        {displayTitle}
                    </h3>

                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-landing-text-secondary mb-2">
                        <MapPin size={12} className="text-gray-400 sm:w-[14px] sm:h-[14px]" />
                        <span className="truncate">{property.location}</span>
                    </div>

                    {/* Localized Description */}
                    {description && (
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3 line-clamp-2 leading-relaxed">
                            {description}
                        </p>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Bed size={12} className="sm:w-[14px] sm:h-[14px]" /> <span>{formatBeds(property)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Bath size={12} className="sm:w-[14px] sm:h-[14px]" /> <span>{property.baths}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Square size={12} className="sm:w-[14px] sm:h-[14px]" /> <span>{property.size_sqm}m²</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const event = new CustomEvent('openLeadForm', { detail: { interest: property.id } });
                                window.dispatchEvent(event);
                            }}
                            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-landing-gold text-white text-[10px] sm:text-xs font-semibold rounded-md hover:bg-landing-gold/90 transition-colors"
                        >
                            <span>{currentLabels.view}</span>
                            <ArrowRight size={10} className="sm:w-3 sm:h-3" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const PropertyGrid = ({ items, sectionType }: { items: Property[], sectionType: 'apartments' | 'villas' }) => {
        const sectionT = t[sectionType] || {};
        const title = sectionType === 'apartments' ? currentLabels.apartmentSection : currentLabels.villaSection;

        return (
            <div className="mb-12 sm:mb-16 lg:mb-20 last:mb-0">
                <div className="flex flex-col items-center justify-center mb-5 sm:mb-6 lg:mb-8 gap-2 pb-3 sm:pb-4 border-b border-gray-100">
                    <div className="text-center">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-bold text-landing-navy/80">{title}</h3>
                        <p className="text-xs sm:text-sm text-landing-text-secondary mt-0.5 sm:mt-1">{sectionT.subtitle || currentLabels.subtitle}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((property, idx) => (
                        <PropertyCard key={property.id} property={property} index={idx} />
                    ))}
                </div>

                <div className="mt-5 sm:mt-6 lg:mt-8 text-center">
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('openLeadForm', {
                                detail: { interest: sectionType === 'apartments' ? 'Apartments & Penthouses' : 'Townhouses & Villas' }
                            }));
                        }}
                        className="text-landing-navy font-semibold text-xs sm:text-sm hover:text-landing-gold transition-colors inline-flex items-center gap-1 group/btn"
                    >
                        {sectionT.cta || `View ${title}`}
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform sm:w-4 sm:h-4" />
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return null;

    return (
        <section id="properties-section" className="py-12 sm:py-16 lg:py-20 bg-gray-50/50">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Headline - always visible */}
                <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-sans text-landing-text-secondary font-normal px-2">
                        {t.headline || "Prefer to explore first? You can browse a small curated selection below."}
                    </h2>
                </div>

                <PropertyGrid items={apartments} sectionType="apartments" />
                <PropertyGrid items={villas} sectionType="villas" />
            </div>
        </section>
    );
};

export default PropertiesShowcase;
