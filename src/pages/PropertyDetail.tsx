import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyHero } from "@/components/property/PropertyHero";
import { PropertyStats } from "@/components/property/PropertyStats";
import { PropertyFeatures } from "@/components/property/PropertyFeatures";
import { PropertyContact, PropertyContactMobile } from "@/components/property/PropertyContact";
import { PropertyDescription } from "@/components/property/PropertyDescription";
import { PropertyHreflangTags } from "@/components/PropertyHreflangTags";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/types/property";
import { Language, AVAILABLE_LANGUAGES } from "@/types/home";
import { motion } from "framer-motion";

const PropertyDetail = () => {
  const { reference, lang } = useParams<{ reference: string; lang?: string }>();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate and get current language
  const validLangCodes = AVAILABLE_LANGUAGES.map(l => l.code as string);
  const currentLanguage = (lang && validLangCodes.includes(lang) ? lang : Language.EN) as Language;
  
  // Build the back link based on language
  const propertiesLink = lang && validLangCodes.includes(lang) 
    ? `/${lang}/properties` 
    : '/en/properties';

  useEffect(() => {
    const fetchProperty = async () => {
      if (!reference) return;

      setIsLoading(true);
      try {
        // Use POST with reference in body for single property lookup
        const { data, error } = await supabase.functions.invoke("search-properties", {
          body: { reference, lang: currentLanguage },
        });

        if (error) throw error;

        // Handle single property response
        if (data.property) {
          setProperty(data.property);
        } else {
          toast({
            title: "Property not found",
            description: "This property may no longer be available.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching property:", error);
        toast({
          title: "Error loading property",
          description: "Could not fetch property details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [reference, currentLanguage, toast]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm md:text-base text-muted-foreground">Loading property details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-20 md:pt-24 pb-8">
          <div className="text-center py-12 md:py-20">
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3 md:mb-4">Property Not Found</h1>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">This property may no longer be available or the reference number is incorrect.</p>
            <Link to={propertiesLink}>
              <Button size="lg" className="rounded-xl h-12 md:h-14 px-6 md:px-8 text-sm md:text-base touch-manipulation">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Property Search
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formattedPrice = formatPrice(property.price, property.currency);
  const allImages = [property.mainImage, ...property.images];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PropertyHreflangTags reference={reference!} currentLanguage={currentLanguage} />
      <Header />

      {/* Back Button - Floating */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="fixed top-20 left-3 md:top-24 md:left-6 z-30"
      >
        <Link to={propertiesLink}>
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-luxury rounded-full px-3 md:px-4 h-9 md:h-10 shadow-lg hover:scale-105 active:scale-95 transition-transform touch-manipulation text-xs md:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            Back
          </Button>
        </Link>
      </motion.div>

      {/* Hero Section */}
      <PropertyHero
        images={allImages}
        title={`${property.propertyType} in ${property.location}`}
        location={`${property.location}, ${property.province}`}
        price={formattedPrice}
        reference={property.reference}
        bedrooms={property.bedrooms}
        bathrooms={property.bathrooms}
        builtArea={property.builtArea}
      />

      {/* Floating Stats Bar */}
      <PropertyStats
        bedrooms={property.bedrooms}
        bathrooms={property.bathrooms}
        builtArea={property.builtArea}
        plotArea={property.plotArea}
        orientation={property.orientation}
        views={property.views}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-3 sm:px-4 md:px-8 py-6 md:py-12">
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
          {/* Left Column - Content */}
          <div className="lg:col-span-2 space-y-2 md:space-y-4">
            {/* Description Section */}
            <PropertyDescription
              description={property.description}
              propertyType={property.propertyType}
              location={property.location}
            />

            {/* Features Section */}
            <PropertyFeatures
              features={property.features}
              pool={property.pool}
              garden={property.garden}
              parking={property.parking}
              orientation={property.orientation}
              views={property.views}
            />
          </div>

          {/* Right Column - Contact (Desktop only) */}
          <div className="lg:col-span-1">
            <PropertyContact
              reference={property.reference}
              price={formattedPrice}
              propertyType={property.propertyType}
            />
          </div>
        </div>
      </main>

      {/* Mobile Fixed CTA */}
      <PropertyContactMobile
        reference={property.reference}
        price={formattedPrice}
      />

      {/* Spacer for mobile fixed CTA with safe area */}
      <div className="h-20 sm:h-24 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      <Footer />
    </div>
  );
};

export default PropertyDetail;
