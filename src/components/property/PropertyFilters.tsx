import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCATIONS, PROPERTY_TYPES } from "@/constants/home";
import type { PropertySearchParams } from "@/types/property";
import { Search, RotateCcw, MapPin, Home, DollarSign, Bed, Bath, Sparkles } from "lucide-react";

interface PropertyFiltersProps {
  onSearch: (params: PropertySearchParams) => void;
  initialParams?: PropertySearchParams;
}

export const PropertyFilters = ({ onSearch, initialParams }: PropertyFiltersProps) => {
  const [location, setLocation] = useState(initialParams?.location || "");
  // SALES-ONLY: Transaction type is hard-locked to 'sale'
  const [propertyType, setPropertyType] = useState(initialParams?.propertyType || "");
  const [priceMin, setPriceMin] = useState(initialParams?.priceMin?.toString() || "");
  const [priceMax, setPriceMax] = useState(initialParams?.priceMax?.toString() || "");
  const [bedrooms, setBedrooms] = useState(initialParams?.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initialParams?.bathrooms?.toString() || "");

  const handleSearch = () => {
    const params: PropertySearchParams = {
      location: location || undefined,
      transactionType: 'sale', // HARD-LOCKED: Sales only
      propertyType: propertyType || undefined,
      priceMin: priceMin ? parseInt(priceMin) : undefined,
      priceMax: priceMax ? parseInt(priceMax) : undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
    };
    onSearch(params);
  };

  const handleReset = () => {
    setLocation("");
    setPropertyType("");
    setPriceMin("");
    setPriceMax("");
    setBedrooms("");
    setBathrooms("");
    onSearch({ transactionType: 'sale' }); // HARD-LOCKED: Sales only
  };

  return (
    <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden
      border border-slate-200/50
      shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_20px_40px_-12px_rgba(0,0,0,0.12)]
      transition-all duration-500 hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08),0_25px_50px_-15px_rgba(0,0,0,0.18)]">
      
      {/* Decorative Gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-amber-500 to-primary" />
      
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Find Properties for Sale</h2>
            <p className="text-xs text-muted-foreground">Browse Costa del Sol real estate</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            Location
          </Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value} className="rounded-lg">
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Home className="w-4 h-4 text-primary" />
            Property Type
          </Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="rounded-lg">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 text-primary" />
            Price Range (EUR)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors"
            />
            <Input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Bedrooms & Bathrooms in a Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Bedrooms */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bed className="w-4 h-4 text-primary" />
              Beds
            </Label>
            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()} className="rounded-lg">
                    {num}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bath className="w-4 h-4 text-primary" />
              Baths
            </Label>
            <Select value={bathrooms} onValueChange={setBathrooms}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {[1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()} className="rounded-lg">
                    {num}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Button 
            onClick={handleSearch} 
            className="w-full h-12 rounded-xl font-semibold
              bg-gradient-to-r from-primary to-amber-600 
              hover:from-primary/90 hover:to-amber-600/90
              shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30
              transform hover:-translate-y-0.5
              transition-all duration-300"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Properties
          </Button>
          <Button 
            onClick={handleReset} 
            variant="ghost" 
            className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
