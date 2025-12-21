import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ArticleData {
  id: string;
  slug: string;
  language: string;
  headline: string;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  speakable_answer: string;
  detailed_content: string;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption?: string;
  diagram_url?: string;
  diagram_description?: string;
  date_published?: string;
  date_modified?: string;
  read_time?: number;
  external_citations: any[];
  qa_entities?: any[];
  translations: Record<string, string>;
  author?: any;
  reviewer?: any;
}

interface ProductionAssets {
  css: string[];
  js: string[];
}

/**
 * Extract production asset paths from built index.html
 */
function getProductionAssets(distDir: string): ProductionAssets {
  const indexPath = join(distDir, 'index.html');
  
  if (!existsSync(indexPath)) {
    console.log('⚠️ Built index.html not found, skipping asset injection');
    return { css: [], js: [] };
  }
  
  const indexHtml = readFileSync(indexPath, 'utf-8');
  
  // Extract CSS links (href="/assets/...")
  const cssMatches = indexHtml.match(/href="(\/assets\/[^"]+\.css)"/g) || [];
  const css = cssMatches.map(m => {
    const match = m.match(/href="([^"]+)"/);
    return match ? match[1] : '';
  }).filter(Boolean);
  
  // Extract JS scripts (src="/assets/...")
  const jsMatches = indexHtml.match(/src="(\/assets\/[^"]+\.js)"/g) || [];
  const js = jsMatches.map(m => {
    const match = m.match(/src="([^"]+)"/);
    return match ? match[1] : '';
  }).filter(Boolean);
  
  console.log(`📦 Found production assets: ${css.length} CSS, ${js.length} JS files`);
  return { css, js };
}

function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": "https://www.delsolprimehomes.com/#organization",
    "name": "Del Sol Prime Homes",
    "legalName": "Del Sol Prime Homes",
    "url": "https://www.delsolprimehomes.com/",
    "description": "Premium real estate agency specializing in Costa del Sol new-build and off-plan properties",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.delsolprimehomes.com/assets/logo-new.png",
      "width": 256,
      "height": 256
    },
    "areaServed": [
      {"@type": "City", "name": "Marbella"},
      {"@type": "City", "name": "Estepona"},
      {"@type": "City", "name": "Fuengirola"},
      {"@type": "City", "name": "Benalmádena"},
      {"@type": "City", "name": "Mijas"}
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["en", "de", "nl", "fr", "pl", "sv", "da", "hu", "fi", "no"],
      "telephone": "+34-952-123-456",
      "email": "info@delsolprimehomes.com"
    },
    "sameAs": [
      "https://www.facebook.com/delsolprimehomes",
      "https://www.instagram.com/delsolprimehomes",
      "https://www.linkedin.com/company/delsolprimehomes"
    ]
  };
}

function generateAuthorSchema(author: any) {
  if (!author) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `https://www.delsolprimehomes.com/team/${author.name.toLowerCase().replace(/\s+/g, '-')}#person`,
    "name": author.name,
    "jobTitle": author.job_title,
    "image": author.photo_url,
    "url": author.linkedin_url,
    "knowsAbout": author.credentials || [],
    "hasCredential": (author.credentials || []).map((cred: string) => ({
      "@type": "EducationalOccupationalCredential",
      "name": cred
    }))
  };
}

// Entity extraction for about/mentions (simplified for SSG - no external imports)
function extractEntitiesForSSG(headline: string, content: string, category: string) {
  const WIKIDATA_ENTITIES: Record<string, string> = {
    "Marbella": "https://www.wikidata.org/wiki/Q8337",
    "Estepona": "https://www.wikidata.org/wiki/Q477306",
    "Fuengirola": "https://www.wikidata.org/wiki/Q618947",
    "Benalmádena": "https://www.wikidata.org/wiki/Q571725",
    "Mijas": "https://www.wikidata.org/wiki/Q571737",
    "Sotogrande": "https://www.wikidata.org/wiki/Q3490614",
    "Casares": "https://www.wikidata.org/wiki/Q1046949",
    "Torremolinos": "https://www.wikidata.org/wiki/Q184217",
    "Manilva": "https://www.wikidata.org/wiki/Q571730",
    "Málaga": "https://www.wikidata.org/wiki/Q8851",
    "Costa del Sol": "https://www.wikidata.org/wiki/Q751676",
    "Golden Visa": "https://www.wikidata.org/wiki/Q5579119",
    "NIE": "https://www.wikidata.org/wiki/Q6955279",
  };

  const GLOSSARY_TERMS: Record<string, string> = {
    "NIE": "Tax identification number for foreigners in Spain",
    "Golden Visa": "Spanish residence permit for property investors (€500,000+)",
    "Escritura": "Public deed of sale signed before a notary",
    "IBI": "Annual municipal property tax in Spain",
    "Plusvalía": "Municipal capital gains tax on land value increase",
    "Hipoteca": "Spanish mortgage loan secured against property",
  };

  const plainContent = content.replace(/<[^>]*>/g, ' ');
  const combinedText = `${headline} ${plainContent}`;
  
  const about: any[] = [];
  const mentions: any[] = [];
  
  // Add category as primary subject
  about.push({
    "@type": "Thing",
    "name": category,
    "sameAs": `https://www.delsolprimehomes.com/blog/category/${category.toLowerCase().replace(/\s+/g, '-')}`
  });

  // Detect cities in headline (primary) and content (secondary)
  const cities = ["Marbella", "Estepona", "Fuengirola", "Benalmádena", "Mijas", "Sotogrande", "Casares", "Torremolinos", "Manilva", "Málaga", "Costa del Sol"];
  const seenCities = new Set<string>();
  
  for (const city of cities) {
    const regex = new RegExp(`\\b${city}\\b`, 'gi');
    if (regex.test(combinedText) && !seenCities.has(city.toLowerCase())) {
      seenCities.add(city.toLowerCase());
      const entity: any = { "@type": "Place", "name": city };
      if (WIKIDATA_ENTITIES[city]) entity.sameAs = WIKIDATA_ENTITIES[city];
      
      // If in headline, add to about; otherwise mentions
      if (new RegExp(`\\b${city}\\b`, 'gi').test(headline)) {
        about.push(entity);
      } else {
        mentions.push(entity);
      }
    }
  }

  // Detect glossary terms
  for (const [term, definition] of Object.entries(GLOSSARY_TERMS)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(combinedText)) {
      const entity: any = {
        "@type": "DefinedTerm",
        "name": term,
        "description": definition,
        "inDefinedTermSet": "https://www.delsolprimehomes.com/glossary"
      };
      if (WIKIDATA_ENTITIES[term]) entity.sameAs = WIKIDATA_ENTITIES[term];
      mentions.push(entity);
    }
  }

  return { about, mentions: mentions.slice(0, 10) };
}

function generateArticleSchema(article: ArticleData) {
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  
  // Extract entities for about/mentions
  const entities = extractEntitiesForSSG(
    article.headline,
    article.detailed_content,
    'Property Guides' // Default category for SSG
  );
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `https://www.delsolprimehomes.com/blog/${article.slug}#article`,
    "headline": article.headline,
    "description": article.meta_description,
    "image": {
      "@type": "ImageObject",
      "url": article.featured_image_url,
      "caption": article.featured_image_caption || article.featured_image_alt
    },
    "datePublished": article.date_published,
    "dateModified": article.date_modified || article.date_published,
    "wordCount": wordCount,
    "author": article.author ? {
      "@id": `https://www.delsolprimehomes.com/team/${article.author.name.toLowerCase().replace(/\s+/g, '-')}#person`
    } : undefined,
    "publisher": {
      "@id": "https://www.delsolprimehomes.com/#organization"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.delsolprimehomes.com/blog/${article.slug}`
    },
    "inLanguage": article.language
  };
  
  // Add about property (primary subjects)
  if (entities.about.length > 0) {
    schema.about = entities.about;
  }
  
  // Add mentions property (secondary references)
  if (entities.mentions.length > 0) {
    schema.mentions = entities.mentions;
  }
  
  return schema;
}

function generateSpeakableSchema(article: ArticleData) {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-answer", ".article-intro"],
    "associatedMedia": {
      "@type": "ImageObject",
      "url": article.featured_image_url,
      "contentUrl": article.featured_image_url,
      "caption": article.featured_image_caption || article.headline,
      "description": article.featured_image_alt || article.meta_description,
      "representativeOfPage": true
    }
  };
}

function generateBreadcrumbSchema(article: ArticleData) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://www.delsolprimehomes.com/blog/${article.slug}#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.delsolprimehomes.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://www.delsolprimehomes.com/blog/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.headline,
        "item": `https://www.delsolprimehomes.com/blog/${article.slug}/`
      }
    ]
  };
}

function generateFAQSchema(article: ArticleData) {
  if (!article.qa_entities || article.qa_entities.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://www.delsolprimehomes.com/blog/${article.slug}#faq`,
    "inLanguage": article.language,
    "mainEntity": article.qa_entities.map((qa: any) => ({
      "@type": "Question",
      "name": qa.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": qa.answer
      }
    }))
  };
}

function sanitizeForHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Critical inline CSS for static pages - ensures pages look good without JS
 * Includes all brand typography (Playfair Display, Lato, Raleway)
 */
const CRITICAL_CSS = `
  :root {
    --prime-gold: 43 74% 49%;
    --prime-950: 220 20% 10%;
    --foreground: 220 20% 10%;
    --muted-foreground: 220 10% 45%;
    --background: 0 0% 100%;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.7;
    color: hsl(var(--foreground));
    background: hsl(var(--background));
    -webkit-font-smoothing: antialiased;
  }
  
  /* Smooth transition when React takes over */
  #root {
    animation: staticFadeIn 0.3s ease-out;
  }
  
  @keyframes staticFadeIn {
    from { opacity: 0.97; }
    to { opacity: 1; }
  }
  
  /* Article Layout */
  .static-article {
    max-width: 800px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }
  
  .static-article h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    line-height: 1.2;
    color: hsl(var(--foreground));
    margin-bottom: 1rem;
  }
  
  .static-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    color: hsl(var(--muted-foreground));
    font-size: 0.875rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid hsl(var(--prime-gold) / 0.2);
  }
  
  .static-featured-image {
    width: 100%;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
  }
  
  .static-featured-image img {
    width: 100%;
    height: auto;
    border-radius: 0.75rem;
    display: block;
  }
  
  .static-featured-image figcaption {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    text-align: center;
    margin-top: 0.75rem;
    font-style: italic;
  }
  
  /* Speakable Box - Enhanced styling */
  .speakable-box {
    background: linear-gradient(135deg, hsl(var(--prime-gold) / 0.1), hsl(var(--prime-gold) / 0.05));
    border-left: 4px solid hsl(var(--prime-gold));
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  
  .speakable-box-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: hsl(var(--prime-gold));
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-family: 'Raleway', sans-serif;
  }
  
  .speakable-answer {
    font-size: 1.125rem;
    line-height: 1.6;
    color: hsl(var(--foreground));
  }
  
  /* Article Content */
  .article-content {
    font-size: 1.125rem;
    line-height: 1.8;
  }
  
  .article-content h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 700;
    margin: 2.5rem 0 1rem;
    color: hsl(var(--foreground));
  }
  
  .article-content h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.375rem;
    font-weight: 600;
    margin: 2rem 0 0.75rem;
  }
  
  .article-content h4 {
    font-family: 'Lato', sans-serif;
    font-size: 1.125rem;
    font-weight: 700;
    margin: 1.5rem 0 0.5rem;
  }
  
  .article-content p { margin-bottom: 1.25rem; }
  
  .article-content ul, .article-content ol {
    margin-bottom: 1.25rem;
    padding-left: 1.5rem;
  }
  
  .article-content li { margin-bottom: 0.5rem; }
  
  .article-content a {
    color: hsl(var(--prime-gold));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  
  .article-content a:hover { opacity: 0.8; }
  
  .article-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1.5rem 0;
  }
  
  .article-content blockquote {
    border-left: 3px solid hsl(var(--prime-gold));
    padding-left: 1.5rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: hsl(var(--muted-foreground));
  }
  
  /* Table styling */
  .article-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.95rem;
  }
  
  .article-content th, .article-content td {
    padding: 0.75rem 1rem;
    border: 1px solid hsl(var(--prime-gold) / 0.2);
    text-align: left;
  }
  
  .article-content th {
    background: hsl(var(--prime-gold) / 0.1);
    font-weight: 600;
  }
  
  .article-content tr:nth-child(even) {
    background: hsl(var(--prime-gold) / 0.03);
  }
  
  /* Code block styling */
  .article-content pre {
    background: hsl(var(--prime-950));
    color: #e5e5e5;
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
    font-size: 0.875rem;
  }
  
  .article-content code {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
  }
  
  .article-content p code,
  .article-content li code {
    background: hsl(var(--prime-gold) / 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: hsl(var(--foreground));
  }
  
  /* FAQ Section */
  .faq-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid hsl(var(--prime-gold) / 0.2);
  }
  
  .faq-section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
  }
  
  .faq-item {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background: hsl(var(--prime-gold) / 0.05);
    border-radius: 0.5rem;
    border-left: 3px solid hsl(var(--prime-gold) / 0.5);
  }
  
  .faq-item h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
  }
  
  .faq-item p {
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .static-nav { display: none; }
    .static-cta { display: none; }
    .static-article { padding: 2rem 1rem 3rem; }
    .article-content { font-size: 1rem; }
  }
  
  @media (max-width: 480px) {
    .static-article h1 {
      font-size: 1.75rem;
    }
    .speakable-box {
      padding: 1.25rem;
    }
  }
`;

/**
 * Generate static HTML for an article
 * @param article - Article data
 * @param enhancedHreflang - Whether to include hreflang tags (controlled by feature flag)
 * @param productionAssets - Production CSS/JS asset paths for React hydration
 */
function generateStaticHTML(article: ArticleData, enhancedHreflang: boolean, productionAssets: ProductionAssets): string {
  const organizationSchema = generateOrganizationSchema();
  const authorSchema = generateAuthorSchema(article.author);
  const articleSchema = generateArticleSchema(article);
  const speakableSchema = generateSpeakableSchema(article);
  const breadcrumbSchema = generateBreadcrumbSchema(article);
  const faqSchema = generateFAQSchema(article);
  
  // Individual schemas for injection with data-schema attributes
  const schemaScripts = [
    `<script type="application/ld+json" data-schema="organization">${JSON.stringify(organizationSchema, null, 2)}</script>`,
    authorSchema ? `<script type="application/ld+json" data-schema="author">${JSON.stringify(authorSchema, null, 2)}</script>` : '',
    `<script type="application/ld+json" data-schema="article">${JSON.stringify(articleSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="speakable">${JSON.stringify(speakableSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="breadcrumb">${JSON.stringify(breadcrumbSchema, null, 2)}</script>`,
    faqSchema ? `<script type="application/ld+json" data-schema="faq">${JSON.stringify(faqSchema, null, 2)}</script>` : ''
  ].filter(Boolean).join('\n  ');

  const baseUrl = 'https://www.delsolprimehomes.com';
  // Canonical always self-referencing (never cross-language)
  const canonicalUrl = `${baseUrl}/blog/${article.slug}`;

  // Build hreflang links ONLY when feature flag is enabled
  let hreflangLinks = '';
  
  if (enhancedHreflang) {
    const langToHreflang: Record<string, string> = {
      en: 'en-GB', de: 'de-DE', nl: 'nl-NL',
      fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE', da: 'da-DK', hu: 'hu-HU',
      fi: 'fi-FI', no: 'nb-NO'
    };

    const hreflangLinksArray = [];
    const currentUrl = `${baseUrl}/blog/${article.slug}`;

    // 1. Self-referencing
    const currentLangCode = langToHreflang[article.language] || article.language;
    hreflangLinksArray.push(`  <link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`);

    // 2. Translations (only existing translations)
    if (article.translations && typeof article.translations === 'object') {
      Object.entries(article.translations).forEach(([lang, slug]) => {
        if (slug && typeof slug === 'string' && lang !== article.language) {
          const langCode = langToHreflang[lang] || lang;
          hreflangLinksArray.push(`  <link rel="alternate" hreflang="${langCode}" href="${baseUrl}/blog/${slug}" />`);
        }
      });
    }

    // 3. x-default (point to English if exists, otherwise current page)
    const xDefaultSlug = article.translations?.en || article.slug;
    hreflangLinksArray.push(`  <link rel="alternate" hreflang="x-default" href="${baseUrl}/blog/${xDefaultSlug}" />`);

    hreflangLinks = '\n' + hreflangLinksArray.join('\n');
  }

  // Format publish date for display
  const publishDate = article.date_published 
    ? new Date(article.date_published).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Generate production asset links
  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  return `<!DOCTYPE html>
<html lang="${article.language}" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(article.meta_description)}">
  <meta name="author" content="${article.author?.name || 'Del Sol Prime Homes'}">
  <title>${sanitizeForHTML(article.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />${hreflangLinks}
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  
  <!-- Google Fonts - All brand fonts (Playfair Display, Lato, Raleway) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Critical CSS for static rendering (works without JS) -->
  <style>${CRITICAL_CSS}</style>
  
  <!-- Production CSS (for React hydration) -->
  ${cssLinks}
  
  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${sanitizeForHTML(article.meta_title)}" />
  <meta property="og:description" content="${sanitizeForHTML(article.meta_description)}" />
  <meta property="og:image" content="${article.featured_image_url}" />
  <meta property="og:url" content="${baseUrl}/blog/${article.slug}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${sanitizeForHTML(article.meta_title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(article.meta_description)}" />
  <meta name="twitter:image" content="${article.featured_image_url}" />
  
  <!-- JSON-LD Schemas -->
  ${schemaScripts}
</head>
<body>
  <div id="root">
    <!-- Pre-rendered content for SEO, AI crawlers, and no-JS browsers -->
    <article class="static-article static-content" data-article-id="${article.id}">
      <h1>${sanitizeForHTML(article.headline)}</h1>
      
      <div class="static-meta">
        ${article.author?.name ? `<span>By ${sanitizeForHTML(article.author.name)}</span>` : ''}
        ${publishDate ? `<span>${publishDate}</span>` : ''}
        ${article.read_time ? `<span>${article.read_time} min read</span>` : ''}
      </div>
      
      ${article.featured_image_url ? `
      <figure class="static-featured-image">
        <img 
          src="${article.featured_image_url}" 
          alt="${sanitizeForHTML(article.featured_image_alt)}"
          loading="eager"
          width="1200"
          height="675"
        />
        ${article.featured_image_caption ? `<figcaption>${sanitizeForHTML(article.featured_image_caption)}</figcaption>` : ''}
      </figure>
      ` : ''}
      
      ${article.speakable_answer ? `
      <div class="speakable-box">
        <div class="speakable-box-label">Quick Answer</div>
        <div class="speakable-answer">${sanitizeForHTML(article.speakable_answer)}</div>
      </div>
      ` : ''}
      
      <div class="article-content">
        ${article.detailed_content}
      </div>
      
      ${article.qa_entities && article.qa_entities.length > 0 ? `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${article.qa_entities.map((qa: any) => `
        <div class="faq-item">
          <h3>${sanitizeForHTML(qa.question)}</h3>
          <p>${sanitizeForHTML(qa.answer)}</p>
        </div>
        `).join('')}
      </section>
      ` : ''}
    </article>
  </div>
  
  
  <!-- Production JS (React hydration - enhances the static page when JS loads) -->
  ${jsScripts}
</body>
</html>`;
}

/**
 * Check if a feature flag is enabled
 */
async function checkFeatureFlag(flagName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', `feature_${flagName}`)
      .single();

    if (error) {
      console.log(`⚠️ Feature flag '${flagName}' not found, defaulting to false`);
      return false;
    }

    return data?.setting_value === 'true';
  } catch (err) {
    console.error(`❌ Error checking feature flag '${flagName}':`, err);
    return false;
  }
}

/**
 * Ensure logo is available in public/assets for static pages
 */
function ensureLogoInPublicAssets(distDir: string) {
  const sourceLogo = join(process.cwd(), 'src', 'assets', 'logo-new.png');
  const destDir = join(distDir, 'assets');
  const destLogo = join(destDir, 'logo-new.png');
  
  // Also copy to public folder root for broader compatibility
  const publicAssetsDir = join(process.cwd(), 'public', 'assets');
  const publicLogo = join(publicAssetsDir, 'logo-new.png');
  
  try {
    // Create dest directories if needed
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    if (!existsSync(publicAssetsDir)) {
      mkdirSync(publicAssetsDir, { recursive: true });
    }
    
    // Copy logo if source exists
    if (existsSync(sourceLogo)) {
      copyFileSync(sourceLogo, destLogo);
      copyFileSync(sourceLogo, publicLogo);
      console.log('✅ Logo copied to public/assets and dist/assets');
    } else {
      console.log('⚠️ Source logo not found at:', sourceLogo);
    }
  } catch (err) {
    console.error('❌ Error copying logo:', err);
  }
}

export async function generateStaticPages(distDir: string) {
  console.log('🚀 Starting static page generation...');
  
  try {
    // Ensure logo is available
    ensureLogoInPublicAssets(distDir);
    
    // Get production assets from built index.html
    const productionAssets = getProductionAssets(distDir);
    
    // Check feature flag for enhanced hreflang
    const enhancedHreflang = await checkFeatureFlag('enhanced_hreflang');
    console.log(`🏳️ Feature flag 'enhanced_hreflang': ${enhancedHreflang ? 'ENABLED' : 'DISABLED'}`);

    // Fetch all published articles with author and reviewer
    const { data: articles, error } = await supabase
      .from('blog_articles')
      .select(`
        *,
        author:authors!author_id(*),
        reviewer:authors!reviewer_id(*)
      `)
      .eq('status', 'published');

    if (error) {
      console.error('❌ Error fetching articles:', error);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('⚠️  No published articles found');
      return;
    }

    console.log(`📝 Found ${articles.length} published articles`);

    let generated = 0;
    let failed = 0;

    for (const article of articles) {
      try {
        const html = generateStaticHTML(article as any, enhancedHreflang, productionAssets);
        const filePath = join(distDir, 'blog', article.slug, 'index.html');
        
        // Create directory if it doesn't exist
        mkdirSync(dirname(filePath), { recursive: true });
        
        // Write HTML file
        writeFileSync(filePath, html, 'utf-8');
        
        generated++;
        if (generated % 100 === 0) {
          console.log(`✅ Generated: ${generated} pages...`);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Failed to generate /blog/${article.slug}:`, err);
      }
    }

    console.log(`\n✨ Static generation complete!`);
    console.log(`   ✅ Generated: ${generated} pages`);
    console.log(`   📦 Production assets injected: ${productionAssets.css.length} CSS, ${productionAssets.js.length} JS`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} pages`);
    }
  } catch (err) {
    console.error('❌ Static generation failed:', err);
    throw err;
  }
}
