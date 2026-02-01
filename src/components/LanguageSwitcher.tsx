import { useContext } from 'react';
import { LanguageContext } from '@/i18n/LanguageContext';
import { Language } from '@/types/home';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export const LanguageSwitcher = ({ variant = 'default', className = '' }: LanguageSwitcherProps) => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    console.error('LanguageSwitcher must be used within LanguageProvider');
    return null;
  }

  const { currentLanguage, availableLanguages, switchLanguage } = context;

  const currentLangInfo = availableLanguages.find(l => l.code === currentLanguage);

  const handleChange = (value: string) => {
    switchLanguage(value as Language);
  };

  if (variant === 'compact') {
    return (
      <Select value={currentLanguage} onValueChange={handleChange}>
        <SelectTrigger className={`w-[70px] bg-transparent ${className}`}>
          <SelectValue>
            {currentLangInfo?.flag} {currentLanguage.toUpperCase()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-[120]">
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.code.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'icon') {
    return (
      <Select value={currentLanguage} onValueChange={handleChange}>
        <SelectTrigger className={`w-[50px] bg-transparent ${className}`}>
          <SelectValue>
            {currentLangInfo?.flag}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-[120]">
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={currentLanguage} onValueChange={handleChange}>
      <SelectTrigger className={`w-[160px] bg-transparent ${className}`}>
        <SelectValue>
          {currentLangInfo?.flag} {currentLangInfo?.nativeName}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border border-border z-[120]">
        {availableLanguages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.flag} {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
