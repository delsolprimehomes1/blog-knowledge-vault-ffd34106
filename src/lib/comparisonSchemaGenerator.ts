// Schema generator for comparison pages - AI-citation optimized

export interface ComparisonPage {
  id: string;
  option_a: string;
  option_b: string;
  comparison_topic: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  headline: string;
  speakable_answer: string;
  quick_comparison_table: Array<{
    criterion: string;
    option_a_value: string;
    option_b_value: string;
  }>;
  option_a_overview: string;
  option_b_overview: string;
  side_by_side_breakdown: string;
  use_case_scenarios: string;
  final_verdict: string;
  qa_entities: Array<{ question: string; answer: string }>;
  external_citations: Array<{ url: string; source: string; text?: string }>;
  internal_links: Array<{ url: string; anchor: string }>;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption?: string;
  author_id?: string;
  reviewer_id?: string;
  category: string;
  language: string;
  status: string;
  date_published?: string;
  date_modified?: string;
  target_audience?: string;
  niche?: string;
}

const BASE_URL = "https://www.delsolprimehomes.com";

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Del Sol Prime Homes",
  "description": "Premium real estate agency specializing in Costa del Sol properties",
  "url": BASE_URL,
  "logo": `${BASE_URL}/logo.png`,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
    "addressLocality": "Fuengirola",
    "addressRegion": "Málaga",
    "postalCode": "29640",
    "addressCountry": "ES"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": ["en", "de", "nl", "fr", "pl", "fi", "sv", "da", "no", "hu"],
    "telephone": "+34 613 578 416",
    "email": "info@delsolprimehomes.com"
  }
};

export function generateComparisonArticleSchema(
  comparison: ComparisonPage,
  author?: { name: string; job_title: string; linkedin_url?: string } | null
): any {
  const comparisonUrl = `${BASE_URL}/compare/${comparison.slug}`;
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": comparison.headline,
    "description": comparison.meta_description,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": comparisonUrl
    },
    "publisher": ORGANIZATION_SCHEMA,
    "datePublished": comparison.date_published,
    "dateModified": comparison.date_modified || comparison.date_published,
    "inLanguage": comparison.language,
    "about": [
      { "@type": "Thing", "name": comparison.option_a },
      { "@type": "Thing", "name": comparison.option_b }
    ]
  };

  if (comparison.featured_image_url) {
    schema.image = {
      "@type": "ImageObject",
      "url": comparison.featured_image_url,
      "caption": comparison.featured_image_caption || comparison.headline,
      "description": comparison.featured_image_alt
    };
  }

  if (author) {
    schema.author = {
      "@type": "Person",
      "name": author.name,
      "jobTitle": author.job_title,
      "url": author.linkedin_url
    };
  }

  if (comparison.external_citations?.length > 0) {
    schema.citation = comparison.external_citations.map(c => ({
      "@type": "CreativeWork",
      "name": c.source,
      "url": c.url
    }));
  }

  return schema;
}

export function generateComparisonSpeakableSchema(comparison: ComparisonPage): any {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "inLanguage": comparison.language,
    "cssSelector": [
      ".speakable-answer",
      ".comparison-summary",
      ".final-verdict"
    ]
  };
}

export function generateComparisonFAQSchema(comparison: ComparisonPage): any | null {
  if (!comparison.qa_entities?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BASE_URL}/compare/${comparison.slug}#faq`,
    "inLanguage": comparison.language,
    "mainEntity": comparison.qa_entities.map(qa => ({
      "@type": "Question",
      "name": qa.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": qa.answer
      }
    }))
  };
}

export function generateComparisonBreadcrumbSchema(comparison: ComparisonPage): any {
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
        "name": "Comparisons",
        "item": `${BASE_URL}/compare`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": comparison.headline,
        "item": `${BASE_URL}/compare/${comparison.slug}`
      }
    ]
  };
}

export function generateComparisonTableSchema(comparison: ComparisonPage): any | null {
  if (!comparison.quick_comparison_table?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Table",
    "about": `${comparison.option_a} vs ${comparison.option_b} comparison`,
    "description": `Detailed comparison table showing differences between ${comparison.option_a} and ${comparison.option_b}`,
    "inLanguage": comparison.language
  };
}

export interface GeneratedComparisonSchemas {
  article: any;
  speakable: any;
  faq: any | null;
  breadcrumb: any;
  table: any | null;
  organization: any;
}

export function generateAllComparisonSchemas(
  comparison: ComparisonPage,
  author?: { name: string; job_title: string; linkedin_url?: string } | null
): GeneratedComparisonSchemas {
  return {
    article: generateComparisonArticleSchema(comparison, author),
    speakable: generateComparisonSpeakableSchema(comparison),
    faq: generateComparisonFAQSchema(comparison),
    breadcrumb: generateComparisonBreadcrumbSchema(comparison),
    table: generateComparisonTableSchema(comparison),
    organization: ORGANIZATION_SCHEMA
  };
}
