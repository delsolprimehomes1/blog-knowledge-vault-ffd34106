import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
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
  faq_entities?: any[];
  translations: Record<string, string>;
  author?: any;
  reviewer?: any;
}

function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": "https://delsolprimehomes.com/#organization",
    "name": "Del Sol Prime Homes",
    "legalName": "Del Sol Prime Homes",
    "url": "https://delsolprimehomes.com/",
    "description": "Premium real estate agency specializing in Costa del Sol new-build and off-plan properties",
    "logo": {
      "@type": "ImageObject",
      "url": "https://delsolprimehomes.com/assets/logo-new.png",
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
      "availableLanguage": ["en", "es", "de", "nl", "fr", "pl", "sv", "da", "hu"],
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
    "@id": `https://delsolprimehomes.com/team/${author.name.toLowerCase().replace(/\s+/g, '-')}#person`,
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

function generateArticleSchema(article: ArticleData) {
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `https://delsolprimehomes.com/blog/${article.slug}#article`,
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
      "@id": `https://delsolprimehomes.com/team/${article.author.name.toLowerCase().replace(/\s+/g, '-')}#person`
    } : undefined,
    "publisher": {
      "@id": "https://delsolprimehomes.com/#organization"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://delsolprimehomes.com/blog/${article.slug}`
    },
    "inLanguage": article.language
  };
}

function generateSpeakableSchema(article: ArticleData) {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-answer", ".article-intro"],
    "associatedMedia": {
      "@type": "ImageObject",
      "url": article.featured_image_url
    }
  };
}

function generateBreadcrumbSchema(article: ArticleData) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://delsolprimehomes.com/blog/${article.slug}#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://delsolprimehomes.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://delsolprimehomes.com/blog/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.headline,
        "item": `https://delsolprimehomes.com/blog/${article.slug}/`
      }
    ]
  };
}

function generateFAQSchema(article: ArticleData) {
  if (!article.faq_entities || article.faq_entities.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://delsolprimehomes.com/blog/${article.slug}#faq`,
    "inLanguage": article.language,
    "mainEntity": article.faq_entities.map((faq: any) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
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

function generateStaticHTML(article: ArticleData): string {
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

  // Build hreflang links for translations
  const hreflangLinks = Object.entries(article.translations)
    .map(([lang, slug]) => `  <link rel="alternate" hreflang="${lang}" href="https://delsolprimehomes.com/blog/${slug}" />`)
    .join('\n');

  const canonicalUrl = article.canonical_url || `https://delsolprimehomes.com/blog/${article.slug}`;

  return `<!DOCTYPE html>
<html lang="${article.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(article.meta_description)}">
  <meta name="author" content="${article.author?.name || 'Del Sol Prime Homes'}">
  <title>${sanitizeForHTML(article.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />
${hreflangLinks}
  
  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${sanitizeForHTML(article.meta_title)}" />
  <meta property="og:description" content="${sanitizeForHTML(article.meta_description)}" />
  <meta property="og:image" content="${article.featured_image_url}" />
  <meta property="og:url" content="https://delsolprimehomes.com/blog/${article.slug}" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${sanitizeForHTML(article.meta_title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(article.meta_description)}" />
  <meta name="twitter:image" content="${article.featured_image_url}" />
  
  <!-- JSON-LD Schemas -->
  ${schemaScripts}
  
  <!-- Preconnect to improve performance -->
  <link rel="preconnect" href="https://kazggnufaoicopvmwhdl.supabase.co">
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
</head>
<body>
  <div id="root">
    <!-- Pre-rendered content for SEO -->
    <article class="static-content" data-article-id="${article.id}">
      <header>
        <h1>${sanitizeForHTML(article.headline)}</h1>
        ${article.read_time ? `<p>Reading time: ${article.read_time} minutes</p>` : ''}
      </header>
      
      ${article.featured_image_url ? `
      <figure>
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
      
      <div class="article-content">
        ${article.detailed_content}
      </div>
      
      ${article.faq_entities && article.faq_entities.length > 0 ? `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${article.faq_entities.map((faq: any) => `
        <div class="faq-item">
          <h3>${sanitizeForHTML(faq.question)}</h3>
          <p>${sanitizeForHTML(faq.answer)}</p>
        </div>
        `).join('')}
      </section>
      ` : ''}
    </article>
  </div>
  
  <!-- React will hydrate this content -->
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export async function generateStaticPages(distDir: string) {
  console.log('🚀 Starting static page generation...');
  
  try {
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
        const html = generateStaticHTML(article as any);
        const filePath = join(distDir, 'blog', article.slug, 'index.html');
        
        // Create directory if it doesn't exist
        mkdirSync(dirname(filePath), { recursive: true });
        
        // Write HTML file
        writeFileSync(filePath, html, 'utf-8');
        
        generated++;
        console.log(`✅ Generated: /blog/${article.slug}`);
      } catch (err) {
        failed++;
        console.error(`❌ Failed to generate /blog/${article.slug}:`, err);
      }
    }

    console.log(`\n✨ Static generation complete!`);
    console.log(`   ✅ Generated: ${generated} pages`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} pages`);
    }
  } catch (err) {
    console.error('❌ Static generation failed:', err);
    throw err;
  }
}
