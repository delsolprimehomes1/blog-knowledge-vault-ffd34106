import { CityBrochureData } from '@/constants/brochures';

const BASE_URL = 'https://www.delsolprimehomes.com';

interface BrochureSchemaOptions {
  city: CityBrochureData;
  language?: string;
}

export const generateBrochureSchemas = ({ city, language = 'en' }: BrochureSchemaOptions): string => {
  const schemas = [
    generatePlaceSchema(city),
    generateRealEstateAgentSchema(city),
    generateBreadcrumbSchema(city),
    generateFAQSchema(city),
    generateSpeakableSchema(city),
  ];

  return JSON.stringify(schemas);
};

const generatePlaceSchema = (city: CityBrochureData) => ({
  '@context': 'https://schema.org',
  '@type': 'Place',
  name: city.name,
  description: `${city.name} - Premium real estate destination on Spain's Costa del Sol. Luxury villas, apartments, and investment properties.`,
  geo: {
    '@type': 'GeoCoordinates',
    latitude: city.coordinates.lat,
    longitude: city.coordinates.lng,
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: city.name,
    addressRegion: 'Andalucía',
    addressCountry: 'ES',
  },
  containedInPlace: {
    '@type': 'Place',
    name: 'Costa del Sol',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Málaga',
      addressCountry: 'ES',
    },
  },
});

const generateRealEstateAgentSchema = (city: CityBrochureData) => ({
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  name: 'Del Sol Prime Homes',
  description: `API-accredited real estate agency specializing in luxury properties in ${city.name} and across the Costa del Sol.`,
  url: BASE_URL,
  logo: `${BASE_URL}/logo-new.png`,
  telephone: '+34600000000',
  email: 'info@delsolprimehomes.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Calle Example 123',
    addressLocality: 'Marbella',
    addressRegion: 'Málaga',
    postalCode: '29660',
    addressCountry: 'ES',
  },
  areaServed: [
    {
      '@type': 'Place',
      name: city.name,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: city.coordinates.lat,
        longitude: city.coordinates.lng,
      },
    },
    {
      '@type': 'Place',
      name: 'Costa del Sol',
    },
  ],
  knowsLanguage: ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'],
  hasCredential: {
    '@type': 'EducationalOccupationalCredential',
    credentialCategory: 'API Registration',
    name: 'API-Accredited Real Estate Professional',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '127',
    bestRating: '5',
    worstRating: '1',
  },
});

const generateBreadcrumbSchema = (city: CityBrochureData) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: BASE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Locations',
      item: `${BASE_URL}/brochures/marbella`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: city.name,
      item: `${BASE_URL}/brochures/${city.slug}`,
    },
  ],
});

const generateFAQSchema = (city: CityBrochureData) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: `Why invest in property in ${city.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${city.name} offers exceptional investment potential with strong capital appreciation, high rental yields, and year-round demand from international buyers. The Costa del Sol enjoys over 320 days of sunshine, world-class amenities, and excellent connectivity to major European cities.`,
      },
    },
    {
      '@type': 'Question',
      name: `What types of properties are available in ${city.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${city.name} offers a diverse range of properties including ${city.propertyTypes.slice(0, 3).join(', ')}. From contemporary apartments to luxury villas, there are options for every lifestyle and budget.`,
      },
    },
    {
      '@type': 'Question',
      name: `Which are the best neighborhoods in ${city.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `The most sought-after neighborhoods in ${city.name} include ${city.neighborhoods.slice(0, 4).join(', ')}. Each area offers unique characteristics, from beachfront living to golf course views.`,
      },
    },
    {
      '@type': 'Question',
      name: 'Do you offer support for foreign buyers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Del Sol Prime Homes specializes in guiding international buyers through the Spanish property purchase process. Our multilingual team speaks English, Dutch, German, French, Polish, Swedish, Danish, Hungarian, Finnish, and Norwegian. We provide end-to-end support from property search to key handover.',
      },
    },
  ],
});

const generateSpeakableSchema = (city: CityBrochureData) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: `Luxury Properties in ${city.name} | Del Sol Prime Homes`,
  description: `Discover exceptional real estate opportunities in ${city.name}. Expert guidance for international buyers seeking luxury properties on Spain's Costa del Sol.`,
  url: `${BASE_URL}/brochures/${city.slug}`,
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.brochure-hero h1', '.brochure-hero p', '.lifestyle-narrative h2', '.lifestyle-narrative p'],
  },
  inLanguage: 'en-GB',
});

export const generateBrochureMetaTags = (city: CityBrochureData) => ({
  title: `Luxury Properties in ${city.name} | Costa del Sol Real Estate | Del Sol Prime Homes`,
  description: `Discover exceptional investment opportunities and lifestyle properties in ${city.name}. Expert guidance from API-accredited advisors. Luxury villas, apartments & new developments.`,
  keywords: `${city.name} real estate, ${city.name} property, Costa del Sol investment, luxury villas ${city.name}, apartments ${city.name}, Spanish property`,
  ogTitle: `${city.name} - Premium Real Estate on the Costa del Sol`,
  ogDescription: `Explore luxury properties in ${city.name}. From beachfront apartments to exclusive villas, find your dream home with expert guidance.`,
  ogImage: city.heroImage,
  canonical: `${BASE_URL}/brochures/${city.slug}`,
});
