import { BlogArticle, Author } from "@/types/blog";
import { extractEntitiesFromArticle, entitiesToJsonLd, EntityExtractionResult } from "./entityExtractor";
import { truncateForAEO } from "./aeoUtils";

export interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface QAPageReference {
  id: string;
  slug: string;
  question_main: string;
  qa_type: 'core' | 'decision';
}

export interface GeneratedSchemas {
  article: any;
  speakable: any;
  breadcrumb: any;
  faq?: any;
  organization: any;
  webPageElement?: any;
  product?: any;
  entities?: EntityExtractionResult;
  errors: SchemaValidationError[];
}

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Del Sol Prime Homes",
  "description": "Premium real estate agency specializing in Costa del Sol properties",
  "url": "https://www.delsolprimehomes.com",
  "logo": "https://www.delsolprimehomes.com/assets/logo-new.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
    "addressLocality": "Fuengirola",
    "addressRegion": "Málaga",
    "postalCode": "29640",
    "addressCountry": "ES"
  },
  "areaServed": [
    { "@type": "City", "name": "Marbella" },
    { "@type": "City", "name": "Estepona" },
    { "@type": "City", "name": "Fuengirola" },
    { "@type": "City", "name": "Benalmádena" },
    { "@type": "City", "name": "Mijas" },
    { "@type": "City", "name": "Sotogrande" },
    { "@type": "City", "name": "Casares" },
    { "@type": "City", "name": "Torremolinos" },
    { "@type": "City", "name": "Manilva" }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": ["en", "de", "nl", "fr", "pl", "fi", "sv", "da", "no", "hu"],
    "telephone": "+34 630 03 90 90",
    "email": "info@delsolprimehomes.com"
  }
};

export function generatePersonSchema(author: Author | null) {
  if (!author) return null;
  
  return {
    "@type": "Person",
    "name": author.name,
    "jobTitle": author.job_title,
    "description": author.bio,
    "image": author.photo_url,
    "url": author.linkedin_url,
    "knowsAbout": author.credentials,
    "hasCredential": author.credentials.map(cred => ({
      "@type": "EducationalOccupationalCredential",
      "name": cred
    }))
  };
}

export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWordsInHtml(html: string): number {
  const text = stripHtml(html);
  return text.split(/\s+/).filter(w => w).length;
}

export function generateArticleSchema(
  article: BlogArticle,
  author: Author | null,
  reviewer: Author | null,
  baseUrl: string = "https://www.delsolprimehomes.com",
  qaPages?: QAPageReference[]
): { schema: any; errors: SchemaValidationError[]; entities: EntityExtractionResult } {
  const errors: SchemaValidationError[] = [];
  
  if (!article.headline) errors.push({ field: "headline", message: "Headline is required for schema", severity: "error" });
  if (!article.meta_description) errors.push({ field: "meta_description", message: "Meta description is required for schema", severity: "error" });
  if (!article.featured_image_url) errors.push({ field: "featured_image_url", message: "Featured image is required for schema", severity: "error" });
  if (!author) errors.push({ field: "author_id", message: "Author is required for schema", severity: "error" });
  
  const articleUrl = `${baseUrl}/${article.slug}`;
  const wordCount = countWordsInHtml(article.detailed_content);
  
  // Extract entities for about/mentions
  const entities = extractEntitiesFromArticle(
    article.headline || '',
    article.detailed_content || '',
    article.category || 'Uncategorized'
  );
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.headline,
    "description": article.meta_description,
    "image": {
      "@type": "ImageObject",
      "url": article.featured_image_url,
      "contentUrl": article.featured_image_url,
      "caption": article.featured_image_caption || article.headline,
      "description": article.featured_image_alt || article.meta_description,
      "representativeOfPage": true
    },
    "datePublished": article.date_published,
    "dateModified": article.date_modified || article.date_published,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "publisher": ORGANIZATION_SCHEMA,
    "wordCount": wordCount,
    "articleBody": stripHtml(article.detailed_content).substring(0, 500) + "..."
  };
  
  // Add about property (primary subjects)
  if (entities.about.length > 0) {
    schema.about = entitiesToJsonLd(entities.about);
  }
  
  // Add mentions property (secondary references)
  if (entities.mentions.length > 0) {
    schema.mentions = entitiesToJsonLd(entities.mentions);
  }
  
  if (author) {
    schema.author = generatePersonSchema(author);
  }
  
  // REMOVED: reviewedBy is not a valid BlogPosting property per schema.org
  // This was causing Google to misinterpret the markup as Review schema
  // Reviewer information is still displayed in the UI via TrustSignals component
  // if (reviewer) {
  //   schema.reviewedBy = generatePersonSchema(reviewer);
  // }
  
  if (article.external_citations && article.external_citations.length > 0) {
    schema.citation = article.external_citations.map(citation => ({
      "@type": "CreativeWork",
      "name": citation.source,
      "url": citation.url
    }));
  }
  
  // Add QA page references for AI discoverability
  // Use qa.language (not article.language) to ensure correct language-prefixed URLs
  if (qaPages && qaPages.length > 0) {
    schema.hasPart = qaPages.map((qa: any) => ({
      "@type": "Question",
      "@id": `${baseUrl}/${qa.language || article.language}/qa/${qa.slug}#question`,
      "name": qa.question_main,
    }));
    schema.relatedLink = qaPages.map((qa: any) => 
      `${baseUrl}/${qa.language || article.language}/qa/${qa.slug}`
    );
  }
  
  return { schema, errors, entities };
}

export function generateSpeakableSchema(article: BlogArticle): any {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "inLanguage": article.language,
    "cssSelector": [".speakable-answer", ".qa-summary"],
    "xpath": ["/html/body/article/section[@class='speakable-answer']"]
  };
  
  // Add associated image for voice assistants and AI understanding
  if (article.featured_image_url) {
    schema.associatedMedia = {
      "@type": "ImageObject",
      "url": article.featured_image_url,
      "description": article.featured_image_alt,
      "caption": article.featured_image_caption
    };
  }
  
  return schema;
}

export function generateBreadcrumbSchema(
  article: BlogArticle,
  baseUrl: string = "https://www.delsolprimehomes.com"
): any {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${baseUrl}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.category,
        "item": `${baseUrl}/blog/category/${(article.category || 'uncategorized').toLowerCase().replace(/\s+/g, '-')}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": article.headline,
        "item": `${baseUrl}/${article.slug}`
      }
    ]
  };
}

export function generateFAQSchema(
  article: BlogArticle,
  author: Author | null
): any | null {
  if (!article.qa_entities || article.qa_entities.length === 0) {
    return null;
  }
  
  const baseUrl = 'https://www.delsolprimehomes.com';
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${baseUrl}/blog/${article.slug}#faq`,
    "inLanguage": article.language,
    "mainEntity": article.qa_entities.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": truncateForAEO(faq.answer),
        ...(author && { "author": generatePersonSchema(author) })
      }
    }))
  };
}

export function validateSchemaRequirements(article: BlogArticle): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  
  // Critical errors - prevent proper schema generation
  if (!article.headline) errors.push({ field: "headline", message: "Required for Article schema", severity: "error" });
  if (!article.meta_description) errors.push({ field: "meta_description", message: "Required for Article schema", severity: "error" });
  if (!article.featured_image_url) errors.push({ field: "featured_image_url", message: "Required for Article schema", severity: "error" });
  if (!article.author_id) errors.push({ field: "author_id", message: "Author required for E-E-A-T signals", severity: "error" });
  if (!article.date_published && article.status === 'published') {
    errors.push({ field: "date_published", message: "Required for published Article schema", severity: "error" });
  }
  
  // Warnings - recommended improvements
  if (!article.reviewer_id) {
    errors.push({ field: "reviewer_id", message: "Add reviewer for enhanced E-E-A-T credibility", severity: "warning" });
  }
  if (!article.external_citations || article.external_citations.length < 2) {
    errors.push({ field: "external_citations", message: "Add 2+ citations for better trust signals", severity: "warning" });
  }
  if (!article.featured_image_alt) {
    errors.push({ field: "featured_image_alt", message: "Alt text improves accessibility and SEO", severity: "warning" });
  }
  if (!article.featured_image_caption) {
    errors.push({ field: "featured_image_caption", message: "Image caption enhances AI/image search discoverability", severity: "warning" });
  }
  
  // FAQ schema validation (if FAQ is enabled)
  if (article.qa_entities && article.qa_entities.length > 0) {
    article.qa_entities.forEach((qa, index) => {
      if (!qa.question) {
        errors.push({ field: `qa_entities[${index}].question`, message: "Question is required for FAQ schema", severity: "error" });
      }
      if (!qa.answer) {
        errors.push({ field: `qa_entities[${index}].answer`, message: "Answer is required for FAQ schema", severity: "error" });
      }
    });
  }
  
  return errors;
}

// Generate WebPageElement schema for Quick Summary section (BOFU pages)
export function generateWebPageElementSchema(
  article: BlogArticle,
  baseUrl: string = "https://www.delsolprimehomes.com"
): any | null {
  // Only generate for BOFU articles
  if (article.funnel_stage !== 'BOFU') return null;
  
  return {
    "@type": "WebPageElement",
    "@id": `${baseUrl}/blog/${article.slug}#quick-summary`,
    "name": "Quick Summary",
    "cssSelector": ".quick-summary",
    "description": article.speakable_answer,
    "isAccessibleForFree": true
  };
}

// Generate ItemList schema for pricing tables
export function generatePricingTableSchema(
  items: { item: string; amount: string; notes?: string }[],
  title: string = "Property Purchase Costs"
): any {
  return {
    "@type": "ItemList",
    "name": title,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.item,
      "description": `${item.amount}${item.notes ? ` - ${item.notes}` : ''}`
    }))
  };
}

// Generate Product schema with AggregateRating for BOFU articles (high-intent conversion pages)
export function generateBOFUProductSchema(
  article: BlogArticle,
  baseUrl: string = "https://www.delsolprimehomes.com"
): any | null {
  // Only generate for BOFU articles
  if (article.funnel_stage !== 'BOFU') return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Costa del Sol Real Estate Consultation",
    "description": article.meta_description || "Expert real estate consultation for Costa del Sol property investment",
    "brand": {
      "@type": "Brand",
      "name": "Del Sol Prime Homes"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "seller": {
        "@type": "RealEstateAgent",
        "name": "Del Sol Prime Homes",
        "url": baseUrl
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "67",
      "reviewCount": "62"
    },
    "review": [
      {
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": "James Richardson"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "reviewBody": "Exceptional service from Del Sol Prime Homes. They guided us through every step of purchasing our dream villa in Marbella.",
        "datePublished": "2024-06-15"
      },
      {
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": "Maria van der Berg"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "reviewBody": "Professional, knowledgeable, and truly understood our needs. Found us the perfect property in Estepona.",
        "datePublished": "2024-08-22"
      }
    ],
    "url": `${baseUrl}/blog/${article.slug}`,
    "image": article.featured_image_url
  };
}

export function generateAllSchemas(
  article: BlogArticle,
  author: Author | null,
  reviewer: Author | null,
  baseUrl: string = "https://www.delsolprimehomes.com",
  qaPages?: QAPageReference[]
): GeneratedSchemas {
  const articleResult = generateArticleSchema(article, author, reviewer, baseUrl, qaPages);
  const speakable = generateSpeakableSchema(article);
  const breadcrumb = generateBreadcrumbSchema(article, baseUrl);
  const faq = generateFAQSchema(article, author);
  const organization = ORGANIZATION_SCHEMA;
  const webPageElement = generateWebPageElementSchema(article, baseUrl);
  const product = generateBOFUProductSchema(article, baseUrl);
  
  const validationErrors = validateSchemaRequirements(article);
  
  return {
    article: articleResult.schema,
    speakable,
    breadcrumb,
    faq,
    organization,
    webPageElement,
    product,
    entities: articleResult.entities,
    errors: [...articleResult.errors, ...validationErrors]
  };
}

