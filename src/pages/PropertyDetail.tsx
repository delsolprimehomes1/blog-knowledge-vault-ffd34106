import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyHeader } from "@/components/property/PropertyHeader";
import { PropertyGalleryGrid } from "@/components/property/PropertyGalleryGrid";
import { PropertyStats } from "@/components/property/PropertyStats";
import { PropertyFeatures } from "@/components/property/PropertyFeatures";
import { PropertyContact, PropertyContactMobile } from "@/components/property/PropertyContact";
import { PropertyDescription } from "@/components/property/PropertyDescription";
import { PropertyCosts } from "@/components/property/PropertyCosts";
import { PropertyHreflangTags } from "@/components/PropertyHreflangTags";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/types/property";
import { Language, AVAILABLE_LANGUAGES } from "@/types/home";
import { motion } from "framer-motion";
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';

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
        // Use get-property-details for high-resolution images (w1200)
        const { data, error } = await supabase.functions.invoke("get-property-details", {
          body: { reference, lang: currentLanguage },
        });

        if (error) throw error;

        if (data.property) {
          console.log('📸 Image resolution:', data.imageResolution);
          console.log('📸 Data source:', data.source);
          console.log('📸 Property data:', data.property);
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

  /**
   * Formats price for display, handling ranges for new developments
   * Examples: "€ 215,000", "€ 215,000 - € 558,000"
   */
  const formatPrice = (price: number | string, priceMax: number | undefined, currency: string) => {
    const safeCurrency = currency || 'EUR';
    let formatter: Intl.NumberFormat;
    
    try {
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: 0,
      });
    } catch (error) {
      // Fallback formatter if currency code is invalid
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      });
    }
    
    const numPrice = typeof price === 'number' ? price : parseInt(String(price).replace(/[^0-9]/g, '')) || 0;
    
    // Check if priceMax is provided and valid for range display
    if (priceMax && typeof priceMax === 'number' && priceMax > numPrice) {
      return `${formatter.format(numPrice)} - ${formatter.format(priceMax)}`;
    }
    
    return formatter.format(numPrice);
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

  const formattedPrice = formatPrice(property.price, property.priceMax, property.currency);
  const allImages = [property.mainImage, ...property.images].filter(Boolean);
  
  // Build title with development name if available
  const pageTitle = property.developmentName 
    ? `${property.developmentName} - ${property.propertyType} in ${property.location}`
    : `${property.propertyType} in ${property.location}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PropertyHreflangTags reference={reference!} currentLanguage={currentLanguage} />
      <Header />

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-24">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Link to={propertiesLink}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Properties
              </Button>
            </Link>
          </motion.div>

          {/* Property Header */}
          <div className="mb-6 md:mb-8">
            <PropertyHeader
              title={pageTitle}
              location={property.location}
              province={property.province}
              price={formattedPrice}
              reference={property.reference}
              bedrooms={property.bedrooms}
              bedroomsMax={property.bedroomsMax}
              bathrooms={property.bathrooms}
              bathroomsMax={property.bathroomsMax}
              builtArea={property.builtArea}
              builtAreaMax={property.builtAreaMax}
              developmentName={property.developmentName}
              newDevelopment={property.newDevelopment}
            />
          </div>

          {/* Gallery Grid */}
          <div className="mb-8 md:mb-12">
            <PropertyGalleryGrid
              images={allImages}
              title={pageTitle}
            />
          </div>

          {/* Stats Bar */}
          <div className="mb-8 md:mb-12">
            <PropertyStats
              bedrooms={property.bedrooms}
              bedroomsMax={property.bedroomsMax}
              bathrooms={property.bathrooms}
              bathroomsMax={property.bathroomsMax}
              builtArea={property.builtArea}
              builtAreaMax={property.builtAreaMax}
              plotArea={property.plotArea}
              plotAreaMax={property.plotAreaMax}
              orientation={property.orientation}
              views={property.views}
              interiorSize={property.interiorSize}
              interiorSizeMax={property.interiorSizeMax}
              terraceSize={property.terraceSize}
              terraceSizeMax={property.terraceSizeMax}
              totalSize={property.totalSize}
              totalSizeMax={property.totalSizeMax}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12 pb-8">
            {/* Left Column - Content */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Description Section */}
              <PropertyDescription
                description={property.description}
                propertyType={property.propertyType}
                location={property.location}
              />

              {/* Features Section (with grouped categories) */}
              <PropertyFeatures
                features={property.features}
                pool={property.pool}
                garden={property.garden}
                parking={property.parking}
                orientation={property.orientation}
                views={property.views}
                featureCategories={property.featureCategories}
              />

              {/* Costs & Details Section */}
              <PropertyCosts
                reservationAmount={property.reservationAmount}
                vatPercentage={property.vatPercentage}
                communityFees={property.communityFees}
                ibi={property.ibi}
                garbageTax={property.garbageTax}
                completionDate={property.completionDate}
                buildingLicense={property.buildingLicense}
                energyRating={property.energyRating}
                co2Rating={property.co2Rating}
                currency={property.currency}
              />
            </div>

            {/* Right Column - Contact (Desktop only) */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                <PropertyContact
                  reference={property.reference}
                  price={formattedPrice}
                  propertyType={property.propertyType}
                />
              </div>
            </div>
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
      <BlogEmmaChat language={currentLanguage} />
    </div>
  );
};

export default PropertyDetail;