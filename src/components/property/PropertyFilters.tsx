import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Loader2 } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { usePropertyTypes } from "@/hooks/usePropertyTypes";
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

  const [reference, setReference] = useState(initialParams.reference || "");
  const [location, setLocation] = useState(initialParams.location || "");
  const [sublocation, setSublocation] = useState(initialParams.sublocation || "");
  const [propertyType, setPropertyType] = useState(initialParams.propertyType || "");
  const [bedrooms, setBedrooms] = useState(initialParams.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initialParams.bathrooms?.toString() || "");
  const [priceMin, setPriceMin] = useState(initialParams.priceMin?.toString() || "");
  const [priceMax, setPriceMax] = useState(initialParams.priceMax?.toString() || "");
  const [status, setStatus] = useState(initialParams.newDevs === "only" ? "new-developments" : "sales");

  // Update local state when initialParams change
  useEffect(() => {
    setReference(initialParams.reference || "");
    setLocation(initialParams.location || "");
    setSublocation(initialParams.sublocation || "");
    setPropertyType(initialParams.propertyType || "");
    setBedrooms(initialParams.bedrooms?.toString() || "");
    setBathrooms(initialParams.bathrooms?.toString() || "");
    setPriceMin(initialParams.priceMin?.toString() || "");
    setPriceMax(initialParams.priceMax?.toString() || "");
    setStatus(initialParams.newDevs === "only" ? "new-developments" : "sales");
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
    setStatus("sales");
    onSearch({ transactionType: "sale" });
  };

  const isLoading = locationsLoading || typesLoading;

  return (
    <div className="bg-gray-200 rounded-xl p-4 md:p-6 space-y-4">
      {/* Row 1: Reference, Location, Sublocation, Property Type, Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
          <Select value={location} onValueChange={(val) => { setLocation(val); setSublocation(""); }}>
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

        {/* Sublocation */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sublocation</label>
          <Select value={sublocation} onValueChange={setSublocation} disabled={!location || location === "any"}>
            <SelectTrigger className="h-11 bg-white border-gray-300 disabled:opacity-50">
              <SelectValue placeholder="Any Sublocation" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="any">Any Sublocation</SelectItem>
              {/* Sublocations would be fetched based on location */}
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
            Search{resultCount !== undefined && ` (${resultCount})`}
          </Button>
        </div>
      </div>

      {/* Row 2: Bedrooms, Bathrooms, Min Price, Max Price, Status, Reset */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Bedrooms */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Bedrooms</label>
          <Select value={bedrooms} onValueChange={setBedrooms}>
            <SelectTrigger className="h-11 bg-white border-gray-300">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              {BEDROOM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "any-bed"} value={opt.value || "any"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bathrooms */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Bathrooms</label>
          <Select value={bathrooms} onValueChange={setBathrooms}>
            <SelectTrigger className="h-11 bg-white border-gray-300">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              {BATHROOM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "any-bath"} value={opt.value || "any"}>
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
  );
};
