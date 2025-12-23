import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  available: boolean;
  slug?: string;
}

const LANGUAGES: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  nl: { name: 'Dutch', flag: '🇳🇱' },
  hu: { name: 'Hungarian', flag: '🇭🇺' },
  de: { name: 'German', flag: '🇩🇪' },
  fr: { name: 'French', flag: '🇫🇷' },
  sv: { name: 'Swedish', flag: '🇸🇪' },
  pl: { name: 'Polish', flag: '🇵🇱' },
  no: { name: 'Norwegian', flag: '🇳🇴' },
  fi: { name: 'Finnish', flag: '🇫🇮' },
  da: { name: 'Danish', flag: '🇩🇰' },
};

interface ContentLanguageSwitcherProps {
  currentLanguage: string;
  hreflangGroupId?: string | null;
  contentType: 'qa' | 'blog' | 'location' | 'comparison';
  currentSlug?: string;
  variant?: 'default' | 'hero';
}

export function ContentLanguageSwitcher({
  currentLanguage,
  hreflangGroupId,
  contentType,
  currentSlug,
  variant = 'default',
}: ContentLanguageSwitcherProps) {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLanguageVersions = async () => {
      // Default: only current language available
      const defaultLanguages = Object.entries(LANGUAGES).map(([code, { name, flag }]) => ({
        code,
        name,
        flag,
        available: code === currentLanguage,
        slug: code === currentLanguage ? currentSlug : undefined,
      }));

      if (!hreflangGroupId) {
        setLanguages(defaultLanguages);
        setLoading(false);
        return;
      }

      try {
        let data: { language: string; slug: string }[] | null = null;
        
        if (contentType === 'qa') {
          const result = await supabase
            .from('qa_pages')
            .select('language, slug')
            .eq('hreflang_group_id', hreflangGroupId)
            .eq('status', 'published');
          if (result.error) throw result.error;
          data = result.data;
        } else if (contentType === 'blog') {
          const result = await supabase
            .from('blog_articles')
            .select('language, slug')
            .eq('hreflang_group_id', hreflangGroupId)
            .eq('status', 'published');
          if (result.error) throw result.error;
          data = result.data;
        } else if (contentType === 'location') {
          // location_pages uses city_slug/topic_slug instead of slug
          const result = await supabase
            .from('location_pages')
            .select('language, city_slug, topic_slug')
            .eq('hreflang_group_id', hreflangGroupId)
            .eq('status', 'published');
          if (result.error) throw result.error;
          // Combine city_slug/topic_slug into a single slug format
          data = (result.data || []).map(item => ({
            language: item.language,
            slug: `${item.city_slug}/${item.topic_slug}`
          }));
        } else {
          const result = await supabase
            .from('comparison_pages')
            .select('language, slug')
            .eq('hreflang_group_id', hreflangGroupId)
            .eq('status', 'published');
          if (result.error) throw result.error;
          data = result.data;
        }

        // Create map of available languages
        const availableLanguages = new Map(
          (data || []).map(item => [item.language, item.slug])
        );

        const languageOptions = Object.entries(LANGUAGES).map(([code, { name, flag }]) => ({
          code,
          name,
          flag,
          available: availableLanguages.has(code),
          slug: availableLanguages.get(code),
        }));

        setLanguages(languageOptions);
      } catch (error) {
        console.error('Error fetching language versions:', error);
        setLanguages(defaultLanguages);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguageVersions();
  }, [hreflangGroupId, currentLanguage, contentType, currentSlug]);

  const handleLanguageChange = (language: LanguageOption) => {
    if (!language.available || !language.slug) return;

    const pathPrefix = contentType === 'qa' ? 'qa' :
                      contentType === 'blog' ? 'blog' :
                      contentType === 'location' ? 'locations' :
                      'compare';

    navigate(`/${language.code}/${pathPrefix}/${language.slug}`);
  };

  const currentLang = languages.find(l => l.code === currentLanguage) || {
    code: currentLanguage,
    name: LANGUAGES[currentLanguage]?.name || currentLanguage.toUpperCase(),
    flag: LANGUAGES[currentLanguage]?.flag || '🌐',
    available: true,
  };

  const buttonClasses = variant === 'hero' 
    ? "bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 gap-2"
    : "gap-2";

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className={buttonClasses}>
        <span className="text-base">{LANGUAGES[currentLanguage]?.flag || '🌐'}</span>
        <span className="font-medium">{currentLanguage.toUpperCase()}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={buttonClasses}>
          <span className="text-base">{currentLang.flag}</span>
          <span className="font-medium">{currentLang.code.toUpperCase()}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border z-50">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language)}
            disabled={!language.available}
            className={`
              flex items-center gap-3 cursor-pointer
              ${language.code === currentLanguage ? 'bg-accent' : ''}
              ${!language.available ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className="text-xl">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {language.code === currentLanguage && (
              <span className="text-xs text-muted-foreground">Current</span>
            )}
            {!language.available && (
              <span className="text-xs text-muted-foreground">N/A</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
