import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ComparisonData {
  id: string;
  slug: string;
  language: string;
  headline: string;
  meta_title: string;
  meta_description: string;
  option_a: string;
  option_b: string;
  comparison_topic: string;
  speakable_answer: string;
  option_a_overview?: string;
  option_b_overview?: string;
  side_by_side_breakdown?: string;
  use_case_scenarios?: string;
  final_verdict?: string;
  quick_comparison_table?: any[];
  qa_entities?: any[];
  external_citations?: any[];
  internal_links?: any[];
  featured_image_url?: string;
  featured_image_alt?: string;
  featured_image_caption?: string;
  date_published?: string;
  date_modified?: string;
  category?: string;
  author?: any;
  reviewer?: any;
  translations?: Record<string, string>;
  canonical_url?: string;
  hreflang_group_id?: string;
}

interface ProductionAssets {
  css: string[];
  js: string[];
}

const BASE_URL = 'https://www.delsolprimehomes.com';
const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

const langToHreflang: Record<string, string> = {
  en: 'en-GB', de: 'de-DE', nl: 'nl-NL',
  fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE', 
  da: 'da-DK', hu: 'hu-HU', fi: 'fi-FI', no: 'nb-NO'
};

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
function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE_URL}/#organization`,
    "name": "Del Sol Prime Homes",
    "url": BASE_URL,
    "logo": `${BASE_URL}/assets/logo-new.png`,
    "areaServed": [
      { "@type": "City", "name": "Marbella" },
      { "@type": "City", "name": "Estepona" },
      { "@type": "City", "name": "Fuengirola" },
      { "@type": "City", "name": "Benalmádena" },
      { "@type": "City", "name": "Mijas" }
    ]
  };
}

function generateComparisonArticleSchema(comparison: ComparisonData) {
  const canonicalUrl = comparison.canonical_url || `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    "headline": comparison.headline,
    "description": comparison.meta_description,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "publisher": { "@id": `${BASE_URL}/#organization` },
    "datePublished": comparison.date_published,
    "dateModified": comparison.date_modified || comparison.date_published,
    "inLanguage": comparison.language,
    "about": [
      { "@type": "Thing", "name": comparison.option_a },
      { "@type": "Thing", "name": comparison.option_b }
    ],
    ...(comparison.featured_image_url && {
      "image": {
        "@type": "ImageObject",
        "url": comparison.featured_image_url,
        "caption": comparison.featured_image_caption || comparison.headline
      }
    }),
    ...(comparison.author && {
      "author": {
        "@type": "Person",
        "name": comparison.author.name,
        "jobTitle": comparison.author.job_title
      }
    })
  };
}

function generateComparisonFAQSchema(comparison: ComparisonData) {
  if (!comparison.qa_entities?.length) return null;
  const canonicalUrl = comparison.canonical_url || `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
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

function generateSpeakableSchema(comparison: ComparisonData) {
  const canonicalUrl = comparison.canonical_url || `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage-speakable`,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-answer", ".comparison-summary", ".final-verdict", ".speakable-box"]
    },
    "url": canonicalUrl
  };
}

function generateBreadcrumbSchema(comparison: ComparisonData) {
  const canonicalUrl = comparison.canonical_url || `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${comparison.language}` },
      { "@type": "ListItem", "position": 2, "name": "Comparisons", "item": `${BASE_URL}/${comparison.language}/compare` },
      { "@type": "ListItem", "position": 3, "name": comparison.headline, "item": canonicalUrl }
    ]
  };
}

function generateTableSchema(comparison: ComparisonData) {
  if (!comparison.quick_comparison_table?.length) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "Table",
    "about": `${comparison.option_a} vs ${comparison.option_b} comparison`,
    "description": `Detailed comparison between ${comparison.option_a} and ${comparison.option_b}`,
    "inLanguage": comparison.language
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
  
  .static-comparison {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }
  
  .static-comparison h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1rem;
  }
  
  .comparison-badge {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
  
  .comparison-badge span {
    padding: 0.25rem 0.75rem;
    background: hsl(var(--prime-gold) / 0.1);
    border-radius: 9999px;
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
  
  .comparison-table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;
  }
  
  .comparison-table th, .comparison-table td {
    padding: 1rem;
    border: 1px solid hsl(var(--prime-gold) / 0.2);
    text-align: left;
  }
  
  .comparison-table th {
    background: hsl(var(--prime-gold) / 0.1);
    font-weight: 600;
  }
  
  .comparison-table tr:nth-child(even) {
    background: hsl(var(--prime-gold) / 0.03);
  }
  
  .option-overview {
    padding: 1.5rem;
    background: hsl(var(--prime-gold) / 0.05);
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .option-overview h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .final-verdict {
    padding: 2rem;
    background: linear-gradient(135deg, hsl(var(--prime-gold) / 0.15), hsl(var(--prime-gold) / 0.05));
    border-radius: 0.75rem;
    margin: 2rem 0;
  }
  
  .final-verdict h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    margin-bottom: 1rem;
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
  
  @media (max-width: 768px) {
    .static-comparison { padding: 2rem 1rem 3rem; }
    .comparison-table { font-size: 0.875rem; }
    .comparison-table th, .comparison-table td { padding: 0.75rem 0.5rem; }
  }
`;

function generateHreflangTags(comparison: ComparisonData): string {
  const hreflangLinks: string[] = [];
  const canonicalUrl = comparison.canonical_url || `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;
  
  // Self-referencing tag
  const currentLangCode = langToHreflang[comparison.language] || comparison.language;
  hreflangLinks.push(`  <link rel="alternate" hreflang="${currentLangCode}" href="${canonicalUrl}" />`);

  // Translations from JSONB
  if (comparison.translations && typeof comparison.translations === 'object') {
    Object.entries(comparison.translations).forEach(([lang, slug]) => {
      if (slug && typeof slug === 'string' && lang !== comparison.language) {
        const langCode = langToHreflang[lang] || lang;
        hreflangLinks.push(`  <link rel="alternate" hreflang="${langCode}" href="${BASE_URL}/${lang}/compare/${slug}" />`);
      }
    });
  }

  // x-default pointing to English version
  const xDefaultSlug = (comparison.translations as Record<string, string>)?.en || comparison.slug;
  hreflangLinks.push(`  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/compare/${xDefaultSlug}" />`);

  return hreflangLinks.join('\n');
}

function generateStaticHTML(comparison: ComparisonData, productionAssets: ProductionAssets): string {
  const organizationSchema = generateOrganizationSchema();
  const articleSchema = generateComparisonArticleSchema(comparison);
  const faqSchema = generateComparisonFAQSchema(comparison);
  const speakableSchema = generateSpeakableSchema(comparison);
  const breadcrumbSchema = generateBreadcrumbSchema(comparison);
  const tableSchema = generateTableSchema(comparison);
  
  const schemaScripts = [
    `<script type="application/ld+json" data-schema="organization">${JSON.stringify(organizationSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="article">${JSON.stringify(articleSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="speakable">${JSON.stringify(speakableSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="breadcrumb">${JSON.stringify(breadcrumbSchema, null, 2)}</script>`,
    faqSchema ? `<script type="application/ld+json" data-schema="faq">${JSON.stringify(faqSchema, null, 2)}</script>` : '',
    tableSchema ? `<script type="application/ld+json" data-schema="table">${JSON.stringify(tableSchema, null, 2)}</script>` : ''
  ].filter(Boolean).join('\n  ');

  const canonicalUrl = comparison.canonical_url || `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;
  const hreflangTags = generateHreflangTags(comparison);

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  const comparisonTable = comparison.quick_comparison_table?.length 
    ? `<table class="comparison-table">
        <thead>
          <tr>
            <th>Criterion</th>
            <th>${sanitizeForHTML(comparison.option_a)}</th>
            <th>${sanitizeForHTML(comparison.option_b)}</th>
          </tr>
        </thead>
        <tbody>
          ${comparison.quick_comparison_table.map((row: any) => `
            <tr>
              <td>${sanitizeForHTML(row.criterion || '')}</td>
              <td>${sanitizeForHTML(row.option_a_value || '')}</td>
              <td>${sanitizeForHTML(row.option_b_value || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="${comparison.language}" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(comparison.meta_description)}">
  <meta name="author" content="${comparison.author?.name || 'Del Sol Prime Homes'}">
  <title>${sanitizeForHTML(comparison.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />
${hreflangTags}
  
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>${CRITICAL_CSS}</style>
  
  ${cssLinks}
  
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${sanitizeForHTML(comparison.meta_title)}" />
  <meta property="og:description" content="${sanitizeForHTML(comparison.meta_description)}" />
  ${comparison.featured_image_url ? `<meta property="og:image" content="${comparison.featured_image_url}" />` : ''}
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${sanitizeForHTML(comparison.meta_title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(comparison.meta_description)}" />
  ${comparison.featured_image_url ? `<meta name="twitter:image" content="${comparison.featured_image_url}" />` : ''}
  
  ${schemaScripts}
</head>
<body>
  <div id="root">
    <article class="static-comparison static-content" data-comparison-id="${comparison.id}">
      <div class="comparison-badge">
        <span>${sanitizeForHTML(comparison.option_a)}</span>
        <span>vs</span>
        <span>${sanitizeForHTML(comparison.option_b)}</span>
      </div>
      
      <h1>${sanitizeForHTML(comparison.headline)}</h1>
      
      ${comparison.speakable_answer ? `
      <div class="speakable-box">
        <div class="speakable-box-label">Quick Summary</div>
        <div class="speakable-answer comparison-summary">${sanitizeForHTML(comparison.speakable_answer)}</div>
      </div>
      ` : ''}
      
      ${comparisonTable}
      
      ${comparison.option_a_overview ? `
      <div class="option-overview">
        <h2>${sanitizeForHTML(comparison.option_a)} Overview</h2>
        <div>${comparison.option_a_overview}</div>
      </div>
      ` : ''}
      
      ${comparison.option_b_overview ? `
      <div class="option-overview">
        <h2>${sanitizeForHTML(comparison.option_b)} Overview</h2>
        <div>${comparison.option_b_overview}</div>
      </div>
      ` : ''}
      
      ${comparison.side_by_side_breakdown ? `
      <section class="content-section">
        <h2>Side-by-Side Breakdown</h2>
        <div>${comparison.side_by_side_breakdown}</div>
      </section>
      ` : ''}
      
      ${comparison.use_case_scenarios ? `
      <section class="content-section">
        <h2>Use Case Scenarios</h2>
        <div>${comparison.use_case_scenarios}</div>
      </section>
      ` : ''}
      
      ${comparison.final_verdict ? `
      <div class="final-verdict">
        <h2>Final Verdict</h2>
        <div>${comparison.final_verdict}</div>
      </div>
      ` : ''}
      
      ${comparison.qa_entities && comparison.qa_entities.length > 0 ? `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${comparison.qa_entities.map((qa: any) => `
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

// Generate Comparison Index page for a specific language
function generateComparisonIndexHTML(comparisons: ComparisonData[], productionAssets: ProductionAssets, lang: string = 'en'): string {
  const indexSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/${lang}/compare#collectionpage`,
        "name": "Property Comparisons",
        "description": "Expert comparisons to help you make informed decisions about buying property in Costa del Sol",
        "url": `${BASE_URL}/${lang}/compare`,
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": comparisons.length,
          "itemListElement": comparisons.slice(0, 50).map((c, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": c.headline,
            "url": `${BASE_URL}/${c.language}/compare/${c.slug}`
          }))
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
          { "@type": "ListItem", "position": 2, "name": "Comparisons", "item": `${BASE_URL}/${lang}/compare` }
        ]
      }
    ]
  };

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  // 11 hreflang tags for index page
  const hreflangTags = SUPPORTED_LANGUAGES.map(l => 
    `  <link rel="alternate" hreflang="${langToHreflang[l] || l}" href="${BASE_URL}/${l}/compare" />`
  ).join('\n') + `\n  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/compare" />`;

  return `<!DOCTYPE html>
<html lang="${lang}" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Expert property comparisons to help you make informed real estate decisions in Costa del Sol, Spain.">
  <title>Property Comparisons | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${BASE_URL}/${lang}/compare" />
${hreflangTags}
  
  <link rel="icon" type="image/png" href="/favicon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
  
  <style>${CRITICAL_CSS}</style>
  
  ${cssLinks}
  
  <script type="application/ld+json">${JSON.stringify(indexSchema, null, 2)}</script>
</head>
<body>
  <div id="root">
    <main class="static-comparison static-content">
      <h1>Property Comparisons</h1>
      <p>Expert comparisons to help you make informed decisions about buying property in Costa del Sol.</p>
      
      <div style="display: grid; gap: 1.5rem; margin-top: 2rem;">
        ${comparisons.map(c => `
        <a href="/${c.language}/compare/${c.slug}" style="display: block; padding: 1.5rem; background: hsl(var(--prime-gold) / 0.05); border-radius: 0.5rem; text-decoration: none; color: inherit;">
          <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem;">${sanitizeForHTML(c.headline)}</h2>
          <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem;">${sanitizeForHTML(c.option_a)} vs ${sanitizeForHTML(c.option_b)}</p>
        </a>
        `).join('')}
      </div>
    </main>
  </div>
  
  ${jsScripts}
</body>
</html>`;
}

export async function generateStaticComparisonPages(distDir: string) {
  console.log('⚖️ Starting static comparison page generation...');
  
  try {
    const productionAssets = getProductionAssets(distDir);
    
    const { data: comparisons, error } = await supabase
      .from('comparison_pages')
      .select(`
        *,
        author:authors!author_id(*),
        reviewer:authors!reviewer_id(*)
      `)
      .eq('status', 'published');

    if (error) {
      console.error('❌ Error fetching comparisons:', error);
      return;
    }

    if (!comparisons || comparisons.length === 0) {
      console.log('⚠️ No published comparisons found');
      return;
    }

    console.log(`📝 Found ${comparisons.length} published comparisons`);

    let generated = 0;
    let failed = 0;

    // Generate individual comparison pages WITH language prefix
    for (const comparison of comparisons) {
      try {
        const lang = comparison.language || 'en';
        const html = generateStaticHTML(comparison as any, productionAssets);
        // Generate with language prefix: /{lang}/compare/{slug}/index.html
        const filePath = join(distDir, lang, 'compare', comparison.slug, 'index.html');
        
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, html, 'utf-8');
        
        generated++;
        if (generated % 20 === 0) {
          console.log(`✅ Generated: ${generated} comparison pages...`);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Failed to generate /${comparison.language || 'en'}/compare/${comparison.slug}:`, err);
      }
    }

    // Generate language-specific comparison index pages
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        const langPages = comparisons.filter(c => c.language === lang);
        if (langPages.length > 0) {
          const indexHtml = generateComparisonIndexHTML(langPages as any, productionAssets, lang);
          const indexPath = join(distDir, lang, 'compare', 'index.html');
          mkdirSync(dirname(indexPath), { recursive: true });
          writeFileSync(indexPath, indexHtml, 'utf-8');
          console.log(`✅ Generated /${lang}/compare/ index page with ${langPages.length} items`);
        }
      } catch (err) {
        console.error(`❌ Failed to generate /${lang}/compare/ index page:`, err);
      }
    }

    console.log(`✨ Comparison generation complete! Generated: ${generated}, Failed: ${failed}`);
  } catch (err) {
    console.error('❌ Comparison generation failed:', err);
    throw err;
  }
}

// Run if called directly
const distDir = process.argv[2] || join(process.cwd(), 'dist');
generateStaticComparisonPages(distDir).catch(console.error);
