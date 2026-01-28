import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bed, Bath, Square, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PropertyImageCarousel } from "@/components/landing/PropertyImageCarousel";
import { RetargetingPropertyModal } from "./RetargetingPropertyModal";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";

interface Property {
  id: string;
  internal_name: string;
  location: string;
  beds_min: number | null;
  beds_max: number | null;
  baths: number | null;
  size_sqm: number | null;
  price_eur: number | null;
  images: unknown;
  descriptions: unknown;
}

interface RetargetingProjectsProps {
  language?: string;
}

// Helper to safely extract images array
const getImagesArray = (images: unknown): string[] => {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  return [];
};

const formatPrice = (price: number | null, priceOnRequest: string): string => {
  if (!price) return priceOnRequest;
  try {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `€${price.toLocaleString()}`;
  }
};

export const RetargetingProjects = ({ language = "en" }: RetargetingProjectsProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = getRetargetingTranslations(language);

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, internal_name, location, beds_min, beds_max, baths, size_sqm, price_eur, images, descriptions")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(4);

      if (error) {
        console.error("Error fetching properties:", error);
      } else {
        setProperties(data || []);
      }
      setLoading(false);
    };

    fetchProperties();
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-white via-gray-50/50 to-white py-20 md:py-24 lg:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Intro Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-landing-navy/70 text-base md:text-lg mb-2">
            {t.projectsIntro1}
          </p>
          <p className="text-landing-navy/70 text-base md:text-lg">
            {t.projectsIntro2}
          </p>
        </motion.div>

        {/* Property Cards */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-5">
                  <div className="h-5 bg-gray-200 rounded mb-3 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl border border-white/50 hover:border-landing-gold/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <PropertyImageCarousel
                    images={getImagesArray(property.images)}
                    alt={property.internal_name}
                  />
                  
                  {/* Price Badge with Glassmorphism */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg">
                    <span className="text-landing-navy font-semibold text-sm">
                      {formatPrice(property.price_eur, t.projectsPriceOnRequest)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 md:p-6">
                  <h3 className="text-lg font-medium text-landing-navy mb-2 line-clamp-1">
                    {property.internal_name}
                  </h3>
                  
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-landing-navy/60 text-sm mb-3">
                    <MapPin size={14} />
                    <span>{property.location}</span>
                  </div>

                  {/* Property Stats */}
                  <div className="flex items-center gap-4 text-landing-navy/70 text-sm mb-4">
                    {property.beds_min && (
                      <div className="flex items-center gap-1">
                        <Bed size={14} />
                        <span>
                          {property.beds_max && property.beds_max !== property.beds_min
                            ? `${property.beds_min}-${property.beds_max}`
                            : property.beds_min}
                        </span>
                      </div>
                    )}
                    {property.baths && (
                      <div className="flex items-center gap-1">
                        <Bath size={14} />
                        <span>{property.baths}</span>
                      </div>
                    )}
                    {property.size_sqm && (
                      <div className="flex items-center gap-1">
                        <Square size={14} />
                        <span>{property.size_sqm}m²</span>
                      </div>
                    )}
                  </div>

                  {/* Subtle link */}
                  <button
                    onClick={() => handleViewDetails(property)}
                    className="inline-flex items-center text-sm text-landing-navy/70 hover:text-landing-gold transition-colors group/link"
                  >
                    {t.projectsViewDetails}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover/link:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-landing-navy/60">{t.projectsComingSoon}</p>
          </div>
        )}
      </div>

      {/* Property Inquiry Modal */}
      <RetargetingPropertyModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        property={selectedProperty}
        language={language}
      />
    </section>
  );
};
