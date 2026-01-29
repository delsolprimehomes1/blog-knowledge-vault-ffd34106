/**
 * Centralized company contact information.
 * Update these values in one place to reflect across the entire site.
 */
export const COMPANY_CONTACT = {
  phone: '+34 630 03 90 90',
  phoneClean: '34630039090',
  email: 'info@delsolprimehomes.com',
  whatsappBase: 'https://wa.me/34630039090',
  whatsappWithMessage: (msg: string) => 
    `https://wa.me/34630039090?text=${encodeURIComponent(msg)}`,
} as const;

/**
 * Centralized company facts and statistics.
 * Update these values in one place to reflect across the entire site.
 */
export const COMPANY_FACTS = {
  /** Total years of combined experience in the founding team */
  yearsExperience: 35,
  
  /** Year the company was established */
  foundedYear: 1990,
  
  /** Number of properties sold/helped with */
  propertiesSold: 500,
  
  /** Client satisfaction percentage */
  clientSatisfaction: 98,
  
  /** Number of happy clients/buyers */
  happyClients: 1000,
  
  /** Number of supported languages */
  languages: 10,
  
  /** Number of available locations */
  locations: 50,
  
  /** Number of properties in portfolio */
  propertiesInPortfolio: 7000,
} as const;

/**
 * Formatted display values for UI components
 */
export const COMPANY_DISPLAY = {
  yearsExperience: `${COMPANY_FACTS.yearsExperience}+`,
  propertiesSold: `${COMPANY_FACTS.propertiesSold}+`,
  happyClients: `${COMPANY_FACTS.happyClients}+`,
  languages: `${COMPANY_FACTS.languages}+`,
  locations: `${COMPANY_FACTS.locations}+`,
  propertiesInPortfolio: `${COMPANY_FACTS.propertiesInPortfolio.toLocaleString()}+`,
  clientSatisfaction: `${COMPANY_FACTS.clientSatisfaction}%`,
} as const;
