import { Language } from '../../types/home';
import { en } from './en';
import { es } from './es';
import { nl } from './nl';
import { fr } from './fr';
import { de } from './de';
import { fi } from './fi';
import { pl } from './pl';
import { da } from './da';
import { hu } from './hu';
import { sv } from './sv';
import { no } from './no';
import { it } from './it';
import { ru } from './ru';
import { tr } from './tr';

// Use a flexible type that allows for brochure structure variations across languages
type TranslationBase = Omit<typeof en, 'brochures'> & { brochures: Record<string, unknown> };

export const translations: Record<Language, TranslationBase> = {
  [Language.EN]: en,
  [Language.ES]: es,
  [Language.NL]: nl as TranslationBase,
  [Language.FR]: fr as TranslationBase,
  [Language.DE]: de as TranslationBase,
  [Language.FI]: fi as TranslationBase,
  [Language.PL]: pl as TranslationBase,
  [Language.DA]: da as TranslationBase,
  [Language.HU]: hu as TranslationBase,
  [Language.SV]: sv as TranslationBase,
  [Language.NO]: no as TranslationBase,
  [Language.IT]: it,
  [Language.RU]: ru,
  [Language.TR]: tr,
};
