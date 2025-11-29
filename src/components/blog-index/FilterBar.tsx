import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

interface FilterBarProps {
  selectedCategory: string;
  selectedLanguage: string;
  categories: Array<{ id: string; name: string }>;
  onCategoryChange: (category: string) => void;
  onLanguageChange: (language: string) => void;
  onClearFilters: () => void;
  resultCount: number;
}

const LANGUAGES = [
  { code: "all", flag: "🌍", name: "All Languages" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "German" },
  { code: "nl", flag: "🇳🇱", name: "Dutch" },
  { code: "fr", flag: "🇫🇷", name: "French" },
  { code: "pl", flag: "🇵🇱", name: "Polish" },
  { code: "sv", flag: "🇸🇪", name: "Swedish" },
  { code: "da", flag: "🇩🇰", name: "Danish" },
  { code: "hu", flag: "🇭🇺", name: "Hungarian" },
  { code: "fi", flag: "🇫🇮", name: "Finnish" },
  { code: "no", flag: "🇳🇴", name: "Norwegian" },
];

export const FilterBar = ({
  selectedCategory,
  selectedLanguage,
  categories,
  onCategoryChange,
  onLanguageChange,
  onClearFilters,
  resultCount,
}: FilterBarProps) => {
  const hasActiveFilters = selectedCategory !== "all" || selectedLanguage !== "all";
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name;
  const selectedLanguageName = LANGUAGES.find(l => l.code === selectedLanguage)?.name;

  return (
    <div className="space-y-4 mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-base">Filters:</span>
        </div>

        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full md:w-[200px] h-12 md:h-10 text-base md:text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-full md:w-[200px] h-12 md:h-10 text-base md:text-sm">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {language.flag} {language.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="min-h-[44px] md:min-h-[36px] w-full md:w-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="gap-2 py-2 px-3 text-sm">
              {selectedCategoryName}
              <button 
                onClick={() => onCategoryChange("all")}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedLanguage !== "all" && (
            <Badge variant="secondary" className="gap-2 py-2 px-3 text-sm">
              {selectedLanguageName}
              <button 
                onClick={() => onLanguageChange("all")}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <p className="text-base md:text-sm text-muted-foreground font-medium">
        Showing {resultCount} {resultCount === 1 ? 'article' : 'articles'}
      </p>
    </div>
  );
};
