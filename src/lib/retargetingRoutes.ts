export const retargetingRoutes = [
  { path: '/en/welcome-back', lang: 'en', slug: 'welcome-back' },
  { path: '/nl/welkom-terug', lang: 'nl', slug: 'welkom-terug' },
  { path: '/de/willkommen-zurueck', lang: 'de', slug: 'willkommen-zurueck' },
  { path: '/fr/bienvenue', lang: 'fr', slug: 'bienvenue' },
  { path: '/es/bienvenido', lang: 'es', slug: 'bienvenido' },
  { path: '/pl/witamy-ponownie', lang: 'pl', slug: 'witamy-ponownie' },
  { path: '/sv/valkommen-tillbaka', lang: 'sv', slug: 'valkommen-tillbaka' },
  { path: '/da/velkommen-tilbage', lang: 'da', slug: 'velkommen-tilbage' },
  { path: '/hu/udvozoljuk-ujra', lang: 'hu', slug: 'udvozoljuk-ujra' },
  { path: '/fi/tervetuloa-takaisin', lang: 'fi', slug: 'tervetuloa-takaisin' },
  { path: '/no/velkommen-tilbake', lang: 'no', slug: 'velkommen-tilbake' },
] as const;

export type RetargetingRoute = typeof retargetingRoutes[number];

// Get retargeting URL for a specific language
export const getRetargetingUrl = (lang: string): string => {
  const route = retargetingRoutes.find(r => r.lang === lang);
  return route ? route.path : '/en/welcome-back';
};

// Get language from current path
export const getLanguageFromPath = (path: string): string => {
  const route = retargetingRoutes.find(r => r.path === path);
  return route ? route.lang : 'en';
};

// Check if current path is a retargeting page
export const isRetargetingPath = (path: string): boolean => {
  return retargetingRoutes.some(r => r.path === path);
};
