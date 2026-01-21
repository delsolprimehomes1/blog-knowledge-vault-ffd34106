import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  X,
  Flame,
  Star,
  Circle,
  Minus,
} from "lucide-react";
import {
  getLanguageFlag,
  getStatusBadgeClass,
  getSegmentStyle,
  ALL_STATUSES,
  ALL_SEGMENTS,
  ALL_PRIORITIES,
  formatStatus,
  formatSegment,
  PRIORITY_CONFIG,
} from "@/lib/crm-conditional-styles";
import type { FilterState } from "@/hooks/useAgentLeadsTable";
import { cn } from "@/lib/utils";

interface LeadsFilterBarProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const LANGUAGES = ["en", "nl", "de", "fr", "es", "fi", "pl", "sv", "da", "hu", "no"];

export function LeadsFilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: LeadsFilterBarProps) {
  // Debounced search
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange("search", e.target.value);
    },
    [onFilterChange]
  );

  const toggleArrayFilter = useCallback(
    <K extends keyof FilterState>(
      key: K,
      value: string,
      checked: boolean
    ) => {
      const current = filters[key] as string[];
      const newValue = checked
        ? [...current, value]
        : current.filter((v) => v !== value);
      onFilterChange(key, newValue as FilterState[K]);
    },
    [filters, onFilterChange]
  );

  const getPriorityIcon = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    if (!config) return <Circle className="w-3 h-3" />;
    
    switch (config.icon) {
      case 'Flame':
        return <Flame className={cn("w-3 h-3", config.color, config.animation)} />;
      case 'Star':
        return <Star className={cn("w-3 h-3", config.color)} />;
      case 'Circle':
        return <Circle className={cn("w-3 h-3", config.color)} />;
      case 'Minus':
        return <Minus className={cn("w-3 h-3", config.color)} />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.status.includes(status)}
              onCheckedChange={(checked) =>
                toggleArrayFilter("status", status, checked)
              }
            >
              <Badge
                variant="outline"
                className={cn("mr-2 text-xs", getStatusBadgeClass(status))}
              >
                {formatStatus(status)}
              </Badge>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Language Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            🌐 Language
            {filters.language.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.language.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel>Filter by Language</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LANGUAGES.map((lang) => (
            <DropdownMenuCheckboxItem
              key={lang}
              checked={filters.language.includes(lang)}
              onCheckedChange={(checked) =>
                toggleArrayFilter("language", lang, checked)
              }
            >
              <span className="mr-2">{getLanguageFlag(lang)}</span>
              {lang.toUpperCase()}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Segment Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Segment
            {filters.segment.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.segment.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Segment</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_SEGMENTS.map((segment) => (
            <DropdownMenuCheckboxItem
              key={segment}
              checked={filters.segment.includes(segment)}
              onCheckedChange={(checked) =>
                toggleArrayFilter("segment", segment, checked)
              }
            >
              <Badge className={cn("mr-2 text-xs", getSegmentStyle(segment))}>
                {formatSegment(segment)}
              </Badge>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Priority
            {filters.priority.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.priority.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_PRIORITIES.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priority.includes(priority)}
              onCheckedChange={(checked) =>
                toggleArrayFilter("priority", priority, checked)
              }
            >
              <span className="flex items-center gap-2">
                {getPriorityIcon(priority)}
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}
