import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyFilters } from "@/components/property/PropertyFilters";
import { PropertyFinderHreflangTags } from "@/components/PropertyHreflangTags";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3x3, List, MapPin, ChevronLeft, ChevronRight, Building2, TrendingUp, Shield, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertySearchParams } from "@/types/property";
import { Language, AVAILABLE_LANGUAGES } from "@/types/home";

const PropertyFinder = () => {
  const { lang } = useParams<{ lang?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");

  const validLangCodes = AVAILABLE_LANGUAGES.map(l => l.code as string);
  const currentLanguage = (lang && validLangCodes.includes(lang) ? lang : Language.EN) as Language;

  const getInitialParams = (): PropertySearchParams => ({
    reference: searchParams.get("reference") || undefined,
    location: searchParams.get("location") || undefined,
    sublocation: searchParams.get("sublocation") || undefined,
    transactionType: (searchParams.get("transactionType") as 'sale' | 'rent') || 'sale',
    priceMin: searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : undefined,
    priceMax: searchParams.get("priceMax") ? parseInt(searchParams.get("priceMax")!) : undefined,
    propertyType: searchParams.get("propertyType") || undefined,
    bedrooms: searchParams.get("bedrooms") ? parseInt(searchParams.get("bedrooms")!) : undefined,
    bathrooms: searchParams.get("bathrooms") ? parseInt(searchParams.get("bathrooms")!) : undefined,
    newDevs: searchParams.get("newDevs") === "only" ? "only" : undefined,
  });

  const searchProperties = async (params: PropertySearchParams, pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-properties", {
        body: {
          reference: params.reference,
          location: params.location,
          sublocation: params.sublocation,
          transactionType: params.transactionType || 'sale',
          priceMin: params.priceMin,
          priceMax: params.priceMax,
          propertyType: params.propertyType,
          bedrooms: params.bedrooms,
          bathrooms: params.bathrooms,
          newDevs: params.newDevs,
          page: pageNum,
          lang: currentLanguage,
        },
      });

      if (error) throw error;

      if (data.property) {
        setProperties([data.property]);
        setTotal(1);
      } else {
        setProperties(data.properties || []);
        setTotal(data.total || 0);
      }
      setPage(pageNum);

      const queryParams = new URLSearchParams();
      queryParams.append("transactionType", params.transactionType || 'sale');
      if (params.reference) queryParams.append("reference", params.reference);
      if (params.location) queryParams.append("location", params.location);
      if (params.sublocation) queryParams.append("sublocation", params.sublocation);
      if (params.priceMin) queryParams.append("priceMin", params.priceMin.toString());
      if (params.priceMax) queryParams.append("priceMax", params.priceMax.toString());
      if (params.propertyType) queryParams.append("propertyType", params.propertyType);
      if (params.bedrooms) queryParams.append("bedrooms", params.bedrooms.toString());
      if (params.bathrooms) queryParams.append("bathrooms", params.bathrooms.toString());
      if (params.newDevs) queryParams.append("newDevs", params.newDevs);
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

  useEffect(() => {
    const params = getInitialParams();
    if (Object.keys(params).some((key) => params[key as keyof PropertySearchParams])) {
      searchProperties(params);
    }
  }, []);

  const locationName = searchParams.get("location");

  // Stats data
  const stats = [
    { icon: Building2, value: "7,000+", label: "Properties" },
    { icon: MapPin, value: "50+", label: "Locations" },
    { icon: TrendingUp, value: "15+", label: "Years Experience" },
    { icon: Shield, value: "100%", label: "Trusted" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <PropertyFinderHreflangTags 
        currentLanguage={currentLanguage} 
        searchParams={searchParams.toString()} 
      />
      <Header variant="solid" />
      
      {/* Premium Hero Section */}
      <section className="relative pt-24 pb-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/10 via-amber-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/5 via-transparent to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Breadcrumb */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
          >
            <span className="hover:text-primary transition-colors cursor-pointer">Home</span>
            <span className="text-border">/</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Properties</span>
            {locationName && (
              <>
                <span className="text-border">/</span>
                <span className="text-foreground font-medium">{locationName}</span>
              </>
            )}
          </motion.div>
          
          {/* Title Section */}
          <div className="max-w-4xl mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-tight"
            >
              {locationName ? (
                <>
                  <span className="text-foreground">Properties in </span>
                  <span className="bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
                    {locationName}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-foreground">Find Your </span>
                  <span className="bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
                    Dream Property
                  </span>
                </>
              )}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl"
            >
              {locationName
                ? `Discover exclusive real estate opportunities in ${locationName}, Costa del Sol`
                : "Browse our curated collection of luxury properties on the stunning Costa del Sol"}
            </motion.p>
          </div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Search Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <PropertyFilters
              onSearch={handleFilterSearch}
              initialParams={getInitialParams()}
              resultCount={total}
            />
          </motion.div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 pb-16">
        {/* Premium Results Toolbar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 bg-white/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    Searching...
                  </span>
                ) : (
                  <span>{total.toLocaleString()} properties</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {locationName ? `in ${locationName}` : "available in Costa del Sol"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-10 bg-white border-border/50 rounded-xl">
                <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                <SelectItem value="newest" className="rounded-lg">Newest First</SelectItem>
                <SelectItem value="price-asc" className="rounded-lg">Price: Low to High</SelectItem>
                <SelectItem value="price-desc" className="rounded-lg">Price: High to Low</SelectItem>
                <SelectItem value="beds" className="rounded-lg">Most Bedrooms</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex bg-muted/50 rounded-xl p-1 border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`w-9 h-9 rounded-lg transition-all duration-300 ${
                  viewMode === "grid" 
                    ? "bg-white shadow-sm text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={`w-9 h-9 rounded-lg transition-all duration-300 ${
                  viewMode === "list" 
                    ? "bg-white shadow-sm text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Loading State - Premium Skeleton Cards */}
        {isLoading && (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {[...Array(6)].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden border border-border/50 shadow-lg"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-muted via-muted/80 to-muted/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 bg-muted rounded-full w-32 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 bg-muted rounded-xl w-20 animate-pulse" />
                    <div className="h-10 bg-muted rounded-xl w-20 animate-pulse" />
                    <div className="h-10 bg-muted rounded-xl w-20 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="h-4 bg-muted rounded-full w-24 animate-pulse" />
                    <div className="w-9 h-9 bg-muted rounded-full animate-pulse" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Premium Empty State */}
        {!isLoading && properties.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-3xl border border-border/50 shadow-lg"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 via-amber-500/20 to-primary/20 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              No properties found
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We couldn't find any properties matching your criteria. Try adjusting your filters or explore a different location.
            </p>
            <Button 
              onClick={() => handleFilterSearch({ transactionType: 'sale' })}
              className="rounded-xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
            >
              Clear All Filters
            </Button>
          </motion.div>
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
                <motion.div 
                  key={property.reference}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <PropertyCard property={property} lang={currentLanguage} />
                </motion.div>
              ))}
            </div>

            {/* Premium Pagination */}
            {total > 20 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-4 mt-12"
              >
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} of {total.toLocaleString()} properties
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="rounded-xl px-5 py-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1 px-2">
                    {[...Array(Math.min(5, Math.ceil(total / 20)))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={i}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 rounded-xl font-medium transition-all duration-300 ${
                            page === pageNum
                              ? "bg-gradient-to-r from-primary to-amber-600 text-primary-foreground shadow-lg shadow-primary/25"
                              : "bg-white border border-border/50 text-foreground hover:border-primary hover:bg-primary/5"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {Math.ceil(total / 20) > 5 && (
                      <>
                        <span className="text-muted-foreground px-2">...</span>
                        <button
                          onClick={() => handlePageChange(Math.ceil(total / 20))}
                          className="w-10 h-10 rounded-xl font-medium bg-white border border-border/50 text-foreground hover:border-primary hover:bg-primary/5 transition-all duration-300"
                        >
                          {Math.ceil(total / 20)}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="rounded-xl px-5 py-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PropertyFinder;
