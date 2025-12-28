import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, ChevronDown, Check, Clock, Circle } from "lucide-react";

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  count: number;
  needed: number;
  status: 'complete' | 'partial' | 'not_started';
}

const ALL_LANGUAGES: Omit<LanguageOption, 'count' | 'needed' | 'status'>[] = [
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
];

interface TranslateDropdownProps {
  languageCounts: Record<string, number>;
  englishCount: number;
  onTranslate: (languageCode: string) => void;
  onTranslateAll?: () => void;
  isTranslating?: boolean;
  currentlyTranslating?: string | null;
  disabled?: boolean;
}

export function TranslateDropdown({
  languageCounts,
  englishCount,
  onTranslate,
  onTranslateAll,
  isTranslating = false,
  currentlyTranslating = null,
  disabled = false,
}: TranslateDropdownProps) {
  const needed = englishCount || 6;
  
  const languages: LanguageOption[] = ALL_LANGUAGES.map(lang => {
    const count = languageCounts[lang.code] || 0;
    let status: 'complete' | 'partial' | 'not_started' = 'not_started';
    if (count >= needed) status = 'complete';
    else if (count > 0) status = 'partial';
    
    return { ...lang, count, needed, status };
  });

  const incompleteLanguages = languages.filter(l => l.status !== 'complete');
  const completedCount = languages.filter(l => l.status === 'complete').length;
  const totalLanguages = languages.length;

  const getStatusIcon = (status: LanguageOption['status'], langCode: string) => {
    if (currentlyTranslating === langCode) {
      return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground/40" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled || isTranslating}
          className="gap-2"
        >
          <Languages className="w-4 h-4" />
          Translate
          <span className="text-xs text-muted-foreground">
            ({completedCount}/{totalLanguages})
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Translate to:
        </div>
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => onTranslate(lang.code)}
            disabled={isTranslating}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {lang.count}/{lang.needed}
              </span>
              {getStatusIcon(lang.status, lang.code)}
            </div>
          </DropdownMenuItem>
        ))}
        
        {onTranslateAll && incompleteLanguages.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onTranslateAll}
              disabled={isTranslating}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌍</span>
                <span>All Languages</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">
                {incompleteLanguages.length} remaining
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
