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

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="bg-gray-200 rounded-xl p-4 md:p-6 space-y-4 shadow-lg">
          {/* Row 1: Reference, Location, Property Type, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Reference */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Reference</label>
              <Input
                placeholder="e.g. R5014453"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-11 bg-white border-gray-300 focus:border-primary"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Location</label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-11 bg-white border-gray-300">
                  {locationsLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <SelectValue placeholder="Any Location" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Property Type</label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-11 bg-white border-gray-300">
                  {typesLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <SelectValue placeholder="Any Type" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-white z-50 max-h-80">
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide invisible">Search</label>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Row 2: Bedrooms, Min Price, Max Price, Status, Reset */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Bedrooms */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Bedrooms</label>
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger className="h-11 bg-white border-gray-300">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {BEDROOM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || "any"} value={opt.value || "any"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Min. Price</label>
              <Select value={priceMin} onValueChange={setPriceMin}>
                <SelectTrigger className="h-11 bg-white border-gray-300">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {PRICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || "any-min"} value={opt.value || "any"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Max. Price</label>
              <Select value={priceMax} onValueChange={setPriceMax}>
                <SelectTrigger className="h-11 bg-white border-gray-300">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {PRICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || "any-max"} value={opt.value || "any"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 bg-white border-gray-300">
                  <SelectValue placeholder="Sales" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide invisible">Reset</label>
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full h-11 border-gray-400 hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
