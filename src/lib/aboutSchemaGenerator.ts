// About Page Schema Generator for comprehensive JSON-LD
// Supports: Organization, LocalBusiness, Person, FAQPage, BreadcrumbList, WebPage with Speakable
import { truncateForAEO } from "./aeoUtils";

interface Founder {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  credentials: string[];
  years_experience: number;
  languages: string[];
  specialization: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Citation {
  source: string;
  url: string;
  text: string;
}

interface AboutPageContent {
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  speakable_summary: string;
  hero_headline: string;
  hero_subheadline: string;
  mission_statement: string;
  years_in_business: number;
  properties_sold: number;
  client_satisfaction_percent: number;
  faq_entities: FAQ[];
  citations: Citation[];
  founders: Founder[];
  language: string;
}

const BASE_URL = 'https://www.delsolprimehomes.com';

// Hardcoded founder data with LinkedIn URLs for entity disambiguation
export const FOUNDERS_DATA: Founder[] = [
  {
    name: "Steven Roberts",
    role: "Co-Founder & Director",
    bio: "British real estate professional with 20+ years experience in Costa del Sol. Specializes in luxury villa sales and new developments.",
    photo_url: "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/steven-roberts.jpg",
    linkedin_url: "https://www.linkedin.com/company/delsolprimehomes/",
    credentials: ["API Licensed Agent", "RICS Affiliate"],
    years_experience: 20,
    languages: ["English", "Spanish"],
    specialization: "Luxury Villas & New Developments"
  },
  {
    name: "Hans Beeckman",
    role: "Co-Founder & Sales Director",
    bio: "Belgian real estate expert with deep knowledge of the Dutch and Belgian buyer market. 35+ years guiding international clients through Spanish property purchases.",
    photo_url: "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/hans-beeckman.jpg",
    linkedin_url: "https://www.linkedin.com/in/hansbeeckman/",
    credentials: ["API Licensed Agent", "Property Investment Specialist"],
    years_experience: 15,
    languages: ["Dutch", "French", "English", "Spanish"],
    specialization: "International Buyers & Investment Properties"
  },
  {
    name: "Cédric Van Hecke",
    role: "Co-Founder & Client Relations",
    bio: "Belgian real estate consultant specializing in client relations and after-sales support. Expert in helping buyers navigate Spanish bureaucracy.",
    photo_url: "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/cedric-vanhecke.jpg",
    linkedin_url: "https://www.linkedin.com/company/delsolprimehomes/",
    credentials: ["API Licensed Agent", "NIE & Residency Specialist"],
    years_experience: 12,
    languages: ["Dutch", "French", "English", "Spanish"],
    specialization: "Client Relations & Legal Coordination"
  }
];

// API Credential Schema (company-level)
export function generateAPICredentialSchema() {
  return {
    "@type": "EducationalOccupationalCredential",
    "@id": `${BASE_URL}/#api-credential`,
    "credentialCategory": "license",
    "name": "Agente de la Propiedad Inmobiliaria (API)",
    "description": "Official Spanish real estate agent license issued by the professional college",
    "recognizedBy": {
      "@type": "Organization",
      "name": "Colegio Oficial de Agentes de la Propiedad Inmobiliaria",
      "url": "https://www.consejocoapis.org/"
    }
  };
}

// Organization Schema (RealEstateAgent type)
export function generateOrganizationSchema(content: AboutPageContent) {
  return {
    "@type": ["Organization", "RealEstateAgent"],
    "@id": `${BASE_URL}/#organization`,
    "name": "Del Sol Prime Homes",
    "alternateName": "DSPH",
    "url": BASE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png",
      "width": 400,
      "height": 100
    },
    "image": "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png",
    "description": content.speakable_summary,
    "foundingDate": "2010",
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "minValue": 3,
      "maxValue": 10
    },
    "slogan": "Your Trusted Partners in Costa del Sol Real Estate",
    "knowsAbout": [
      "Costa del Sol Real Estate",
      "Spanish Property Law",
      "International Property Purchases",
      "Marbella Properties",
      "Estepona Real Estate",
      "NIE Applications",
      "Golden Visa Spain"
    ],
    "areaServed": [
      { "@type": "City", "name": "Marbella", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Estepona", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Benalmádena", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Fuengirola", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Mijas", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Torremolinos", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Manilva", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Casares", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Sotogrande", "containedInPlace": { "@type": "AdministrativeArea", "name": "Cádiz" } }
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
      "addressLocality": "Fuengirola",
      "postalCode": "29640",
      "addressRegion": "Málaga",
      "addressCountry": "ES"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+34 630 03 90 90",
        "contactType": "sales",
        "availableLanguage": ["English", "Spanish", "Dutch", "French", "German"]
      },
      {
        "@type": "ContactPoint",
        "email": "info@delsolprimehomes.com",
        "contactType": "customer service"
      }
    ],
    "sameAs": [
      "https://www.facebook.com/delsolprimehomes",
      "https://www.instagram.com/delsolprimehomes",
      "https://www.linkedin.com/company/delsolprimehomes"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": content.properties_sold.toString(),
      "bestRating": "5",
      "worstRating": "1"
    },
    "founder": FOUNDERS_DATA.map((f, i) => ({ "@id": `${BASE_URL}/about#founder-${i + 1}` })),
    "employee": FOUNDERS_DATA.map((f, i) => ({ "@id": `${BASE_URL}/about#founder-${i + 1}` })),
    "hasCredential": { "@id": `${BASE_URL}/#api-credential` }
  };
}

// LocalBusiness Schema
export function generateLocalBusinessSchema(content: AboutPageContent) {
  return {
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/#localbusiness`,
    "name": "Del Sol Prime Homes",
    "image": "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png",
    "priceRange": "€€€",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Avenida Ricardo Soriano",
      "addressLocality": "Marbella",
      "postalCode": "29601",
      "addressRegion": "Málaga",
      "addressCountry": "ES"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 36.5090,
      "longitude": -4.8826
    },
    "url": BASE_URL,
    "telephone": "+34 630 03 90 90",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "10:00",
        "closes": "14:00"
      }
    ],
    "currenciesAccepted": "EUR",
    "paymentAccepted": "Bank Transfer, Cash",
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 36.5090,
        "longitude": -4.8826
      },
      "geoRadius": "100 km"
    }
  };
}

// Person Schema for founders (E-E-A-T)
export function generatePersonSchemas(founders: Founder[]) {
  return founders.map((founder, index) => ({
    "@type": "Person",
    "@id": `${BASE_URL}/about#founder-${index + 1}`,
    "name": founder.name,
    "jobTitle": founder.role,
    "description": founder.bio,
    "image": founder.photo_url.startsWith('http') ? founder.photo_url : `${BASE_URL}${founder.photo_url}`,
    "url": founder.linkedin_url,
    "sameAs": [founder.linkedin_url],
    "worksFor": {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`
    },
    "knowsAbout": [
      "Costa del Sol Real Estate",
      founder.specialization,
      "Spanish Property Market"
    ],
    "knowsLanguage": founder.languages.map(lang => ({
      "@type": "Language",
      "name": lang
    })),
    "hasCredential": founder.credentials.map(cred => ({
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Professional Certification",
      "name": cred
    })),
    "hasOccupation": {
      "@type": "Occupation",
      "name": "Real Estate Agent",
      "occupationLocation": {
        "@type": "City",
        "name": "Marbella"
      },
      "estimatedSalary": {
        "@type": "MonetaryAmountDistribution",
        "currency": "EUR"
      }
    }
  }));
}

// FAQPage Schema (AEO)
export function generateFAQPageSchema(faqs: FAQ[]) {
  if (!faqs || faqs.length === 0) return null;
  
  return {
    "@type": "FAQPage",
    "@id": `${BASE_URL}/about#faq`,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": truncateForAEO(faq.answer)
      }
    }))
  };
}

// BreadcrumbList Schema
export function generateBreadcrumbSchema() {
  return {
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}/about#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": BASE_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "About Us",
        "item": `${BASE_URL}/about`
      }
    ]
  };
}

// WebPage with SpeakableSpecification (AEO)
export function generateWebPageSchema(content: AboutPageContent) {
  return {
    "@type": "WebPage",
    "@id": `${BASE_URL}/about#webpage`,
    "url": `${BASE_URL}/about`,
    "name": content.meta_title,
    "description": content.meta_description,
    "inLanguage": content.language || "en",
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "Del Sol Prime Homes",
      "publisher": {
        "@id": `${BASE_URL}/#organization`
      }
    },
    "about": {
      "@id": `${BASE_URL}/#organization`
    },
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [
        ".speakable-summary",
        ".mission-statement",
        "h1",
        ".faq-answer"
      ]
    },
    "mainContentOfPage": {
      "@type": "WebPageElement",
      "cssSelector": "main"
    }
  };
}

// AboutPage specific schema
export function generateAboutPageSchema(content: AboutPageContent) {
  return {
    "@type": "AboutPage",
    "@id": `${BASE_URL}/about#aboutpage`,
    "url": `${BASE_URL}/about`,
    "name": content.meta_title,
    "description": content.meta_description,
    "mainEntity": {
      "@id": `${BASE_URL}/#organization`
    },
    "significantLink": content.citations.map(c => c.url)
  };
}

// Generate complete schema graph
export function generateAllAboutSchemas(content: AboutPageContent): string {
  // Use hardcoded founders if none provided from database
  const founders = content.founders && content.founders.length > 0 
    ? content.founders 
    : FOUNDERS_DATA;

  const schemas = [
    generateOrganizationSchema({ ...content, founders }),
    generateLocalBusinessSchema(content),
    generateAPICredentialSchema(), // API license credential
    ...generatePersonSchemas(founders), // Person schemas with LinkedIn sameAs
    generateFAQPageSchema(content.faq_entities || []),
    generateBreadcrumbSchema(),
    generateWebPageSchema(content),
    generateAboutPageSchema(content)
  ].filter(Boolean);

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": schemas
  });
}

// Export individual generators for flexibility
export {
  type AboutPageContent,
  type Founder,
  type FAQ,
  type Citation
};
