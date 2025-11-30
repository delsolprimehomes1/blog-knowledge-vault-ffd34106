export enum Language {
  EN = 'EN',
  NL = 'NL',
  FR = 'FR',
  DE = 'DE',
  FI = 'FI',
  PL = 'PL',
  DA = 'DA',
  HU = 'HU',
  SV = 'SV',
  NO = 'NO'
}

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
