import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, ArrowRight, Bed, Bath, Square } from 'lucide-react';

interface Property {
    id: string;
    category: 'apartment' | 'villa';
    location: string;
    beds_min: number;
    baths: number;
    size_sqm: number;
    price_eur: number;
    images: string[];
    title?: string;
}

interface PropertiesShowcaseProps {
    translations?: any;
}

const PropertiesShowcase: React.FC<PropertiesShowcaseProps> = ({ translations }) => {
    const params = useParams();
    const lang = params.lang || 'en';
    const [apartments, setApartments] = useState<Property[]>([]);
    const [villas, setVillas] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    // Fallback translations
    const t = translations?.fallback || {};

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                // Fetch 6 of each instead of 3
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

    const PropertyGrid = ({ items, sectionType }: { items: Property[], sectionType: 'apartments' | 'villas' }) => {
        const sectionT = t[sectionType] || {};
        const title = sectionType === 'apartments' ? "Apartments & Penthouses" : "Townhouses & Villas"; // Fallback defaults

        return (
            <div className="mb-20 last:mb-0">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 pb-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl md:text-2xl font-serif font-bold text-landing-navy/80">{title}</h3>
                        <p className="text-sm text-landing-text-secondary mt-1">{sectionT.subtitle || "6 carefully selected new-build projects"}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((property) => {
                        const displayTitle = property.title || `${property.category === 'apartment' ? 'Luxury Apartment' : 'Exclusive Villa'}`;
                        return (
                            <div
                                key={property.id}
                                className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                                onClick={() => {
                                    const event = new CustomEvent('openLeadForm', { detail: { interest: property.id } });
                                    window.dispatchEvent(event);
                                }}
                            >
                                {/* IMAGE - Simplified, no overlay hover effects */}
                                <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 cursor-pointer">
                                    <img
                                        src={property.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-2495db9dc2c3?w=800'}
                                        alt={displayTitle}
                                        className="absolute inset-0 w-full h-full object-cover transition-opacity hover:opacity-90"
                                        loading="lazy"
                                    />
                                    {/* Price Badge - Smaller */}
                                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm">
                                        <p className="font-bold text-landing-navy text-sm">{formatPrice(property.price_eur)}</p>
                                    </div>
                                </div>

                                {/* CONTENT - Minimal */}
                                <div className="p-4 cursor-pointer">
                                    <h3 className="text-lg font-bold text-landing-navy mb-1 line-clamp-1 group-hover:text-landing-gold transition-colors">
                                        {displayTitle}
                                    </h3>

                                    <div className="flex items-center gap-1.5 text-xs text-landing-text-secondary mb-3">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span>{property.location}</span>
                                    </div>

                                    {/* Specs - Compact */}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Bed size={14} /> <span>{property.beds_min}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Bath size={14} /> <span>{property.baths}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Square size={14} /> <span>{property.size_sqm}m²</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Section CTA */}
                <div className="mt-8 text-center md:text-left">
                    <button className="text-landing-navy font-semibold text-sm hover:text-landing-gold transition-colors flex items-center gap-1 group/btn">
                        {sectionT.cta || `View ${title}`}
                        <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return null;

    return (
        <section id="properties-section" className="py-20 bg-gray-50/50">
            <div className="container mx-auto px-4">
                {/* Fallback Headline */}
                <div className="text-center mb-16">
                    <h2 className="text-2xl md:text-3xl font-sans text-landing-text-secondary font-normal">
                        {t.headline || "Prefer to explore first? You can browse a small curated selection below."}
                    </h2>
                </div>

                <PropertyGrid
                    items={apartments}
                    sectionType="apartments"
                />
                <PropertyGrid
                    items={villas}
                    sectionType="villas"
                />
            </div>
        </section>
    );
};

export default PropertiesShowcase;
