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

function generateArticleSchema(article: ArticleData) {
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  
  return {
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
  if (!article.faq_entities || article.faq_entities.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://www.delsolprimehomes.com/blog/${article.slug}#faq`,
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

/**
 * Critical inline CSS for static pages - ensures pages look good without JS
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
  
  .static-header {
    background: hsl(var(--prime-950));
    padding: 1rem 0;
    border-bottom: 1px solid hsl(var(--prime-gold) / 0.3);
  }
  
  .static-header-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .static-logo {
    color: hsl(var(--prime-gold));
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
  }
  
  .static-nav {
    display: flex;
    gap: 1.5rem;
  }
  
  .static-nav a {
    color: rgba(255,255,255,0.8);
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
  }
  
  .static-nav a:hover { color: hsl(var(--prime-gold)); }
  
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
  
  .speakable-box {
    background: linear-gradient(135deg, hsl(var(--prime-gold) / 0.1), hsl(var(--prime-gold) / 0.05));
    border-left: 4px solid hsl(var(--prime-gold));
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .speakable-box-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: hsl(var(--prime-gold));
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  .speakable-answer {
    font-size: 1.125rem;
    line-height: 1.6;
    color: hsl(var(--foreground));
  }
  
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
  
  .static-footer {
    background: hsl(var(--prime-950));
    color: rgba(255,255,255,0.7);
    padding: 3rem 0 2rem;
    margin-top: 4rem;
  }
  
  .static-footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    text-align: center;
  }
  
  .static-footer-logo {
    color: hsl(var(--prime-gold));
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 700;
    text-decoration: none;
    display: inline-block;
    margin-bottom: 1rem;
  }
  
  .static-footer p {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .static-footer-links {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .static-footer-links a {
    color: rgba(255,255,255,0.6);
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .static-footer-links a:hover { color: hsl(var(--prime-gold)); }
  
  @media (max-width: 640px) {
    .static-nav { display: none; }
    .static-article { padding: 2rem 1rem 3rem; }
    .article-content { font-size: 1rem; }
  }
`;

/**
 * Generate static HTML for an article
 * @param article - Article data
 * @param enhancedHreflang - Whether to include hreflang tags (controlled by feature flag)
 */
function generateStaticHTML(article: ArticleData, enhancedHreflang: boolean): string {
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

  return `<!DOCTYPE html>
<html lang="${article.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(article.meta_description)}">
  <meta name="author" content="${article.author?.name || 'Del Sol Prime Homes'}">
  <title>${sanitizeForHTML(article.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />${hreflangLinks}
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
  
  <!-- Critical CSS for static rendering -->
  <style>${CRITICAL_CSS}</style>
  
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
  <!-- Static Header -->
  <header class="static-header">
    <div class="static-header-inner">
      <a href="/" class="static-logo">Del Sol Prime Homes</a>
      <nav class="static-nav">
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
        <a href="/property-finder">Properties</a>
      </nav>
    </div>
  </header>

  <div id="root">
    <!-- Pre-rendered content for SEO and no-JS browsers -->
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
  
  <!-- Static Footer -->
  <footer class="static-footer">
    <div class="static-footer-inner">
      <a href="/" class="static-footer-logo">Del Sol Prime Homes</a>
      <p>Premium Real Estate on the Costa del Sol</p>
      <p>Marbella, Estepona, Fuengirola, Benalmádena, Mijas</p>
      <div class="static-footer-links">
        <a href="/blog">Blog</a>
        <a href="/property-finder">Properties</a>
        <a href="/privacy">Privacy Policy</a>
      </div>
      <p style="margin-top: 1.5rem; opacity: 0.6;">© ${new Date().getFullYear()} Del Sol Prime Homes. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}
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

export async function generateStaticPages(distDir: string) {
  console.log('🚀 Starting static page generation...');
  
  try {
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
        const html = generateStaticHTML(article as any, enhancedHreflang);
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