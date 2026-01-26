import { Language } from '@/types/home';
import { propertyFinderEn } from './en';
import { propertyFinderNl } from './nl';
import { propertyFinderDe } from './de';
import { propertyFinderFr } from './fr';
import { propertyFinderSv } from './sv';
import { propertyFinderNo } from './no';
import { propertyFinderDa } from './da';
import { propertyFinderFi } from './fi';
import { propertyFinderPl } from './pl';
import { propertyFinderHu } from './hu';

export type PropertyFinderTranslations = typeof propertyFinderEn;

const translations: Record<Language, PropertyFinderTranslations> = {
  [Language.EN]: propertyFinderEn,
  [Language.NL]: propertyFinderNl,
  [Language.DE]: propertyFinderDe,
  [Language.FR]: propertyFinderFr,
  [Language.SV]: propertyFinderSv,
  [Language.NO]: propertyFinderNo,
  [Language.DA]: propertyFinderDa,
  [Language.FI]: propertyFinderFi,
  [Language.PL]: propertyFinderPl,
  [Language.HU]: propertyFinderHu,
};

export const getPropertyFinderTranslation = (lang: Language): PropertyFinderTranslations => {
  return translations[lang] || translations[Language.EN];
};

export {
  propertyFinderEn,
  propertyFinderNl,
  propertyFinderDe,
  propertyFinderFr,
  propertyFinderSv,
  propertyFinderNo,
  propertyFinderDa,
  propertyFinderFi,
  propertyFinderPl,
  propertyFinderHu,
};
