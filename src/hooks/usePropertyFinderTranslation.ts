import { useContext } from 'react';
import { LanguageContext } from '@/i18n/LanguageContext';
import { getPropertyFinderTranslation, PropertyFinderTranslations } from '@/i18n/translations/propertyFinder';
import { Language } from '@/types/home';

export const usePropertyFinderTranslation = (): { 
  t: PropertyFinderTranslations; 
  currentLanguage: Language 
} => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    return { 
      t: getPropertyFinderTranslation(Language.EN), 
      currentLanguage: Language.EN 
    };
  }
  
  const { currentLanguage } = context;
  const t = getPropertyFinderTranslation(currentLanguage);
  
  return { t, currentLanguage };
};
