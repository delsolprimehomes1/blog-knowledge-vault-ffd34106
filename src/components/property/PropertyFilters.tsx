import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Loader2, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { usePropertyTypes } from "@/hooks/usePropertyTypes";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PropertySearchParams } from "@/types/property";

interface PropertyFiltersProps {
  onSearch: (params: PropertySearchParams) => void;
  initialParams?: PropertySearchParams;
  resultCount?: number;
}

const PRICE_OPTIONS = [
  { label: "Any", value: "" },
  { label: "€50,000", value: "50000" },
  { label: "€100,000", value: "100000" },
  { label: "€150,000", value: "150000" },
  { label: "€200,000", value: "200000" },
  { label: "€250,000", value: "250000" },
  { label: "€300,000", value: "300000" },
  { label: "€400,000", value: "400000" },
  { label: "€500,000", value: "500000" },
  { label: "€750,000", value: "750000" },
  { label: "€1,000,000", value: "1000000" },
  { label: "€2,000,000", value: "2000000" },
  { label: "€5,000,000", value: "5000000" },
];

const BEDROOM_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
  { label: "6+", value: "6" },
];

const BATHROOM_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
];

const STATUS_OPTIONS = [
  { label: "Sales", value: "sales" },
  { label: "New Developments", value: "new-developments" },
];

export const PropertyFilters = ({
  onSearch,
  initialParams = {},
  resultCount,
}: PropertyFiltersProps) => {
  const { locations, loading: locationsLoading } = useLocations();
  const { flattenedTypes, loading: typesLoading } = usePropertyTypes();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [reference, setReference] = useState(initialParams.reference || "");
  const [location, setLocation] = useState(initialParams.location || "");
  const [sublocation, setSublocation] = useState(initialParams.sublocation || "");
  const [propertyType, setPropertyType] = useState(initialParams.propertyType || "");
  const [bedrooms, setBedrooms] = useState(initialParams.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initialParams.bathrooms?.toString() || "");
  const [priceMin, setPriceMin] = useState(initialParams.priceMin?.toString() || "");
  const [priceMax, setPriceMax] = useState(initialParams.priceMax?.toString() || "");
  const [status, setStatus] = useState(
    initialParams.newDevs === "only" || initialParams.newDevs === undefined ? "new-developments" : "sales"
  );

  useEffect(() => {
    setReference(initialParams.reference || "");
    setLocation(initialParams.location || "");
    setSublocation(initialParams.sublocation || "");
    setPropertyType(initialParams.propertyType || "");
    setBedrooms(initialParams.bedrooms?.toString() || "");
    setBathrooms(initialParams.bathrooms?.toString() || "");
    setPriceMin(initialParams.priceMin?.toString() || "");
    setPriceMax(initialParams.priceMax?.toString() || "");
    setStatus(initialParams.newDevs === "only" || initialParams.newDevs === undefined ? "new-developments" : "sales");
  }, [initialParams]);

  const handleSearch = () => {
    const params: PropertySearchParams = {
      transactionType: "sale",
    };

    if (reference.trim()) params.reference = reference.trim();
    if (location && location !== "any") params.location = location;
    if (sublocation && sublocation !== "any") params.sublocation = sublocation;
    if (propertyType && propertyType !== "any") params.propertyType = propertyType;
    if (bedrooms && bedrooms !== "any") params.bedrooms = parseInt(bedrooms);
    if (bathrooms && bathrooms !== "any") params.bathrooms = parseInt(bathrooms);
    if (priceMin && priceMin !== "any") params.priceMin = parseInt(priceMin);
    if (priceMax && priceMax !== "any") params.priceMax = parseInt(priceMax);
    if (status === "new-developments") params.newDevs = "only";

    onSearch(params);
  };

  const handleReset = () => {
    setReference("");
    setLocation("");
    setSublocation("");
    setPropertyType("");
    setBedrooms("");
    setBathrooms("");
    setPriceMin("");
    setPriceMax("");
    setStatus("new-developments");
    onSearch({ transactionType: "sale", newDevs: "only" });
  };

  const isLoading = locationsLoading || typesLoading;

  // Count active filters
  const activeFilters = [reference, location, sublocation, propertyType, bedrooms, bathrooms, priceMin, priceMax]
    .filter(f => f && f !== "any").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Glass Card Container */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Decorative gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-amber-500 to-primary" />
        
        <div className="p-6">
          {/* Main Search Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</label>
              <Select value={location} onValueChange={(val) => { setLocation(val); setSublocation(""); }}>
                <SelectTrigger className="h-12 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                  {locationsLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <SelectValue placeholder="Any Location" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                  <SelectItem value="any" className="rounded-lg">Any Location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value} className="rounded-lg">
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Type</label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-12 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                  {typesLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <SelectValue placeholder="Any Type" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl max-h-80">
                  <SelectItem value="any" className="rounded-lg">Any Type</SelectItem>
                  {flattenedTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="rounded-lg">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={priceMin} onValueChange={setPriceMin}>
                  <SelectTrigger className="h-12 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                    {PRICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any-min"} value={opt.value || "any"} className="rounded-lg">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priceMax} onValueChange={setPriceMax}>
                  <SelectTrigger className="h-12 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                    <SelectValue placeholder="Max" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                    {PRICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any-max"} value={opt.value || "any"} className="rounded-lg">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Button */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider invisible">Search</label>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <Search className="w-4 h-4 mr-2" />
                Search{resultCount !== undefined && resultCount > 0 && ` (${resultCount.toLocaleString()})`}
              </Button>
            </div>
          </div>

          {/* Advanced Filters Collapsible */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 mt-4 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300 group">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Advanced Filters</span>
                {activeFilters > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    {activeFilters} active
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="pt-4 mt-4 border-t border-border/30">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Reference */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</label>
                    <Input
                      placeholder="e.g. R5014453"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="h-11 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                    />
                  </div>

                  {/* Sublocation */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sublocation</label>
                    <Select value={sublocation} onValueChange={setSublocation} disabled={!location || location === "any"}>
                      <SelectTrigger className="h-11 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 disabled:opacity-50 transition-all duration-300">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                        <SelectItem value="any" className="rounded-lg">Any Sublocation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bedrooms */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bedrooms</label>
                    <Select value={bedrooms} onValueChange={setBedrooms}>
                      <SelectTrigger className="h-11 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 transition-all duration-300">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                        {BEDROOM_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "any-bed"} value={opt.value || "any"} className="rounded-lg">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bathrooms */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bathrooms</label>
                    <Select value={bathrooms} onValueChange={setBathrooms}>
                      <SelectTrigger className="h-11 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 transition-all duration-300">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                        {BATHROOM_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "any-bath"} value={opt.value || "any"} className="rounded-lg">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-11 bg-white/60 border-border/50 rounded-xl hover:border-primary/50 transition-all duration-300">
                        <SelectValue placeholder="Sales" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reset Button */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider invisible">Reset</label>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full h-11 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </motion.div>
  );
};
