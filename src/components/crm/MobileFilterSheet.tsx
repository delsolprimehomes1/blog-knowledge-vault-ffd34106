import React, { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Filter,
  Search,
  X,
  Flame,
  Star,
  AlertTriangle,
  Minus,
} from "lucide-react";

// Filter options configuration
const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualified", color: "bg-green-500" },
  { value: "negotiating", label: "Negotiating", color: "bg-purple-500" },
  { value: "closed_won", label: "Closed Won", color: "bg-emerald-500" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-gray-500" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "nl", label: "Dutch", flag: "🇳🇱" },
  { value: "sv", label: "Swedish", flag: "🇸🇪" },
  { value: "da", label: "Danish", flag: "🇩🇰" },
  { value: "no", label: "Norwegian", flag: "🇳🇴" },
  { value: "fi", label: "Finnish", flag: "🇫🇮" },
];

const SEGMENT_OPTIONS = [
  { value: "active_buyer", label: "Active Buyer" },
  { value: "investor", label: "Investor" },
  { value: "passive_looker", label: "Passive Looker" },
  { value: "seller", label: "Seller" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", icon: Flame, color: "text-red-500" },
  { value: "high", label: "High", icon: Star, color: "text-orange-500" },
  { value: "normal", label: "Normal", icon: AlertTriangle, color: "text-blue-500" },
  { value: "low", label: "Low", icon: Minus, color: "text-gray-400" },
];

export interface FilterState {
  search: string;
  status: string[];
  language: string[];
  segment: string[];
  priority: string[];
}

interface MobileFilterSheetProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function MobileFilterSheet({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync local filters with props when sheet opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  // Toggle a value in an array filter
  const toggleArrayValue = useCallback((key: keyof FilterState, value: string) => {
    setLocalFilters((prev) => {
      const current = prev[key] as string[];
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValues };
    });
  }, []);

  // Apply filters
  const handleApply = useCallback(() => {
    // Apply all local filters
    Object.entries(localFilters).forEach(([key, value]) => {
      onFilterChange(key as keyof FilterState, value);
    });
    setIsOpen(false);
  }, [localFilters, onFilterChange]);

  // Clear all local filters
  const handleClear = useCallback(() => {
    const clearedFilters: FilterState = {
      search: "",
      status: [],
      language: [],
      segment: [],
      priority: [],
    };
    setLocalFilters(clearedFilters);
  }, []);

  // Count active filters
  const activeFilterCount =
    (localFilters.status.length > 0 ? 1 : 0) +
    (localFilters.language.length > 0 ? 1 : 0) +
    (localFilters.segment.length > 0 ? 1 : 0) +
    (localFilters.priority.length > 0 ? 1 : 0) +
    (localFilters.search ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-12 gap-2 relative"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground"
              >
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={localFilters.search}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10 h-12 text-base"
                />
                {localFilters.search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                    onClick={() =>
                      setLocalFilters((prev) => ({ ...prev, search: "" }))
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={localFilters.status.includes(option.value) ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "h-11 gap-2",
                      localFilters.status.includes(option.value) && "bg-primary"
                    )}
                    onClick={() => toggleArrayValue("status", option.value)}
                  >
                    <span
                      className={cn("w-2 h-2 rounded-full", option.color)}
                    />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={localFilters.priority.includes(option.value) ? "default" : "outline"}
                      size="lg"
                      className={cn(
                        "h-11 gap-2",
                        localFilters.priority.includes(option.value) && "bg-primary"
                      )}
                      onClick={() => toggleArrayValue("priority", option.value)}
                    >
                      <Icon className={cn("w-4 h-4", option.color)} />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Language
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={localFilters.language.includes(option.value) ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "h-11 gap-2",
                      localFilters.language.includes(option.value) && "bg-primary"
                    )}
                    onClick={() => toggleArrayValue("language", option.value)}
                  >
                    <span>{option.flag}</span>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Segment */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Segment
              </label>
              <div className="flex flex-wrap gap-2">
                {SEGMENT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={localFilters.segment.includes(option.value) ? "default" : "outline"}
                    size="lg"
                    className="h-11"
                    onClick={() => toggleArrayValue("segment", option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="flex-shrink-0 pt-4 border-t gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-12"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12"
            onClick={handleApply}
          >
            Apply Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
