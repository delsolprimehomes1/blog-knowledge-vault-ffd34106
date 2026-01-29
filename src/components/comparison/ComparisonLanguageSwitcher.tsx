import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
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

interface ComparisonLanguageSwitcherProps {
  currentLanguage: string;
  translations: Record<string, string> | null;
  currentSlug: string;
}

export function ComparisonLanguageSwitcher({ 
  currentLanguage, 
  translations,
  currentSlug,
}: ComparisonLanguageSwitcherProps) {
  // Build available languages map (include current)
  const availableLanguages: Record<string, string> = {
    [currentLanguage]: currentSlug,
    ...(translations || {}),
  };

  const availableLangCodes = Object.keys(availableLanguages);
  
  // Only show if there are translations
  if (availableLangCodes.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      <span className="text-xs text-muted-foreground mr-2">Available in:</span>
      {LANGUAGES.filter(lang => availableLangCodes.includes(lang.code)).map(lang => {
        const slug = availableLanguages[lang.code];
        const isActive = lang.code === currentLanguage;
        
        return (
          <Link 
            key={lang.code}
            to={`/${lang.code}/compare/${slug}`}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted hover:bg-primary/10 hover:text-primary"
            )}
          >
            <span>{lang.flag}</span>
            <span className="uppercase text-xs">{lang.code}</span>
          </Link>
        );
      })}
    </div>
  );
}
