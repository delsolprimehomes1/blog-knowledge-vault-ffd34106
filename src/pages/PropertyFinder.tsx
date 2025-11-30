import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyFilters } from "@/components/property/PropertyFilters";
import { Button } from "@/components/ui/button";
import { Loader2, Grid3x3, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertySearchParams } from "@/types/property";

const PropertyFinder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Parse initial params from URL
  const getInitialParams = (): PropertySearchParams => ({
    location: searchParams.get("location") || undefined,
    priceMin: searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : undefined,
    priceMax: searchParams.get("priceMax") ? parseInt(searchParams.get("priceMax")!) : undefined,
    propertyType: searchParams.get("propertyType") || undefined,
    bedrooms: searchParams.get("bedrooms") ? parseInt(searchParams.get("bedrooms")!) : undefined,
    bathrooms: searchParams.get("bathrooms") ? parseInt(searchParams.get("bathrooms")!) : undefined,
  });

  const searchProperties = async (params: PropertySearchParams, pageNum: number = 1) => {
    setIsLoading(true);
    try {
      // Call edge function with params in body
      const { data, error } = await supabase.functions.invoke("search-properties", {
        body: {
          location: params.location,
          priceMin: params.priceMin,
          priceMax: params.priceMax,
          propertyType: params.propertyType,
          bedrooms: params.bedrooms,
          bathrooms: params.bathrooms,
          page: pageNum,
        },
      });

      if (error) throw error;

      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setPage(pageNum);

      // Update URL params for shareable links
      const queryParams = new URLSearchParams();
      if (params.location) queryParams.append("location", params.location);
      if (params.priceMin) queryParams.append("priceMin", params.priceMin.toString());
      if (params.priceMax) queryParams.append("priceMax", params.priceMax.toString());
      if (params.propertyType) queryParams.append("propertyType", params.propertyType);
      if (params.bedrooms) queryParams.append("bedrooms", params.bedrooms.toString());
      if (params.bathrooms) queryParams.append("bathrooms", params.bathrooms.toString());
      setSearchParams(queryParams);
    } catch (error) {
      console.error("Error searching properties:", error);
      toast({
        title: "Search failed",
        description: "Could not fetch properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterSearch = (params: PropertySearchParams) => {
    searchProperties(params, 1);
  };

  const handlePageChange = (newPage: number) => {
    const params = getInitialParams();
    searchProperties(params, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Load properties on mount if URL params exist
  useEffect(() => {
    const params = getInitialParams();
    if (Object.keys(params).some((key) => params[key as keyof PropertySearchParams])) {
      searchProperties(params);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">Find Your Dream Property</h1>
          <p className="text-muted-foreground">
            Browse exclusive properties on Costa del Sol
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <PropertyFilters
              onSearch={handleFilterSearch}
              initialParams={getInitialParams()}
            />
          </aside>

          {/* Property Grid */}
          <div className="lg:col-span-3">
            {/* View Toggle & Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {isLoading ? "Searching..." : `${total} properties found`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && properties.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground mb-4">
                  No properties found
                </p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search filters
                </p>
              </div>
            )}

            {/* Property Grid */}
            {!isLoading && properties.length > 0 && (
              <>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {properties.map((property) => (
                    <PropertyCard key={property.reference} property={property} />
                  ))}
                </div>

                {/* Pagination */}
                {total > 20 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {page} of {Math.ceil(total / 20)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= Math.ceil(total / 20)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PropertyFinder;
