import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Clock, Circle } from "lucide-react";

export interface LanguageStatus {
  code: string;
  name: string;
  flag: string;
  count: number;
  needed: number;
  status: 'complete' | 'partial' | 'not_started';
}

const ALL_LANGUAGES: LanguageStatus[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', count: 0, needed: 6, status: 'not_started' },
  { code: 'de', name: 'German', flag: '🇩🇪', count: 0, needed: 6, status: 'not_started' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', count: 0, needed: 6, status: 'not_started' },
  { code: 'fr', name: 'French', flag: '🇫🇷', count: 0, needed: 6, status: 'not_started' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', count: 0, needed: 6, status: 'not_started' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', count: 0, needed: 6, status: 'not_started' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', count: 0, needed: 6, status: 'not_started' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺', count: 0, needed: 6, status: 'not_started' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', count: 0, needed: 6, status: 'not_started' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', count: 0, needed: 6, status: 'not_started' },
];

interface LanguageStatusGridProps {
  languageCounts: Record<string, number>;
  englishCount: number;
  onTranslate?: (languageCode: string) => void;
  isTranslating?: boolean;
  currentlyTranslating?: string | null;
  compact?: boolean;
}

export function LanguageStatusGrid({
  languageCounts,
  englishCount,
  onTranslate,
  isTranslating = false,
  currentlyTranslating = null,
  compact = false,
}: LanguageStatusGridProps) {
  const needed = englishCount || 6;
  
  const languages = ALL_LANGUAGES.map(lang => {
    const count = languageCounts[lang.code] || 0;
    let status: 'complete' | 'partial' | 'not_started' = 'not_started';
    if (count >= needed) status = 'complete';
    else if (count > 0) status = 'partial';
    
    return { ...lang, count, needed, status };
  });

  const getStatusIcon = (status: LanguageStatus['status'], langCode: string) => {
    if (currentlyTranslating === langCode) {
      return <Clock className="w-3 h-3 text-blue-500 animate-spin" />;
    }
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'partial':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      default:
        return <Circle className="w-3 h-3 text-muted-foreground/40" />;
    }
  };

  if (compact) {
    return (
      <div className="flex gap-0.5 flex-wrap">
        {languages.map(lang => (
          <TooltipProvider key={lang.code}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 px-1 py-0.5 text-xs rounded bg-muted/50">
                  <span>{lang.flag}</span>
                  {getStatusIcon(lang.status, lang.code)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{lang.name}</p>
                <p className="text-xs">{lang.count}/{lang.needed} articles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {languages.map(lang => (
        <TooltipProvider key={lang.code}>
          <Tooltip>
            <TooltipTrigger asChild>
              {onTranslate && lang.code !== 'en' ? (
                <Button
                  variant={lang.status === 'complete' ? 'outline' : 'secondary'}
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={() => onTranslate(lang.code)}
                  disabled={isTranslating || lang.code === 'en'}
                >
                  <span className="text-sm">{lang.flag}</span>
                  {getStatusIcon(lang.status, lang.code)}
                </Button>
              ) : (
                <div className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
                  lang.status === 'complete' ? 'bg-green-500/10 border border-green-500/20' :
                  lang.status === 'partial' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  'bg-muted/50 border border-transparent'
                }`}>
                  <span>{lang.flag}</span>
                  {getStatusIcon(lang.status, lang.code)}
                </div>
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{lang.name}: {lang.count}/{lang.needed} articles</p>
              <p className="text-xs text-muted-foreground">
                {lang.status === 'complete' 
                  ? 'Complete - Click to regenerate' 
                  : lang.status === 'partial' 
                    ? 'Click to resume translation' 
                    : lang.code === 'en' 
                      ? 'Source language'
                      : 'Click to start translation'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
