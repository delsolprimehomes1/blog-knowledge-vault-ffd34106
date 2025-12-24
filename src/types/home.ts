export enum Language {
  EN = 'en',
  NL = 'nl',
  FR = 'fr',
  DE = 'de',
  FI = 'fi',
  PL = 'pl',
  DA = 'da',
  HU = 'hu',
  SV = 'sv',
  NO = 'no',
  IT = 'it',
  RU = 'ru',
  TR = 'tr',
}

export interface LanguageInfo {
  code: Language;
  name: string;
  flag: string;
  nativeName: string;
}

export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { code: Language.EN, name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: Language.NL, name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: Language.FR, name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: Language.DE, name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: Language.FI, name: 'Finnish', flag: '🇫🇮', nativeName: 'Suomi' },
  { code: Language.PL, name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
  { code: Language.DA, name: 'Danish', flag: '🇩🇰', nativeName: 'Dansk' },
  { code: Language.HU, name: 'Hungarian', flag: '🇭🇺', nativeName: 'Magyar' },
  { code: Language.SV, name: 'Swedish', flag: '🇸🇪', nativeName: 'Svenska' },
  { code: Language.NO, name: 'Norwegian', flag: '🇳🇴', nativeName: 'Norsk' },
  { code: Language.IT, name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: Language.RU, name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
  { code: Language.TR, name: 'Turkish', flag: '🇹🇷', nativeName: 'Türkçe' },
];

export interface NavLink {
  label: string;
  href: string; // Relative path, e.g., '/property-finder'
}

export interface Area {
  id: string;
  name: string;
  image: string;
  description: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
}

export interface SearchParams {
  budget: string;
  location: string;
  purpose: string;
}
