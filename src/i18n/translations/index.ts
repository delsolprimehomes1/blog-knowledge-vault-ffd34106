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

export const translations: Record<Language, typeof en> = {
  [Language.EN]: en,
  [Language.ES]: es,
  [Language.NL]: nl,
  [Language.FR]: fr,
  [Language.DE]: de,
  [Language.FI]: fi,
  [Language.PL]: pl,
  [Language.DA]: da,
  [Language.HU]: hu,
  [Language.SV]: sv,
  [Language.NO]: no,
  [Language.IT]: it,
  [Language.RU]: ru,
  [Language.TR]: tr,
};
