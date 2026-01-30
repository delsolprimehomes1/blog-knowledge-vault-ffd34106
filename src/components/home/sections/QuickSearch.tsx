import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/hooks/useLocations';
import { usePropertyTypes } from '@/hooks/usePropertyTypes';

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

const STATUS_OPTIONS = [
  { label: "Sales", value: "sales" },
  { label: "New Developments", value: "new-developments" },
];

export const QuickSearch: React.FC = () => {
  const navigate = useNavigate();
  const { locations, loading: locationsLoading } = useLocations();
  const { flattenedTypes, loading: typesLoading } = usePropertyTypes();

  const [reference, setReference] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [status, setStatus] = useState("sales");

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.append("transactionType", "sale");

    if (reference.trim()) params.append("reference", reference.trim());
    if (location && location !== "any") params.append("location", location);
    if (propertyType && propertyType !== "any") params.append("propertyType", propertyType);
    if (bedrooms && bedrooms !== "any") params.append("bedrooms", bedrooms);
    if (priceMin && priceMin !== "any") params.append("priceMin", priceMin);
    if (priceMax && priceMax !== "any") params.append("priceMax", priceMax);
    if (status === "new-developments") params.append("newDevs", "only");

    navigate(`/en/properties?${params.toString()}`);
  };

  const handleReset = () => {
    setReference("");
    setLocation("");
    setPropertyType("");
    setBedrooms("");
    setPriceMin("");
    setPriceMax("");
    setStatus("sales");
  };

  const isLoading = locationsLoading || typesLoading;

  // Shared styles for premium inputs
  const inputStyles = "h-12 bg-white/80 border-0 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[0_0_0_2px_hsl(var(--prime-gold)/0.4),0_4px_12px_hsl(var(--prime-gold)/0.15)] focus:ring-0 focus:ring-offset-0 transition-all duration-300 placeholder:text-slate-400";
  
  const selectTriggerStyles = "h-12 bg-white/80 border-0 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] hover:bg-white hover:shadow-md focus:shadow-[0_0_0_2px_hsl(var(--prime-gold)/0.4),0_4px_12px_hsl(var(--prime-gold)/0.15)] focus:ring-0 focus:ring-offset-0 transition-all duration-300";
  
  const labelStyles = "text-xs font-serif font-medium text-prime-900/70 uppercase tracking-widest";

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Outer wrapper with decorative 3D elements */}
        <div className="relative">
          {/* Floating decorative orbs */}
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-prime-gold/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-6 -right-10 w-40 h-40 bg-prime-gold/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-prime-gold/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Small floating particles */}
          <div className="absolute top-8 right-20 w-2 h-2 rounded-full bg-prime-gold/50 animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-12 left-16 w-1.5 h-1.5 rounded-full bg-prime-gold/40 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-prime-gold/60 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

          {/* Main glass-morphism card */}
          <div className="relative backdrop-blur-xl bg-white/90 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.5)_inset] rounded-2xl p-6 md:p-8 space-y-5 hover:shadow-[0_20px_60px_hsl(var(--prime-gold)/0.12)] transition-all duration-500">
            
            {/* Subtle top border accent */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-prime-gold/40 to-transparent" />
            
            {/* Row 1: Reference, Location, Property Type, Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Reference */}
              <div className="space-y-2">
                <label className={labelStyles}>Reference</label>
                <Input
                  placeholder="e.g. R5014453"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputStyles}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className={labelStyles}>Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className={selectTriggerStyles}>
                    {locationsLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder="Any Location" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/60 shadow-xl z-50 rounded-xl">
                    <SelectItem value="any">Any Location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <label className={labelStyles}>Property Type</label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className={selectTriggerStyles}>
                    {typesLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder="Any Type" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/60 shadow-xl z-50 max-h-80 rounded-xl">
                    <SelectItem value="any">Any Type</SelectItem>
                    {flattenedTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <div className="space-y-2">
                <label className={`${labelStyles} invisible`}>Search</label>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-prime-gold to-prime-goldLight text-prime-900 font-semibold rounded-xl shadow-lg shadow-prime-gold/30 hover:shadow-xl hover:shadow-prime-gold/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-0"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search Properties
                </Button>
              </div>
            </div>

            {/* Row 2: Bedrooms, Min Price, Max Price, Status, Reset */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Bedrooms */}
              <div className="space-y-2">
                <label className={labelStyles}>Bedrooms</label>
                <Select value={bedrooms} onValueChange={setBedrooms}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/60 shadow-xl z-50 rounded-xl">
                    {BEDROOM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Price */}
              <div className="space-y-2">
                <label className={labelStyles}>Min. Price</label>
                <Select value={priceMin} onValueChange={setPriceMin}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/60 shadow-xl z-50 rounded-xl">
                    {PRICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any-min"} value={opt.value || "any"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Price */}
              <div className="space-y-2">
                <label className={labelStyles}>Max. Price</label>
                <Select value={priceMax} onValueChange={setPriceMax}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/60 shadow-xl z-50 rounded-xl">
                    {PRICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "any-max"} value={opt.value || "any"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className={labelStyles}>Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className={selectTriggerStyles}>
                    <SelectValue placeholder="Sales" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl border-white/60 shadow-xl z-50 rounded-xl">
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <div className="space-y-2">
                <label className={`${labelStyles} invisible`}>Reset</label>
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="w-full h-12 text-slate-500 hover:text-prime-gold hover:bg-prime-gold/10 rounded-xl border border-slate-200/50 hover:border-prime-gold/30 transition-all duration-300"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
