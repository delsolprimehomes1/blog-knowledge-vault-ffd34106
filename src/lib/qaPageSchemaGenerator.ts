import { QAPage, Author } from '@/types/blog';

const BASE_URL = 'https://www.delsolprimehomes.com';

/**
 * Hans' AEO Rules: Truncate answer at sentence boundary for AI-safe schema
 * - Max 800 characters
 * - Max 150 words  
 * - No list formatting allowed
 */
function truncateAtSentence(text: string, maxChars: number = 800): string {
  const MAX_WORDS = 150;
  const MIN_LENGTH = 160;
  
  // Strip HTML tags for clean processing
  let cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Check for list patterns and clean them (Hans' AEO rule: no lists)
  const listPatterns = [
    /^\d+\.\s/m,           // Numbered lists at line start
    /^[-*•]\s/m,           // Bullet points at line start  
    /\n\s*\d+\.\s/,        // Numbered lists mid-text
    /\n\s*[-*•]\s/,        // Bullets mid-text
  ];
  
  for (const pattern of listPatterns) {
    if (pattern.test(cleanText)) {
      // Clean list formatting - convert to flowing prose
      cleanText = cleanText.replace(/^\s*\d+\.\s+/gm, '');
      cleanText = cleanText.replace(/\n\s*\d+\.\s+/g, ' ');
      cleanText = cleanText.replace(/^\s*[-*•]\s+/gm, '');
      cleanText = cleanText.replace(/\n\s*[-*•]\s+/g, ' ');
      cleanText = cleanText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }
  
  // Check word count first (Hans' rule: max 150 words)
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length > MAX_WORDS) {
    cleanText = words.slice(0, MAX_WORDS).join(' ');
  }
  
  // Now check character limit (Hans' rule: max 800 chars)
  if (cleanText.length <= maxChars) {
    // Ensure proper ending
    if (!cleanText.endsWith('.') && !cleanText.endsWith('!') && !cleanText.endsWith('?')) {
      cleanText = cleanText.trim() + '.';
    }
    return cleanText;
  }
  
  // Need to truncate - find sentence boundary
  const truncated = cleanText.substring(0, maxChars);
  
  // Find last sentence ending
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd >= MIN_LENGTH) {
    return cleanText.substring(0, lastSentenceEnd + 1).trim();
  }
  
  // Fallback: truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace >= MIN_LENGTH) {
    return cleanText.substring(0, lastSpace).trim() + '.';
  }
  
  // Final fallback
  return cleanText.substring(0, MIN_LENGTH).trim() + '...';
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  nl: 'nl-NL',
  fr: 'fr-FR',
  pl: 'pl-PL',
  sv: 'sv-SE',
  da: 'da-DK',
  hu: 'hu-HU',
  fi: 'fi-FI',
  no: 'nb-NO',
};

/**
 * Generates QAPage schema (not FAQPage) for single Q&A pages.
 * QAPage is the correct schema type for a single question with an answer.
 * The content MUST be in the same language as the page (no English fallback).
 */
export function generateQAPageSchema(qaPage: QAPage) {
  const lang = qaPage.language || 'en';
  const langCode = LANGUAGE_CODE_MAP[lang] || lang;
  const pageUrl = qaPage.canonical_url || `${BASE_URL}/${lang}/qa/${qaPage.slug}`;
  
  // Single QAPage schema - uses the actual page content language
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    '@id': `${pageUrl}#qapage`,
    'headline': qaPage.question_main, // Must be in page's language (e.g., French for FR page)
    'inLanguage': langCode,
    'url': pageUrl,
    'mainEntity': {
      '@type': 'Question',
      'name': qaPage.question_main, // In page's language
      'text': qaPage.question_main,
      'answerCount': 1,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': qaPage.speakable_answer || truncateAtSentence(qaPage.answer_main?.replace(/<[^>]*>/g, '') || '', 600),
        'inLanguage': langCode,
      },
    },
  };

  // Add reference to source blog article for AI discoverability
  if (qaPage.source_article_slug) {
    schema.isBasedOn = {
      '@type': 'BlogPosting',
      '@id': `${BASE_URL}/${lang}/blog/${qaPage.source_article_slug}`,
      'url': `${BASE_URL}/${lang}/blog/${qaPage.source_article_slug}`,
    };
  }

  return schema;
}

// Keep FAQPage for backwards compatibility but deprecated
/** @deprecated Use generateQAPageSchema instead */
export function generateFAQPageSchema(qaPage: QAPage) {
  return generateQAPageSchema(qaPage);
}

// Organization schema with expertise signals for E-E-A-T
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Del Sol Prime Homes',
    url: BASE_URL,
    logo: `${BASE_URL}/assets/logo-new.png`,
    sameAs: ['https://www.linkedin.com/company/del-sol-prime-homes'],
    knowsAbout: [
      'Costa del Sol Real Estate',
      'Spanish Property Law',
      'Digital Nomad Visa Spain',
      'Spanish Property Taxes',
      'NIE Number Application',
      'Spanish Mortgages for Non-Residents',
    ],
    areaServed: {
      '@type': 'Place',
      name: 'Costa del Sol, Andalusia, Spain',
    },
    expertise: [
      'UK & Irish Buyer Assistance',
      'Post-Brexit Property Guidance',
      'Investment Property Analysis',
      'Legal Due Diligence',
    ],
  };
}

// Speakable schema for QA Index page
export function generateQAIndexSpeakableSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${BASE_URL}/qa#speakable`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.qa-hero-title', '.qa-hero-description'],
    },
    inLanguage: 'en-GB',
  };
}

export function generateWebPageSchema(qaPage: QAPage, author: Author | null) {
  const pageUrl = qaPage.canonical_url || `${BASE_URL}/${qaPage.language}/qa/${qaPage.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: qaPage.meta_title,
    description: qaPage.meta_description,
    inLanguage: LANGUAGE_CODE_MAP[qaPage.language] || qaPage.language,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'Del Sol Prime Homes',
      publisher: {
        '@type': 'Organization',
        name: 'Del Sol Prime Homes',
        url: BASE_URL,
      },
    },
    primaryImageOfPage: qaPage.featured_image_url
      ? {
          '@type': 'ImageObject',
          url: qaPage.featured_image_url,
        }
      : undefined,
    datePublished: qaPage.created_at,
    dateModified: qaPage.updated_at,
    author: author
      ? {
          '@type': 'Person',
          name: author.name,
          jobTitle: author.job_title,
          url: author.linkedin_url,
        }
      : undefined,
  };
}

export function generateQABreadcrumbSchema(qaPage: QAPage) {
  const pageUrl = qaPage.canonical_url || `${BASE_URL}/${qaPage.language}/qa/${qaPage.slug}`;
  return {
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
        name: 'Q&A',
        item: `${BASE_URL}/${qaPage.language}/qa`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: qaPage.title,
        item: pageUrl,
      },
    ],
  };
}

// Speakable removed - limited practical impact and may reference non-existent selectors
// Keeping function for backwards compatibility but returns null
export function generateQASpeakableSchema(_qaPage: QAPage) {
  return null;
}

export function generateAllQASchemas(qaPage: QAPage, author: Author | null) {
  // Only include QAPage schema (not FAQPage) for single Q&A pages
  // Remove speakable as it has limited impact
  const graphItems: any[] = [
    generateQAPageSchema(qaPage),
    generateWebPageSchema(qaPage, author),
    generateQABreadcrumbSchema(qaPage),
    generateOrganizationSchema(),
  ].filter(Boolean); // Remove null items

  return {
    '@context': 'https://schema.org',
    '@graph': graphItems,
  };
}

// Backwards compatibility aliases
export const generateFAQBreadcrumbSchema = generateQABreadcrumbSchema;
export const generateFAQSpeakableSchema = generateQASpeakableSchema;
export const generateAllFAQSchemas = generateAllQASchemas;
