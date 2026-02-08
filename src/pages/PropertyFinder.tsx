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
import { Grid3x3, List, MapPin, Building2, TrendingUp, Shield, ArrowUpDown } from "lucide-react";
import { COMPANY_DISPLAY } from "@/constants/company";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePropertyFinderTranslation } from "@/hooks/usePropertyFinderTranslation";
import type { Property, PropertySearchParams } from "@/types/property";
import { Language, AVAILABLE_LANGUAGES } from "@/types/home";
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';

const PropertyFinder = () => {
  const { lang } = useParams<{ lang?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, currentLanguage } = usePropertyFinderTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  const validLangCodes = AVAILABLE_LANGUAGES.map(l => l.code as string);
  const validCurrentLanguage = (lang && validLangCodes.includes(lang) ? lang : Language.EN) as Language;

  const getInitialParams = (): PropertySearchParams => {
    // Check if newDevs param is explicitly set in URL
    const newDevsParam = searchParams.get("newDevs");
    // Default to "only" (new developments) unless explicitly set to something else
    let newDevs: "only" | undefined = "only"; // Default to new developments
    if (newDevsParam === "only") {
      newDevs = "only";
    } else if (newDevsParam === "resales") {
      newDevs = undefined; // Resales only (handled in backend)
    } else if (newDevsParam === "all") {
      newDevs = undefined; // All properties
    }
    
    return {
      reference: searchParams.get("reference") || undefined,
      location: searchParams.get("location") || undefined,
      sublocation: searchParams.get("sublocation") || undefined,
      transactionType: (searchParams.get("transactionType") as 'sale' | 'rent') || 'sale',
      priceMin: searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : 400000,
      priceMax: searchParams.get("priceMax") ? parseInt(searchParams.get("priceMax")!) : undefined,
      propertyType: searchParams.get("propertyType") || undefined,
      bedrooms: searchParams.get("bedrooms") ? parseInt(searchParams.get("bedrooms")!) : undefined,
      bathrooms: searchParams.get("bathrooms") ? parseInt(searchParams.get("bathrooms")!) : undefined,
      newDevs,
    };
  };

  // ============ Price Range Parsing & Filtering Helpers ============

  /**
   * Parse a monetary value to number. Handles formats like:
   * 215000, €215,000, €215.000, "215000.00", etc.
   */
  const parseMoney = (value: unknown): number | undefined => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value !== 'string') return undefined;
    
    // Remove currency symbols and whitespace
    let cleaned = value.replace(/[€$£\s]/g, '');
    
    // Handle European format (1.234.567,89) vs US format (1,234,567.89)
    // If we have both . and , check which is the decimal separator
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // European: 1.234.567,89 -> dots are thousands, comma is decimal
      // US: 1,234,567.89 -> commas are thousands, dot is decimal
      const lastDot = cleaned.lastIndexOf('.');
      const lastComma = cleaned.lastIndexOf(',');
      if (lastComma > lastDot) {
        // European format: remove dots, replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: just remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Could be European decimal (215,00) or thousands (215,000)
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length === 2) {
        // Likely European decimal: 215,00
        cleaned = cleaned.replace(',', '.');
      } else {
        // Thousands separator: 215,000
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes('.')) {
      // Could be decimal or thousands separator
      const parts = cleaned.split('.');
      // If last part is exactly 3 digits, likely thousands separator (Spanish: 215.000)
      if (parts.length > 1 && parts[parts.length - 1].length === 3 && parts.length > 2) {
        cleaned = cleaned.replace(/\./g, '');
      }
      // Otherwise keep as-is (normal decimal like 215000.00)
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  };

  /**
   * Extract price range from description text using regex patterns.
   * Handles patterns like:
   * - "Prices from €215,000 to €558,000"
   * - "€ 215,000 - € 558,000"
   * - "215000 - 558000"
   * - "From 215.000 € to 558.000 €"
   */
  const extractPriceRangeFromText = (text: string): { min?: number; max?: number } => {
    if (!text) return {};
    
    // Patterns to match price ranges in various formats
    const patterns = [
      // "Prices from €215,000 to €558,000" or "Precios desde €215.000 hasta €558.000"
      /(?:prices?\s+)?(?:from|desde|ab|à partir de|van)\s*[€$£]?\s*([\d.,]+)\s*[€$£]?\s*(?:to|hasta|bis|à|tot|-)\s*[€$£]?\s*([\d.,]+)\s*[€$£]?/i,
      
      // "€ 215,000 - € 558,000" or "€215.000 - €558.000"
      /[€$£]\s*([\d.,]+)\s*[-–]\s*[€$£]\s*([\d.,]+)/i,
      
      // "215,000 € - 558,000 €" (price before currency)
      /([\d.,]+)\s*[€$£]\s*[-–]\s*([\d.,]+)\s*[€$£]/i,
      
      // "215000 - 558000" (plain numbers with dash)
      /\b([\d]{5,})\s*[-–]\s*([\d]{5,})\b/,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const min = parseMoney(match[1]);
        const max = parseMoney(match[2]);
        if (min !== undefined && max !== undefined && max > min) {
          return { min, max };
        }
      }
    }
    
    return {};
  };

  /**
   * Get the price range for a property, inferring from description if needed.
   * Priority:
   * 1) property.price + property.priceMax (if both present)
   * 2) Parse from property.description
   * 3) Fallback: max = min
   */
  const getPropertyPriceRange = (property: Property): { min: number; max: number } => {
    const baseMin = property.price;
    
    // If we have an explicit priceMax, use it
    if (property.priceMax && property.priceMax > baseMin) {
      return { min: baseMin, max: property.priceMax };
    }
    
    // Try to extract from description
    const descriptionRange = extractPriceRangeFromText(property.description || '');
    if (descriptionRange.max && descriptionRange.max > baseMin) {
      return { 
        min: descriptionRange.min && descriptionRange.min >= baseMin ? descriptionRange.min : baseMin,
        max: descriptionRange.max 
      };
    }
    
    // Fallback: max = min (conservative)
    return { min: baseMin, max: baseMin };
  };

  /**
   * Normalize and filter properties by price range with overlap logic.
   * 
   * For each property:
   * 1. Infer full price range (min, max)
   * 2. Check if it overlaps with user's filter range
   * 3. Compute display intersection (adjust displayed price to match filter)
   * 4. Return property with adjusted price/priceMax for listing display
   */
  const normalizeAndFilterByPriceRange = (
    propertiesToFilter: Property[],
    filters: { priceMin?: number; priceMax?: number }
  ): Property[] => {
    return propertiesToFilter
      .map(property => {
        const range = getPropertyPriceRange(property);
        
        // Check overlap with filter
        // Exclude if no overlap:
        // - filterMin is set and propertyMax < filterMin → no units meet minimum
        // - filterMax is set and propertyMin > filterMax → cheapest unit exceeds budget
        if (filters.priceMin && range.max < filters.priceMin) {
          return null; // No units in this development meet the minimum price
        }
        if (filters.priceMax && range.min > filters.priceMax) {
          return null; // Even the cheapest unit exceeds the budget
        }
        
        // Compute display intersection range
        const displayMin = filters.priceMin 
          ? Math.max(range.min, filters.priceMin) 
          : range.min;
        const displayMax = filters.priceMax 
          ? Math.min(range.max, filters.priceMax) 
          : range.max;
        
        // Return property with adjusted display prices
        return {
          ...property,
          price: displayMin,
          priceMax: displayMax > displayMin ? displayMax : undefined,
        } as Property;
      })
      .filter((p): p is Property => p !== null);
  };

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
          lang: validCurrentLanguage,
        },
      });

      if (error) throw error;

      if (data.property) {
        setProperties([data.property]);
        setTotal(1);
        setHasMore(false);
        setCurrentQueryId(null);
      } else {
        // Apply frontend price filtering for new development price ranges
        const rawProperties = data.properties || [];
        const filteredProperties = normalizeAndFilterByPriceRange(rawProperties, {
          priceMin: params.priceMin,
          priceMax: params.priceMax,
        });
        setProperties(filteredProperties);
        setTotal(data.total || 0);
        setHasMore(filteredProperties.length < (data.total || 0));
        setCurrentQueryId(data.queryId || null);
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

  const loadMoreProperties = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const params = getInitialParams();
      const nextPage = page + 1;
      
      const { data, error } = await supabase.functions.invoke("search-properties", {
        body: {
          ...params,
          page: nextPage,
          queryId: currentQueryId,
          lang: validCurrentLanguage,
        },
      });
      
      if (error) throw error;
      
      // APPEND to existing properties with price filtering
      const rawProperties = data.properties || [];
      const filteredNewProperties = normalizeAndFilterByPriceRange(rawProperties, {
        priceMin: params.priceMin,
        priceMax: params.priceMax,
      });
      setProperties(prev => {
        const updated = [...prev, ...filteredNewProperties];
        // Use functional update to avoid stale state
        setHasMore(updated.length < total);
        return updated;
      });
      setPage(nextPage);
      if (data.queryId) setCurrentQueryId(data.queryId);
    } catch (error) {
      console.error("Error loading more properties:", error);
      toast({
        title: "Load more failed",
        description: "Could not load more properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const params = getInitialParams();
    // Default to new developments only
    searchProperties(params);
  }, []);

  const locationName = searchParams.get("location");

  // Stats data with translations
  const stats = [
    { icon: Building2, value: COMPANY_DISPLAY.propertiesInPortfolio, label: t.stats.properties },
    { icon: MapPin, value: COMPANY_DISPLAY.locations, label: t.stats.locations },
    { icon: TrendingUp, value: COMPANY_DISPLAY.yearsExperience, label: t.stats.experience },
    { icon: Shield, value: "100%", label: t.stats.trusted },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <PropertyFinderHreflangTags 
        currentLanguage={validCurrentLanguage} 
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
            <span className="hover:text-primary transition-colors cursor-pointer">{t.hero.breadcrumbHome}</span>
            <span className="text-border">/</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t.hero.breadcrumbProperties}</span>
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
                  <span className="text-foreground">{t.hero.titleLocationPrefix} </span>
                  <span className="bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-text-shimmer">
                    {locationName}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-foreground">{t.hero.titlePrefix} </span>
                  <span className="bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-text-shimmer">
                    {t.hero.titleHighlight}
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
                ? t.hero.subtitleLocation.replace("{location}", locationName)
                : t.hero.subtitle}
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
                    {t.results.searching}
                  </span>
                ) : (
                  <span>{total.toLocaleString()} {t.results.properties}</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {locationName ? t.results.inLocation.replace("{location}", locationName) : t.results.availableIn}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-10 bg-white border-border/50 rounded-xl">
                <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t.results.sortBy} />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                <SelectItem value="newest" className="rounded-lg">{t.results.newestFirst}</SelectItem>
                <SelectItem value="price-asc" className="rounded-lg">{t.results.priceLowHigh}</SelectItem>
                <SelectItem value="price-desc" className="rounded-lg">{t.results.priceHighLow}</SelectItem>
                <SelectItem value="beds" className="rounded-lg">{t.results.mostBedrooms}</SelectItem>
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
                <div className="aspect-[4/3] bg-gradient-to-br from-muted via-muted/80 to-muted/50 relative overflow-hidden rounded-t-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-overlay" />
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
              {t.emptyState.title}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {t.emptyState.description}
            </p>
            <Button 
              onClick={() => handleFilterSearch({ transactionType: 'sale' })}
              className="rounded-xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
            >
              {t.emptyState.clearFilters}
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
                  <PropertyCard property={property} lang={validCurrentLanguage} />
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-4 mt-12"
              >
                <p className="text-sm text-muted-foreground">
                  {t.results.showing} {properties.length} {t.results.of} {total.toLocaleString()} {t.results.properties}
                </p>
                <Button
                  onClick={loadMoreProperties}
                  disabled={isLoadingMore}
                  className="rounded-xl px-8 py-3 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {t.filters.loading}
                    </span>
                  ) : (
                    `${t.pagination.loadMore} (${(total - properties.length).toLocaleString()} ${t.pagination.remaining})`
                  )}
                </Button>
              </motion.div>
            )}

            {/* All Loaded State */}
            {!hasMore && properties.length > 0 && (
              <div className="text-center mt-12">
                <p className="text-sm text-muted-foreground">
                  ✓ {t.pagination.showingAll} {properties.length.toLocaleString()} {t.results.properties}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <BlogEmmaChat language={lang || 'en'} />
    </div>
  );
};

export default PropertyFinder;
