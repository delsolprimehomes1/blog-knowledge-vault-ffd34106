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
    "description": "Comprehensive glossary of Spanish property, tax, legal, and real estate terms for international buyers",
    "url": `${BASE_URL}/glossary`,
    "inLanguage": "en",
    "publisher": {
      "@type": "Organization",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/assets/logo-new.png`
      }
    },
    "dateModified": glossaryData.last_updated,
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
    "description": "Complete glossary of Spanish real estate, tax, and legal terms. Essential definitions for buying property on the Costa del Sol.",
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
    "dateModified": glossaryData.last_updated,
    "inLanguage": "en"
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

export function generateAllGlossarySchemas(glossaryData: GlossaryData) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      generateDefinedTermSetSchema(glossaryData),
      generateGlossaryWebPageSchema(glossaryData),
      generateGlossaryBreadcrumbSchema(),
      generateGlossarySpeakableSchema()
    ]
  };
}
