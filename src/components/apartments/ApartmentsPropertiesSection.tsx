import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Bed, Bath, Maximize } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Property {
  id: string;
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  sqm: number;
  price: number;
  property_type: string | null;
  status: string | null;
  featured_image_url: string | null;
}

interface ApartmentsPropertiesSectionProps {
  language: string;
  onPropertyClick: (property: Property) => void;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const ApartmentsPropertiesSection: React.FC<ApartmentsPropertiesSectionProps> = ({ language, onPropertyClick }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('apartments_properties')
        .select('id, title, location, bedrooms, bathrooms, sqm, price, property_type, status, featured_image_url')
        .eq('language', language)
        .eq('visible', true)
        .order('display_order', { ascending: true });
      setProperties((data as Property[]) || []);
      setLoading(false);
    };
    fetch();
  }, [language]);

  const handleClick = async (property: Property) => {
    // Increment views (fire-and-forget)
    supabase.from('apartments_properties').update({ views: undefined }).eq('id', property.id);
    // Actually use RPC or raw increment — simpler: just do a select+update
    const { data } = await supabase.from('apartments_properties').select('views').eq('id', property.id).single();
    if (data) {
      supabase.from('apartments_properties').update({ views: (data.views || 0) + 1 }).eq('id', property.id);
    }
    onPropertyClick(property);
  };

  if (loading) {
    return (
      <section id="properties-section" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="h-56 w-full" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="properties-section" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-landing-navy text-center mb-12">
          Featured Properties
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map(property => {
            const imgSrc = property.featured_image_url?.startsWith('http')
              ? property.featured_image_url
              : FALLBACK_IMG;

            return (
              <div
                key={property.id}
                onClick={() => handleClick(property)}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {property.property_type && (
                    <span className="absolute top-3 right-3 bg-landing-gold text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                      {property.property_type}
                    </span>
                  )}
                  {property.status && property.status !== 'available' && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                      {property.status}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-landing-navy mb-2">{property.title}</h3>
                  <p className="flex items-center text-sm text-gray-500 mb-4">
                    <MapPin size={14} className="mr-1" /> {property.location}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1"><Bed size={16} /> {property.bedrooms}</span>
                    <span className="flex items-center gap-1"><Bath size={16} /> {property.bathrooms}</span>
                    <span className="flex items-center gap-1"><Maximize size={16} /> {property.sqm}m²</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-landing-navy">{formatPrice(property.price)}</span>
                  </div>

                  <button className="mt-4 w-full px-4 py-3 bg-landing-gold text-white rounded-lg font-semibold hover:bg-landing-goldDark transition-colors">
                    Request Information
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ApartmentsPropertiesSection;
