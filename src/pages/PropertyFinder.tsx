import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyFilters } from "@/components/property/PropertyFilters";
import { Button } from "@/components/ui/button";
import { Grid3x3, List, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
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

  const locationName = searchParams.get("location");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header variant="solid" />
      
      {/* Hero Section with Gradient */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 animate-fade-in">
            <span className="hover:text-primary transition-colors cursor-pointer">Home</span>
            <span>/</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Properties</span>
            {locationName && (
              <>
                <span>/</span>
                <span className="text-foreground font-medium">{locationName}</span>
              </>
            )}
          </div>
          
          {/* Title */}
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 animate-fade-in">
              {locationName ? (
                <>
                  <span className="text-foreground">Properties in </span>
                  <span className="bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent">
                    {locationName}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-foreground">Find Your </span>
                  <span className="bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent">
                    Dream Property
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: "100ms" }}>
              {locationName
                ? `Explore exclusive real estate in ${locationName}, Costa del Sol`
                : "Browse exclusive properties on the stunning Costa del Sol"}
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28">
              <PropertyFilters
                onSearch={handleFilterSearch}
                initialParams={getInitialParams()}
              />
            </div>
          </aside>

          {/* Property Grid */}
          <div className="lg:col-span-3">
            {/* View Toggle & Results Count */}
            <div className="flex items-center justify-between mb-8 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {isLoading ? "Searching..." : `${total} properties`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locationName ? `in ${locationName}` : "available"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-xl transition-all duration-300 ${
                    viewMode === "grid" 
                      ? "shadow-lg shadow-primary/25" 
                      : "hover:bg-slate-100"
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={`rounded-xl transition-all duration-300 ${
                    viewMode === "list" 
                      ? "shadow-lg shadow-primary/25" 
                      : "hover:bg-slate-100"
                  }`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Loading State - Skeleton Cards */}
            {isLoading && (
              <div className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-lg animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-200 to-slate-100" />
                    <div className="p-5 space-y-4">
                      <div className="h-4 bg-slate-200 rounded-full w-2/3" />
                      <div className="h-6 bg-slate-200 rounded-full w-1/2" />
                      <div className="flex gap-4">
                        <div className="h-4 bg-slate-200 rounded-full w-16" />
                        <div className="h-4 bg-slate-200 rounded-full w-16" />
                        <div className="h-4 bg-slate-200 rounded-full w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && properties.length === 0 && (
              <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-lg">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                  No properties found
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search filters or explore a different location
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
                  {properties.map((property, index) => (
                    <div 
                      key={property.reference} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 75}ms` }}
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
                </div>

                {/* Modern Pagination */}
                {total > 20 && (
                  <div className="flex items-center justify-center gap-3 mt-12">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="rounded-xl px-4 py-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all duration-300 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {[...Array(Math.min(5, Math.ceil(total / 20)))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={i}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 rounded-xl font-medium transition-all duration-300 ${
                              page === pageNum
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "bg-white border border-slate-200 text-foreground hover:border-primary hover:bg-primary/5"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {Math.ceil(total / 20) > 5 && (
                        <span className="text-muted-foreground px-2">...</span>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= Math.ceil(total / 20)}
                      className="rounded-xl px-4 py-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all duration-300 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
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
