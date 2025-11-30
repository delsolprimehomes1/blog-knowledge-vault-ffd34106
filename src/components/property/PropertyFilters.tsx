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
import { Search } from "lucide-react";

interface PropertyFiltersProps {
  onSearch: (params: PropertySearchParams) => void;
  initialParams?: PropertySearchParams;
}

export const PropertyFilters = ({ onSearch, initialParams }: PropertyFiltersProps) => {
  const [location, setLocation] = useState(initialParams?.location || "");
  const [propertyType, setPropertyType] = useState(initialParams?.propertyType || "");
  const [priceMin, setPriceMin] = useState(initialParams?.priceMin?.toString() || "");
  const [priceMax, setPriceMax] = useState(initialParams?.priceMax?.toString() || "");
  const [bedrooms, setBedrooms] = useState(initialParams?.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initialParams?.bathrooms?.toString() || "");

  const handleSearch = () => {
    const params: PropertySearchParams = {
      location: location || undefined,
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
    onSearch({});
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-display font-bold">Filter Properties</h2>

      {/* Location */}
      <div className="space-y-2">
        <Label>Location</Label>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <Label>Property Type</Label>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger>
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label>Price Range (EUR)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div className="space-y-2">
        <Label>Bedrooms</Label>
        <Select value={bedrooms} onValueChange={setBedrooms}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bathrooms */}
      <div className="space-y-2">
        <Label>Bathrooms</Label>
        <Select value={bathrooms} onValueChange={setBathrooms}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button onClick={handleSearch} className="w-full">
          <Search className="w-4 h-4 mr-2" />
          Search Properties
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full">
          Reset Filters
        </Button>
      </div>
    </div>
  );
};
