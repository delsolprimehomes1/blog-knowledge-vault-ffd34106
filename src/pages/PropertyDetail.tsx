import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { Button } from "@/components/ui/button";
import { Loader2, Bed, Bath, Maximize2, MapPin, ArrowLeft, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/types/property";

const PropertyDetail = () => {
  const { reference } = useParams<{ reference: string }>();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!reference) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-properties", {
          method: "GET",
        });

        if (error) throw error;

        // Find property by reference
        const foundProperty = data.properties?.find(
          (p: Property) => p.reference === reference
        );

        if (foundProperty) {
          setProperty(foundProperty);
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
  }, [reference, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="text-2xl font-display font-bold mb-4">Property Not Found</h1>
            <Link to="/property-finder">
              <Button>
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

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Link to="/property-finder" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <PropertyGallery
              images={[property.mainImage, ...property.images]}
              title={`${property.propertyType} in ${property.location}`}
            />

            {/* Property Info */}
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{property.location}, {property.province}</span>
              </div>
              <h1 className="text-3xl font-display font-bold mb-4">
                {property.propertyType} in {property.location}
              </h1>
              <div className="text-4xl font-display font-bold text-primary mb-6">
                {formatPrice(property.price, property.currency)}
              </div>

              {/* Key Features */}
              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <Bed className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="text-lg font-semibold">{property.bedrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="text-lg font-semibold">{property.bathrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Built Area</p>
                    <p className="text-lg font-semibold">{property.builtArea}m²</p>
                  </div>
                </div>
                {property.plotArea && (
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Plot Area</p>
                      <p className="text-lg font-semibold">{property.plotArea}m²</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="prose max-w-none">
                <h2 className="text-2xl font-display font-bold mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>

              {/* Features */}
              {property.features.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-2xl font-display font-bold mb-4">Features</h2>
                  <ul className="grid grid-cols-2 gap-3">
                    {property.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Info */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.pool && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Pool</p>
                    <p className="font-semibold">{property.pool}</p>
                  </div>
                )}
                {property.garden && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Garden</p>
                    <p className="font-semibold">{property.garden}</p>
                  </div>
                )}
                {property.parking && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Parking</p>
                    <p className="font-semibold">{property.parking}</p>
                  </div>
                )}
                {property.orientation && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Orientation</p>
                    <p className="font-semibold">{property.orientation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Contact */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <h3 className="text-xl font-display font-bold mb-4">Interested in this property?</h3>
              <p className="text-muted-foreground mb-6">
                Contact us for more information or to schedule a viewing.
              </p>
              <div className="space-y-3">
                <Button className="w-full" size="lg">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Inquiry
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us
                </Button>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Reference</p>
                <p className="font-mono text-sm">{property.reference}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PropertyDetail;
