import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowRight } from 'lucide-react';

export interface Property {
    id: string;
    refNumber: string;
    name: string;
    location: string;
    description: string;
    price: number;
    beds: number;
    maxBeds?: number;
    baths: number;
    size: number;
    image: string;
    imageNumbers?: number[];
    category: 'apartment' | 'villa';
}

interface PropertyCardProps {
    property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
    const { t, i18n } = useTranslation('landing');

    const formatPrice = (price: number) => {
        const formatted = new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);

        return `${t('properties.from', 'From')} ${formatted}`;
    };

    const formatBeds = () => {
        if (property.maxBeds && property.maxBeds !== property.beds) {
            return `${property.beds}-${property.maxBeds} ${t('properties.beds', 'Beds')}`;
        }
        return `${property.beds} ${t('properties.beds', 'Beds')}`;
    };

    return (
        <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col border border-gray-100">
            {/* Image Container */}
            <div className="relative h-64 overflow-hidden">
                <img
                    src={property.image}
                    alt={property.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.src = '/images/properties/placeholder.jpg';
                    }}
                />

                {/* Reference Number Badge */}
                {property.refNumber && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-[#1A2332] shadow-sm tracking-wide">
                        {property.refNumber}
                    </div>
                )}

                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-serif text-[#1A2332] leading-tight group-hover:text-[#C4A053] transition-colors">
                        {property.name}
                    </h3>
                </div>

                <div className="flex items-center gap-2 text-gray-500 mb-4 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-[#C4A053]" />
                    {property.location}
                </div>

                <p className="text-sm text-gray-600 mb-6 line-clamp-3 leading-relaxed flex-1">
                    {property.description}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-6 py-4 border-t border-b border-gray-50">
                    <div className="text-center font-medium">
                        <span className="block text-[#1A2332] text-sm mb-1">{formatBeds().split(' ')[0]}</span>
                        {t('properties.beds', 'Beds')}
                    </div>
                    <div className="text-center font-medium border-l border-gray-100">
                        <span className="block text-[#1A2332] text-sm mb-1">{property.baths}</span>
                        {t('properties.baths', 'Baths')}
                    </div>
                    <div className="text-center font-medium border-l border-gray-100">
                        <span className="block text-[#1A2332] text-sm mb-1">{property.size}</span>
                        m²
                    </div>
                </div>

                {/* Price and CTA */}
                <div className="flex items-end justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Price</span>
                        <span className="text-xl font-bold text-[#C4A053]">
                            {formatPrice(property.price)}
                        </span>
                    </div>

                    <Button
                        asChild
                        className="bg-[#1A2332] hover:bg-[#C4A053] text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all shrink-0"
                    >
                        <a href={`/optin?project=${encodeURIComponent(property.id)}&ref=${property.refNumber}`}>
                            {t('properties.moreInfo', 'More Info')}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;
