import { Language } from '../../types/home';
import { en } from './en';
import { nl } from './nl';
import { fr } from './fr';
import { de } from './de';
import { fi } from './fi';
import { pl } from './pl';
import { da } from './da';
import { hu } from './hu';
import { sv } from './sv';
import { no } from './no';

// Use a flexible type that allows for optional properties across languages
type TranslationBase = Omit<typeof en, 'brochures' | 'whyChooseUs' | 'team' | 'aboutUs'> & { 
  brochures: Record<string, unknown>;
  whyChooseUs?: typeof en.whyChooseUs;
  team?: typeof en.team;
  aboutUs?: Record<string, unknown>;
};

export const translations: Record<Language, TranslationBase> = {
  [Language.EN]: en as TranslationBase,
  [Language.NL]: nl as TranslationBase,
  [Language.FR]: fr as TranslationBase,
  [Language.DE]: de as TranslationBase,
  [Language.FI]: fi as TranslationBase,
  [Language.PL]: pl as TranslationBase,
  [Language.DA]: da as TranslationBase,
  [Language.HU]: hu as TranslationBase,
  [Language.SV]: sv as TranslationBase,
  [Language.NO]: no as TranslationBase,
};
