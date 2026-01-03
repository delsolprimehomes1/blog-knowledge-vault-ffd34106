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

export function generateDefinedTermSetSchema(glossaryData: GlossaryData) {
  const allTerms: GlossaryTerm[] = [];
  
  Object.values(glossaryData.categories).forEach(category => {
    allTerms.push(...category.terms);
  });

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${BASE_URL}/glossary`,
    "name": "Costa del Sol Real Estate Glossary",
    "description": "Comprehensive glossary of Spanish property, tax, legal, and real estate terms for international buyers. Expert-compiled definitions for NIE, IBI, Golden Visa, and 60+ essential terms.",
    "url": `${BASE_URL}/glossary`,
    "inLanguage": "en",
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
      "inDefinedTermSet": `${BASE_URL}/glossary`,
      "url": `${BASE_URL}/glossary#${term.term.toLowerCase().replace(/\s+/g, '-')}`
    }))
  };
}

export function generateGlossaryWebPageSchema(glossaryData: GlossaryData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}/glossary#webpage`,
    "url": `${BASE_URL}/glossary`,
    "name": "Costa del Sol Real Estate Glossary | Spanish Property Terms Explained",
    "description": "Complete glossary of 65+ Spanish real estate, tax, and legal terms. Essential definitions for NIE, IBI, Golden Visa, escritura, and more when buying property on the Costa del Sol.",
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
      "@id": `${BASE_URL}/glossary`
    },
    "author": glossaryAuthor,
    "publisher": organizationSchema,
    "datePublished": "2024-01-15",
    "dateModified": glossaryData.last_updated,
    "inLanguage": "en",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/glossary?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

export function generateGlossaryBreadcrumbSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
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
        "name": "Glossary",
        "item": `${BASE_URL}/glossary`
      }
    ]
  };
}

export function generateGlossarySpeakableSchema() {
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
    "url": `${BASE_URL}/glossary`
  };
}

// NEW: ItemList schema for each category - enhances AI understanding
export function generateCategoryItemListSchemas(glossaryData: GlossaryData) {
  const itemLists = Object.entries(glossaryData.categories).map(([key, category]) => ({
    "@type": "ItemList",
    "@id": `${BASE_URL}/glossary#category-${key}`,
    "name": category.title,
    "description": category.description,
    "numberOfItems": category.terms.length,
    "itemListOrder": "https://schema.org/ItemListOrderAscending",
    "itemListElement": category.terms.map((term, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": term.term,
      "description": term.definition,
      "url": `${BASE_URL}/glossary#${term.term.toLowerCase().replace(/\s+/g, '-')}`
    }))
  }));

  return itemLists;
}

// NEW: FAQPage schema for popular terms - great for featured snippets
export function generateGlossaryFAQSchema(glossaryData: GlossaryData) {
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
    "@id": `${BASE_URL}/glossary#faq`,
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

// NEW: Organization schema with expertise signals
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

export function generateAllGlossarySchemas(glossaryData: GlossaryData) {
  const categoryItemLists = generateCategoryItemListSchemas(glossaryData);
  const faqSchema = generateGlossaryFAQSchema(glossaryData);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphItems: any[] = [
    generateDefinedTermSetSchema(glossaryData),
    generateGlossaryWebPageSchema(glossaryData),
    generateGlossaryBreadcrumbSchema(),
    generateGlossarySpeakableSchema(),
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
