import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface FilterState {
  hasImage: 'all' | 'yes' | 'no';
  hasCitations: 'all' | 'yes' | 'no';
  language: string;
  funnelStage: string;
  status: string;
  wordCount: 'all' | 'short' | 'ok' | 'long';
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  languageOptions: string[];
  clusterOptions?: { id: string; theme: string }[];
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱' },
  { code: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { code: 'da', label: 'Danish', flag: '🇩🇰' },
  { code: 'hu', label: 'Hungarian', flag: '🇭🇺' },
  { code: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { code: 'no', label: 'Norwegian', flag: '🇳🇴' },
];

export function AdvancedFilters({ 
  filters, 
  onFiltersChange, 
  languageOptions,
}: AdvancedFiltersProps) {
  const hasActiveFilters = 
    filters.hasImage !== 'all' ||
    filters.hasCitations !== 'all' ||
    filters.language !== 'all' ||
    filters.funnelStage !== 'all' ||
    filters.status !== 'all' ||
    filters.wordCount !== 'all';

  const resetFilters = () => {
    onFiltersChange({
      hasImage: 'all',
      hasCitations: 'all',
      language: 'all',
      funnelStage: 'all',
      status: 'all',
      wordCount: 'all',
    });
  };

  const activeFilterCount = [
    filters.hasImage !== 'all',
    filters.hasCitations !== 'all',
    filters.language !== 'all',
    filters.funnelStage !== 'all',
    filters.status !== 'all',
    filters.wordCount !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">Filters</div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2">
            <X className="h-3 w-3 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Has Image */}
        <Select
          value={filters.hasImage}
          onValueChange={(v) => onFiltersChange({ ...filters, hasImage: v as FilterState['hasImage'] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Has Image" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (Image)</SelectItem>
            <SelectItem value="yes">✓ Has Image</SelectItem>
            <SelectItem value="no">✗ No Image</SelectItem>
          </SelectContent>
        </Select>

        {/* Has Citations */}
        <Select
          value={filters.hasCitations}
          onValueChange={(v) => onFiltersChange({ ...filters, hasCitations: v as FilterState['hasCitations'] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Has Citations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (Citations)</SelectItem>
            <SelectItem value="yes">✓ Has Citations</SelectItem>
            <SelectItem value="no">✗ No Citations</SelectItem>
          </SelectContent>
        </Select>

        {/* Language */}
        <Select
          value={filters.language}
          onValueChange={(v) => onFiltersChange({ ...filters, language: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languageOptions.map((lang) => {
              const langInfo = LANGUAGES.find(l => l.code === lang);
              return (
                <SelectItem key={lang} value={lang}>
                  {langInfo ? `${langInfo.flag} ${langInfo.label}` : lang.toUpperCase()}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Funnel Stage */}
        <Select
          value={filters.funnelStage}
          onValueChange={(v) => onFiltersChange({ ...filters, funnelStage: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Funnel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="TOFU">TOFU</SelectItem>
            <SelectItem value="MOFU">MOFU</SelectItem>
            <SelectItem value="BOFU">BOFU</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Word Count */}
        <Select
          value={filters.wordCount}
          onValueChange={(v) => onFiltersChange({ ...filters, wordCount: v as FilterState['wordCount'] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Word Count" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lengths</SelectItem>
            <SelectItem value="short">&lt; 1500 words</SelectItem>
            <SelectItem value="ok">1500-2500 words</SelectItem>
            <SelectItem value="long">&gt; 2500 words</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {filters.hasImage !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Image: {filters.hasImage === 'yes' ? '✓' : '✗'}
            </Badge>
          )}
          {filters.hasCitations !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Citations: {filters.hasCitations === 'yes' ? '✓' : '✗'}
            </Badge>
          )}
          {filters.language !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.language.toUpperCase()}
            </Badge>
          )}
          {filters.funnelStage !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.funnelStage}
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.status}
            </Badge>
          )}
          {filters.wordCount !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filters.wordCount === 'short' ? '< 1500w' : filters.wordCount === 'long' ? '> 2500w' : '1500-2500w'}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
