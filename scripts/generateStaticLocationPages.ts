import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// Create Supabase client with build-optimized settings
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-client-info': 'static-build' } }
});

const MAX_RETRIES = 3;

async function fetchWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  description: string
): Promise<T | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await queryFn();
      if (error) {
        console.error(`❌ ${description} error (attempt ${attempt}/${MAX_RETRIES}):`, error.message || error);
        if (attempt === MAX_RETRIES) return null;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      return data;
    } catch (err: any) {
      console.error(`❌ ${description} failed (attempt ${attempt}/${MAX_RETRIES}):`, err.message || err);
      if (attempt === MAX_RETRIES) return null;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return null;
}

interface LocationData {
  id: string;
  city_slug: string;
  topic_slug: string;
  city_name: string;
  region: string;
  country: string;
  intent_type: string;
  headline: string;
  meta_title: string;
  meta_description: string;
  speakable_answer: string;
  location_overview?: string;
  market_breakdown?: string;
  best_areas?: any[];
  cost_breakdown?: any[];
  use_cases?: string;
  final_summary?: string;
  qa_entities?: any[];
  featured_image_url?: string;
  featured_image_alt?: string;
  featured_image_caption?: string;
  internal_links?: any[];
  external_citations?: any[];
  language: string;
  date_published?: string;
  date_modified?: string;
  author?: any;
}

interface ProductionAssets {
  css: string[];
  js: string[];
}

const BASE_URL = 'https://www.delsolprimehomes.com';

function getProductionAssets(distDir: string): ProductionAssets {
  const indexPath = join(distDir, 'index.html');
  
  if (!existsSync(indexPath)) {
    return { css: [], js: [] };
  }
  
  const indexHtml = readFileSync(indexPath, 'utf-8');
  
  const cssMatches = indexHtml.match(/href="(\/assets\/[^"]+\.css)"/g) || [];
  const css = cssMatches.map(m => {
    const match = m.match(/href="([^"]+)"/);
    return match ? match[1] : '';
  }).filter(Boolean);
  
  const jsMatches = indexHtml.match(/src="(\/assets\/[^"]+\.js)"/g) || [];
  const js = jsMatches.map(m => {
    const match = m.match(/src="([^"]+)"/);
    return match ? match[1] : '';
  }).filter(Boolean);
  
  return { css, js };
}

// Schema generators
function generatePlaceSchema(location: LocationData) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}#place`,
    "name": location.city_name,
    "description": location.meta_description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": location.city_name,
      "addressRegion": location.region,
      "addressCountry": location.country === 'Spain' ? 'ES' : location.country
    },
    "containedInPlace": {
      "@type": "AdministrativeArea",
      "name": location.region
    }
  };
}

function generateLocalBusinessSchema(location: LocationData) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE_URL}/#organization`,
    "name": "Del Sol Prime Homes",
    "description": `Expert real estate services in ${location.city_name}, Costa del Sol`,
    "url": BASE_URL,
    "areaServed": {
      "@type": "Place",
      "name": location.city_name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location.city_name,
        "addressRegion": location.region,
        "addressCountry": location.country === 'Spain' ? 'ES' : location.country
      }
    }
  };
}

/**
 * Hans' AEO truncation for SSG - ensures acceptedAnswer compliance
 * Max 150 words, 800 chars, no lists, sentence boundary
 */
function truncateForAEO(text: string, maxChars: number = 800): string {
  if (!text || typeof text !== 'string') return '';
  
  // Clean list formatting
  let cleaned = text
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n\s*\d+\.\s+/g, ' ')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\n\s*[-*•]\s+/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Strip HTML
  cleaned = cleaned.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Max 150 words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 150) {
    cleaned = words.slice(0, 150).join(' ');
  }
  
  // If within limit, ensure proper ending
  if (cleaned.length <= maxChars) {
    if (!/[.!?]$/.test(cleaned)) cleaned += '.';
    return cleaned;
  }
  
  // Truncate at sentence boundary
  const truncated = cleaned.substring(0, maxChars);
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentence >= 160) {
    return cleaned.substring(0, lastSentence + 1).trim();
  }
  
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace >= 160 ? cleaned.substring(0, lastSpace).trim() : cleaned.substring(0, 160).trim()) + '.';
}

function generateLocationFAQSchema(location: LocationData) {
  if (!location.qa_entities?.length) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}#faq`,
    "inLanguage": location.language,
    "mainEntity": location.qa_entities.map(qa => ({
      "@type": "Question",
      "name": qa.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": truncateForAEO(qa.answer)
      }
    }))
  };
}

function generateSpeakableSchema(location: LocationData) {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "inLanguage": location.language,
    "cssSelector": [".speakable-answer", ".location-summary"]
  };
}

function generateBreadcrumbSchema(location: LocationData) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}#breadcrumb`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Locations", "item": `${BASE_URL}/locations` },
      { "@type": "ListItem", "position": 3, "name": location.city_name, "item": `${BASE_URL}/locations/${location.city_slug}` },
      { "@type": "ListItem", "position": 4, "name": location.headline, "item": `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}` }
    ]
  };
}

function generateWebPageSchema(location: LocationData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}#webpage`,
    "url": `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}`,
    "name": location.meta_title,
    "description": location.meta_description,
    "inLanguage": location.language,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL
    },
    "about": {
      "@type": "Place",
      "name": location.city_name
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-answer"]
    },
    "datePublished": location.date_published,
    "dateModified": location.date_modified
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
  
  #root { animation: staticFadeIn 0.3s ease-out; }
  
  @keyframes staticFadeIn {
    from { opacity: 0.97; }
    to { opacity: 1; }
  }
  
  .static-location {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }
  
  .static-location h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1rem;
  }
  
  .location-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: hsl(var(--prime-gold) / 0.1);
    border-radius: 9999px;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-bottom: 1rem;
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
  }
  
  .featured-image {
    width: 100%;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
  }
  
  .featured-image img {
    width: 100%;
    height: auto;
    border-radius: 0.75rem;
  }
  
  .content-section {
    font-size: 1.125rem;
    line-height: 1.8;
    margin-bottom: 2rem;
  }
  
  .content-section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    margin: 2rem 0 1rem;
  }
  
  .content-section p { margin-bottom: 1.25rem; }
  
  .best-areas {
    display: grid;
    gap: 1.5rem;
    margin: 2rem 0;
  }
  
  .area-card {
    padding: 1.5rem;
    background: hsl(var(--prime-gold) / 0.05);
    border-radius: 0.75rem;
    border-left: 4px solid hsl(var(--prime-gold) / 0.5);
  }
  
  .area-card h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }
  
  .area-card p {
    margin-bottom: 1rem;
    color: hsl(var(--muted-foreground));
  }
  
  .area-pros-cons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    font-size: 0.875rem;
  }
  
  .area-pros-cons h4 {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .area-pros-cons ul {
    list-style: none;
    padding: 0;
  }
  
  .area-pros-cons li {
    padding: 0.25rem 0;
    padding-left: 1rem;
    position: relative;
  }
  
  .area-pros-cons li::before {
    content: '•';
    position: absolute;
    left: 0;
  }
  
  .cost-table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;
  }
  
  .cost-table th, .cost-table td {
    padding: 1rem;
    border: 1px solid hsl(var(--prime-gold) / 0.2);
    text-align: left;
  }
  
  .cost-table th {
    background: hsl(var(--prime-gold) / 0.1);
    font-weight: 600;
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
    border-left: 3px solid hsl(var(--prime-gold) / 0.5);
  }
  
  .faq-item h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .faq-item p {
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
  }
  
  @media (max-width: 768px) {
    .static-location { padding: 2rem 1rem 3rem; }
    .area-pros-cons { grid-template-columns: 1fr; }
  }
`;

function generateStaticHTML(location: LocationData, productionAssets: ProductionAssets): string {
  const placeSchema = generatePlaceSchema(location);
  const localBusinessSchema = generateLocalBusinessSchema(location);
  const faqSchema = generateLocationFAQSchema(location);
  const speakableSchema = generateSpeakableSchema(location);
  const breadcrumbSchema = generateBreadcrumbSchema(location);
  const webPageSchema = generateWebPageSchema(location);
  
  const schemaScripts = [
    `<script type="application/ld+json" data-schema="place">${JSON.stringify(placeSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="localbusiness">${JSON.stringify(localBusinessSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="speakable">${JSON.stringify(speakableSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="breadcrumb">${JSON.stringify(breadcrumbSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="webpage">${JSON.stringify(webPageSchema, null, 2)}</script>`,
    faqSchema ? `<script type="application/ld+json" data-schema="faq">${JSON.stringify(faqSchema, null, 2)}</script>` : ''
  ].filter(Boolean).join('\n  ');

  const canonicalUrl = `${BASE_URL}/locations/${location.city_slug}/${location.topic_slug}`;

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  const bestAreasHTML = location.best_areas?.length 
    ? `<section class="best-areas">
        <h2>Best Areas in ${sanitizeForHTML(location.city_name)}</h2>
        ${location.best_areas.map((area: any) => `
        <div class="area-card">
          <h3>${sanitizeForHTML(area.name || '')}</h3>
          <p>${sanitizeForHTML(area.description || '')}</p>
          ${area.price_range ? `<p><strong>Price Range:</strong> ${sanitizeForHTML(area.price_range)}</p>` : ''}
          <div class="area-pros-cons">
            ${area.pros?.length ? `
            <div>
              <h4>Pros</h4>
              <ul>${area.pros.map((p: string) => `<li>${sanitizeForHTML(p)}</li>`).join('')}</ul>
            </div>
            ` : ''}
            ${area.cons?.length ? `
            <div>
              <h4>Cons</h4>
              <ul>${area.cons.map((c: string) => `<li>${sanitizeForHTML(c)}</li>`).join('')}</ul>
            </div>
            ` : ''}
          </div>
        </div>
        `).join('')}
      </section>`
    : '';

  const costTableHTML = location.cost_breakdown?.length 
    ? `<table class="cost-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Range</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${location.cost_breakdown.map((item: any) => `
          <tr>
            <td>${sanitizeForHTML(item.item || '')}</td>
            <td>${sanitizeForHTML(item.range || '')}</td>
            <td>${sanitizeForHTML(item.notes || '')}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="${location.language}" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(location.meta_description)}">
  <meta name="author" content="${location.author?.name || 'Del Sol Prime Homes'}">
  <meta name="geo.region" content="ES-MA">
  <meta name="geo.placename" content="${sanitizeForHTML(location.city_name)}">
  <title>${sanitizeForHTML(location.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />
  
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>${CRITICAL_CSS}</style>
  
  ${cssLinks}
  
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${sanitizeForHTML(location.meta_title)}" />
  <meta property="og:description" content="${sanitizeForHTML(location.meta_description)}" />
  ${location.featured_image_url ? `<meta property="og:image" content="${location.featured_image_url}" />` : ''}
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  <meta property="og:locale" content="${location.language === 'en' ? 'en_GB' : location.language}" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${sanitizeForHTML(location.meta_title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(location.meta_description)}" />
  ${location.featured_image_url ? `<meta name="twitter:image" content="${location.featured_image_url}" />` : ''}
  
  ${schemaScripts}
</head>
<body>
  <div id="root">
    <article class="static-location static-content" data-location-id="${location.id}">
      <span class="location-badge">${sanitizeForHTML(location.city_name)}, ${sanitizeForHTML(location.region)}</span>
      
      <h1>${sanitizeForHTML(location.headline)}</h1>
      
      ${location.featured_image_url ? `
      <figure class="featured-image">
        <img 
          src="${location.featured_image_url}" 
          alt="${sanitizeForHTML(location.featured_image_alt || location.headline)}"
          loading="eager"
        />
        ${location.featured_image_caption ? `<figcaption>${sanitizeForHTML(location.featured_image_caption)}</figcaption>` : ''}
      </figure>
      ` : ''}
      
      ${location.speakable_answer ? `
      <div class="speakable-box">
        <div class="speakable-box-label">Quick Answer</div>
        <div class="speakable-answer location-summary">${sanitizeForHTML(location.speakable_answer)}</div>
      </div>
      ` : ''}
      
      ${location.location_overview ? `
      <section class="content-section">
        <h2>Overview</h2>
        <div>${location.location_overview}</div>
      </section>
      ` : ''}
      
      ${location.market_breakdown ? `
      <section class="content-section">
        <h2>Market Overview</h2>
        <div>${location.market_breakdown}</div>
      </section>
      ` : ''}
      
      ${bestAreasHTML}
      
      ${costTableHTML ? `
      <section class="content-section">
        <h2>Cost Breakdown</h2>
        ${costTableHTML}
      </section>
      ` : ''}
      
      ${location.use_cases ? `
      <section class="content-section">
        <h2>Use Cases</h2>
        <div>${location.use_cases}</div>
      </section>
      ` : ''}
      
      ${location.final_summary ? `
      <section class="content-section">
        <h2>Summary</h2>
        <div>${location.final_summary}</div>
      </section>
      ` : ''}
      
      ${location.qa_entities && location.qa_entities.length > 0 ? `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${location.qa_entities.map((qa: any) => `
        <div class="faq-item">
          <h3>${sanitizeForHTML(qa.question)}</h3>
          <p>${sanitizeForHTML(qa.answer)}</p>
        </div>
        `).join('')}
      </section>
      ` : ''}
    </article>
  </div>
  
  ${jsScripts}
</body>
</html>`;
}

export async function generateStaticLocationPages(distDir: string) {
  console.log('📍 Starting static location page generation...');
  
  try {
    const productionAssets = getProductionAssets(distDir);
    
    const { data: locations, error } = await supabase
      .from('location_pages')
      .select(`
        *,
        author:authors!author_id(*),
        reviewer:authors!reviewer_id(*)
      `)
      .eq('status', 'published');

    if (error) {
      console.error('❌ Error fetching locations:', error);
      return;
    }

    if (!locations || locations.length === 0) {
      console.log('⚠️ No published location pages found');
      return;
    }

    console.log(`📝 Found ${locations.length} published location pages`);

    let generated = 0;
    let failed = 0;

    for (const location of locations) {
      try {
        const html = generateStaticHTML(location as any, productionAssets);
        const filePath = join(distDir, 'locations', location.city_slug, location.topic_slug, 'index.html');
        
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, html, 'utf-8');
        
        generated++;
      } catch (err) {
        failed++;
        console.error(`❌ Failed to generate /locations/${location.city_slug}/${location.topic_slug}:`, err);
      }
    }

    console.log(`✨ Location generation complete! Generated: ${generated}, Failed: ${failed}`);
  } catch (err) {
    console.error('❌ Location generation failed:', err);
    throw err;
  }
}

// Run if called directly
const distDir = process.argv[2] || 'dist';
generateStaticLocationPages(distDir);
