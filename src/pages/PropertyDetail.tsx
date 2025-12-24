import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyHero } from "@/components/property/PropertyHero";
import { PropertyStats } from "@/components/property/PropertyStats";
import { PropertyFeatures } from "@/components/property/PropertyFeatures";
import { PropertyContact } from "@/components/property/PropertyContact";
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
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading property details...</p>
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
        <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
          <div className="text-center py-20">
            <h1 className="text-3xl font-display font-bold mb-4">Property Not Found</h1>
            <p className="text-muted-foreground mb-8">This property may no longer be available or the reference number is incorrect.</p>
            <Link to={propertiesLink}>
              <Button size="lg" className="rounded-xl">
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
        className="fixed top-24 left-6 z-30"
      >
        <Link to={propertiesLink}>
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-luxury rounded-full px-4 h-10 shadow-lg hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
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
      <main className="flex-1 container mx-auto px-4 md:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left Column - Content */}
          <div className="lg:col-span-2 space-y-4">
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

          {/* Right Column - Contact */}
          <div className="lg:col-span-1">
            <PropertyContact
              reference={property.reference}
              price={formattedPrice}
              propertyType={property.propertyType}
            />
          </div>
        </div>
      </main>

      {/* Spacer for mobile fixed CTA */}
      <div className="h-24 lg:hidden" />

      <Footer />
    </div>
  );
};

export default PropertyDetail;
