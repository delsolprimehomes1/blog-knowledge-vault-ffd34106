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
 * Centralized company address information.
 */
export const COMPANY_ADDRESS = {
  street: 'C. Alfonso XIII, 6',
  building: 'ED SAN FERNAN',
  floor: '1 OFICINA',
  postalCode: '29640',
  city: 'Fuengirola',
  province: 'Málaga',
  country: 'Spain',
  full: 'ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA, 29640 Fuengirola, Málaga, Spain',
  googleMapsUrl: 'https://maps.app.goo.gl/wHXoXoaAQJBbzUyz5',
  googleMapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3205.1234567890123!2d-4.6234567890123456!3d36.54321098765432!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sED%20SAN%20FERNAN!5e0!3m2!1sen!2ses!4v1234567890123!5m2!1sen!2ses'
} as const;

/**
 * Centralized company office hours.
 */
export const COMPANY_HOURS = {
  weekdays: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '14:00' },
  sunday: null, // Closed
  timezone: 'CET'
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
