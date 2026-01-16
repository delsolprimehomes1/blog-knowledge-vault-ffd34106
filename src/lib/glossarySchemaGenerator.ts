import { truncateForAEO } from "./aeoUtils";

interface GlossaryTerm {
  term: string;
  full_name: string;
  definition: string;
  related_terms: string[];
  see_also: string[];
}

interface GlossaryCategory {
  title: string;
  description: string;
  terms: GlossaryTerm[];
}

interface GlossaryData {
  version: string;
  last_updated: string;
  total_terms: number;
  categories: Record<string, GlossaryCategory>;
}

const BASE_URL = "https://www.delsolprimehomes.com";

// Localized glossary names for each language
const GLOSSARY_NAMES: Record<string, string> = {
  en: "Costa del Sol Real Estate Glossary",
  nl: "Costa del Sol Vastgoed Woordenlijst",
  de: "Costa del Sol Immobilien Glossar",
  fr: "Glossaire Immobilier Costa del Sol",
  fi: "Costa del Sol Kiinteistösanasto",
  pl: "Słownik Nieruchomości Costa del Sol",
  da: "Costa del Sol Ejendomsordliste",
  hu: "Costa del Sol Ingatlan Szójegyzék",
  sv: "Costa del Sol Fastighetsordlista",
  no: "Costa del Sol Eiendomsordliste",
};

// Localized descriptions
const GLOSSARY_DESCRIPTIONS: Record<string, string> = {
  en: "Comprehensive glossary of Spanish property, tax, legal, and real estate terms for international buyers. Expert-compiled definitions for NIE, IBI, Golden Visa, and 60+ essential terms.",
  nl: "Uitgebreide woordenlijst van Spaanse eigendoms-, belasting-, juridische en vastgoedtermen voor internationale kopers. Door experts samengestelde definities voor NIE, IBI, Golden Visa en 60+ essentiële termen.",
  de: "Umfassendes Glossar spanischer Immobilien-, Steuer-, Rechts- und Immobilienbegriffe für internationale Käufer. Von Experten zusammengestellte Definitionen für NIE, IBI, Golden Visa und 60+ wesentliche Begriffe.",
  fr: "Glossaire complet des termes immobiliers, fiscaux, juridiques et immobiliers espagnols pour les acheteurs internationaux. Définitions compilées par des experts pour NIE, IBI, Golden Visa et plus de 60 termes essentiels.",
  fi: "Kattava sanasto espanjalaisista kiinteistö-, vero-, oikeudellisista ja kiinteistötermeistä kansainvälisille ostajille. Asiantuntijoiden kokoamat määritelmät NIE, IBI, Golden Visa ja yli 60 oleelliselle termille.",
  pl: "Kompleksowy słownik hiszpańskich terminów nieruchomości, podatkowych, prawnych i nieruchomościowych dla międzynarodowych nabywców. Definicje opracowane przez ekspertów dla NIE, IBI, Golden Visa i ponad 60 niezbędnych terminów.",
  da: "Omfattende ordliste over spanske ejendoms-, skatte-, juridiske og ejendomstermer for internationale købere. Ekspertkompilerede definitioner for NIE, IBI, Golden Visa og 60+ essentielle termer.",
  hu: "Átfogó szójegyzék a spanyol ingatlan-, adó-, jogi és ingatlanterminológiáról nemzetközi vásárlók számára. Szakértők által összeállított definíciók NIE, IBI, Golden Visa és 60+ alapvető kifejezéshez.",
  sv: "Omfattande ordlista över spanska fastighets-, skatte-, juridiska och fastighetstermer för internationella köpare. Expertsammanställda definitioner för NIE, IBI, Golden Visa och 60+ väsentliga termer.",
  no: "Omfattende ordliste over spanske eiendoms-, skatte-, juridiske og eiendomsbegreper for internasjonale kjøpere. Ekspertkompilerte definisjoner for NIE, IBI, Golden Visa og 60+ essensielle begreper.",
};

// OG Locale mapping
const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  nl: "nl_NL",
  de: "de_DE",
  fr: "fr_FR",
  fi: "fi_FI",
  pl: "pl_PL",
  da: "da_DK",
  hu: "hu_HU",
  sv: "sv_SE",
  no: "nb_NO",
};

// Author/Expert for E-E-A-T signals
const glossaryAuthor = {
  "@type": "Person",
  "name": "Hans Beeckman",
  "jobTitle": "Licensed Real Estate Consultant",
  "worksFor": {
    "@type": "RealEstateAgent",
    "name": "Del Sol Prime Homes",
    "url": BASE_URL
  },
  "knowsAbout": [
    "Spanish Property Law",
    "Costa del Sol Real Estate",
    "Spanish Tax System",
    "Golden Visa Spain",
    "NIE Application Process"
  ]
};

const organizationSchema = {
  "@type": "RealEstateAgent",
  "name": "Del Sol Prime Homes",
  "url": BASE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": `${BASE_URL}/assets/logo-new.png`,
    "width": 400,
    "height": 100
  },
  "sameAs": [
    "https://www.linkedin.com/company/del-sol-prime-homes"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
    "addressLocality": "Fuengirola",
    "addressRegion": "Málaga",
    "postalCode": "29640",
    "addressCountry": "ES"
  }
};

export function getGlossaryName(language: string): string {
  return GLOSSARY_NAMES[language] || GLOSSARY_NAMES.en;
}

export function getGlossaryDescription(language: string): string {
  return GLOSSARY_DESCRIPTIONS[language] || GLOSSARY_DESCRIPTIONS.en;
}

export function getOGLocale(language: string): string {
  return OG_LOCALES[language] || OG_LOCALES.en;
}

export function generateDefinedTermSetSchema(glossaryData: GlossaryData, language: string = 'en') {
  const allTerms: GlossaryTerm[] = [];
  
  Object.values(glossaryData.categories).forEach(category => {
    allTerms.push(...category.terms);
  });

  const glossaryUrl = `${BASE_URL}/${language}/glossary`;

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": glossaryUrl,
    "name": getGlossaryName(language),
    "description": getGlossaryDescription(language),
    "url": glossaryUrl,
    "inLanguage": language,
    "author": glossaryAuthor,
    "publisher": organizationSchema,
    "datePublished": "2024-01-15",
    "dateModified": glossaryData.last_updated,
    "numberOfItems": glossaryData.total_terms,
    "hasDefinedTerm": allTerms.map(term => ({
      "@type": "DefinedTerm",
      "name": term.term,
      "description": term.definition,
      "termCode": term.term.toLowerCase().replace(/\s+/g, '-'),
      "inDefinedTermSet": glossaryUrl,
      "url": `${glossaryUrl}#${term.term.toLowerCase().replace(/\s+/g, '-')}`
    }))
  };
}

export function generateGlossaryWebPageSchema(glossaryData: GlossaryData, language: string = 'en') {
  const glossaryUrl = `${BASE_URL}/${language}/glossary`;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${glossaryUrl}#webpage`,
    "url": glossaryUrl,
    "name": getGlossaryName(language),
    "description": getGlossaryDescription(language),
    "isPartOf": {
      "@type": "WebSite",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL
    },
    "about": {
      "@type": "Thing",
      "name": "Spanish Real Estate Terminology"
    },
    "mainEntity": {
      "@type": "DefinedTermSet",
      "@id": glossaryUrl
    },
    "author": glossaryAuthor,
    "publisher": organizationSchema,
    "datePublished": "2024-01-15",
    "dateModified": glossaryData.last_updated,
    "inLanguage": language,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${glossaryUrl}?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

export function generateGlossaryBreadcrumbSchema(language: string = 'en') {
  const glossaryUrl = `${BASE_URL}/${language}/glossary`;
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${BASE_URL}/${language}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": getGlossaryName(language),
        "item": glossaryUrl
      }
    ]
  };
}

export function generateGlossarySpeakableSchema(language: string = 'en') {
  const glossaryUrl = `${BASE_URL}/${language}/glossary`;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [
        ".glossary-term-name",
        ".glossary-term-definition",
        ".glossary-category-title"
      ]
    },
    "url": glossaryUrl
  };
}

// ItemList schema for each category - enhances AI understanding
export function generateCategoryItemListSchemas(glossaryData: GlossaryData, language: string = 'en') {
  const glossaryUrl = `${BASE_URL}/${language}/glossary`;
  
  const itemLists = Object.entries(glossaryData.categories).map(([key, category]) => ({
    "@type": "ItemList",
    "@id": `${glossaryUrl}#category-${key}`,
    "name": category.title,
    "description": category.description,
    "numberOfItems": category.terms.length,
    "itemListOrder": "https://schema.org/ItemListOrderAscending",
    "itemListElement": category.terms.map((term, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": term.term,
      "description": term.definition,
      "url": `${glossaryUrl}#${term.term.toLowerCase().replace(/\s+/g, '-')}`
    }))
  }));

  return itemLists;
}

// FAQPage schema for popular terms - great for featured snippets
export function generateGlossaryFAQSchema(glossaryData: GlossaryData, language: string = 'en') {
  const glossaryUrl = `${BASE_URL}/${language}/glossary`;
  
  // Select top 10 most important terms for FAQ schema
  const popularTerms = [
    "NIE", "Golden Visa", "IBI", "Escritura", "Plusvalía", 
    "Notario", "Gestor", "Comunidad", "Catastro", "API"
  ];
  
  const allTerms: GlossaryTerm[] = [];
  Object.values(glossaryData.categories).forEach(category => {
    allTerms.push(...category.terms);
  });

  const faqTerms = allTerms.filter(term => 
    popularTerms.some(p => term.term.toLowerCase().includes(p.toLowerCase()))
  ).slice(0, 10);

  if (faqTerms.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${glossaryUrl}#faq`,
    "mainEntity": faqTerms.map(term => ({
      "@type": "Question",
      "name": `What is ${term.term} in Spanish real estate?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": truncateForAEO(term.definition)
      }
    }))
  };
}

// Organization schema with expertise signals
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE_URL}#organization`,
    "name": "Del Sol Prime Homes",
    "url": BASE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${BASE_URL}/assets/logo-new.png`,
      "width": 400,
      "height": 100
    },
    "description": "Expert real estate consultancy specializing in Costa del Sol properties for international buyers. Licensed professionals with deep knowledge of Spanish property law and tax regulations.",
    "areaServed": {
      "@type": "Place",
      "name": "Costa del Sol, Spain"
    },
    "knowsAbout": [
      "Spanish Real Estate",
      "Costa del Sol Properties",
      "Golden Visa Spain",
      "Spanish Property Law",
      "International Property Investment"
    ],
    "slogan": "Your Gateway to Costa del Sol Living"
  };
}

export function generateAllGlossarySchemas(glossaryData: GlossaryData, language: string = 'en') {
  const categoryItemLists = generateCategoryItemListSchemas(glossaryData, language);
  const faqSchema = generateGlossaryFAQSchema(glossaryData, language);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphItems: any[] = [
    generateDefinedTermSetSchema(glossaryData, language),
    generateGlossaryWebPageSchema(glossaryData, language),
    generateGlossaryBreadcrumbSchema(language),
    generateGlossarySpeakableSchema(language),
    generateOrganizationSchema(),
    ...categoryItemLists
  ];

  // Add FAQ schema if we have terms
  if (faqSchema) {
    graphItems.push(faqSchema);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graphItems
  };
}
