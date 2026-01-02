import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

interface QAPageData {
  id: string;
  slug: string;
  language: string;
  title: string;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  question_main: string;
  answer_main: string;
  speakable_answer: string;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption?: string;
  related_qas?: any[];
  translations?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  author?: any;
  source_article_slug?: string;
}

interface ProductionAssets {
  css: string[];
  js: string[];
}

const langToHreflang: Record<string, string> = {
  en: 'en-GB', de: 'de-DE', nl: 'nl-NL',
  fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE', 
  da: 'da-DK', hu: 'hu-HU', fi: 'fi-FI', no: 'nb-NO'
};

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

function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": "https://www.delsolprimehomes.com/#organization",
    "name": "Del Sol Prime Homes",
    "url": "https://www.delsolprimehomes.com/"
  };
}

function generateFAQPageSchema(qa: QAPageData) {
  const mainEntity = [{
    "@type": "Question",
    "name": qa.question_main,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": qa.answer_main
    }
  }];

  // Add related QAs if present
  if (qa.related_qas && Array.isArray(qa.related_qas)) {
    qa.related_qas.forEach((relatedQA: any) => {
      if (relatedQA.question && relatedQA.answer) {
        mainEntity.push({
          "@type": "Question",
          "name": relatedQA.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": relatedQA.answer
          }
        });
      }
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://www.delsolprimehomes.com/qa/${qa.slug}#faq`,
    "inLanguage": qa.language,
    "mainEntity": mainEntity
  };
}

function generateWebPageSchema(qa: QAPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `https://www.delsolprimehomes.com/qa/${qa.slug}#webpage`,
    "url": `https://www.delsolprimehomes.com/qa/${qa.slug}`,
    "name": qa.meta_title,
    "description": qa.meta_description,
    "inLanguage": qa.language,
    "datePublished": qa.created_at,
    "dateModified": qa.updated_at || qa.created_at,
    "isPartOf": {
      "@id": "https://www.delsolprimehomes.com/#website"
    },
    "author": qa.author ? {
      "@type": "Person",
      "name": qa.author.name
    } : undefined
  };
}

function generateBreadcrumbSchema(qa: QAPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://www.delsolprimehomes.com/qa/${qa.slug}#breadcrumb`,
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
        "name": "Q&A",
        "item": "https://www.delsolprimehomes.com/qa/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": qa.title,
        "item": `https://www.delsolprimehomes.com/qa/${qa.slug}/`
      }
    ]
  };
}

function generateSpeakableSchema(qa: QAPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "cssSelector": [".speakable-answer", ".qa-question-main"]
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
 * Critical CSS for QA pages
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
  
  #root {
    animation: staticFadeIn 0.3s ease-out;
  }
  
  @keyframes staticFadeIn {
    from { opacity: 0.97; }
    to { opacity: 1; }
  }
  
  .static-qa-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }
  
  .static-qa-page h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 700;
    line-height: 1.3;
    color: hsl(var(--foreground));
    margin-bottom: 1.5rem;
  }
  
  .qa-question {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 1rem;
    padding-left: 1.5rem;
    border-left: 4px solid hsl(var(--prime-gold));
  }
  
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
  
  .qa-answer {
    font-size: 1.125rem;
    line-height: 1.8;
    margin-bottom: 2rem;
  }
  
  .qa-answer p { margin-bottom: 1.25rem; }
  
  .qa-answer a {
    color: hsl(var(--prime-gold));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  
  .related-qa-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid hsl(var(--prime-gold) / 0.2);
  }
  
  .related-qa-section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .related-qa-item {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background: hsl(var(--prime-gold) / 0.05);
    border-radius: 0.5rem;
    border-left: 3px solid hsl(var(--prime-gold) / 0.5);
  }
  
  .related-qa-item h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: hsl(var(--foreground));
  }
  
  .related-qa-item p {
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
  }
  
  .source-article-link {
    display: inline-block;
    margin-top: 2rem;
    padding: 0.75rem 1.5rem;
    background: hsl(var(--prime-gold));
    color: white;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: opacity 0.2s;
  }
  
  .source-article-link:hover {
    opacity: 0.9;
  }
  
  @media (max-width: 768px) {
    .static-qa-page { padding: 2rem 1rem 3rem; }
  }
`;

function generateStaticHTML(qa: QAPageData, enhancedHreflang: boolean, productionAssets: ProductionAssets): string {
  const organizationSchema = generateOrganizationSchema();
  const faqPageSchema = generateFAQPageSchema(qa);
  const webPageSchema = generateWebPageSchema(qa);
  const breadcrumbSchema = generateBreadcrumbSchema(qa);
  const speakableSchema = generateSpeakableSchema(qa);
  
  const schemaScripts = [
    `<script type="application/ld+json" data-schema="organization">${JSON.stringify(organizationSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="faqpage">${JSON.stringify(faqPageSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="webpage">${JSON.stringify(webPageSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="breadcrumb">${JSON.stringify(breadcrumbSchema, null, 2)}</script>`,
    `<script type="application/ld+json" data-schema="speakable">${JSON.stringify(speakableSchema, null, 2)}</script>`
  ].join('\n  ');

  const baseUrl = 'https://www.delsolprimehomes.com';
  const canonicalUrl = qa.canonical_url || `${baseUrl}/qa/${qa.slug}`;

  // Build hreflang links
  let hreflangLinks = '';
  if (enhancedHreflang) {
    const hreflangLinksArray = [];
    const currentUrl = `${baseUrl}/qa/${qa.slug}`;

    // Self-referencing
    const currentLangCode = langToHreflang[qa.language] || qa.language;
    hreflangLinksArray.push(`  <link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`);

    // Translations
    if (qa.translations && typeof qa.translations === 'object') {
      Object.entries(qa.translations).forEach(([lang, slug]) => {
        if (slug && typeof slug === 'string' && lang !== qa.language) {
          const langCode = langToHreflang[lang] || lang;
          hreflangLinksArray.push(`  <link rel="alternate" hreflang="${langCode}" href="${baseUrl}/qa/${slug}" />`);
        }
      });
    }

    // x-default
    const xDefaultSlug = (qa.translations as Record<string, string>)?.en || qa.slug;
    hreflangLinksArray.push(`  <link rel="alternate" hreflang="x-default" href="${baseUrl}/qa/${xDefaultSlug}" />`);

    hreflangLinks = '\n' + hreflangLinksArray.join('\n');
  }

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  return `<!DOCTYPE html>
<html lang="${qa.language}" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(qa.meta_description)}">
  <meta name="author" content="${qa.author?.name || 'Del Sol Prime Homes'}">
  <title>${sanitizeForHTML(qa.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />${hreflangLinks}
  
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>${CRITICAL_CSS}</style>
  
  ${cssLinks}
  
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${sanitizeForHTML(qa.meta_title)}" />
  <meta property="og:description" content="${sanitizeForHTML(qa.meta_description)}" />
  <meta property="og:image" content="${qa.featured_image_url}" />
  <meta property="og:url" content="${baseUrl}/qa/${qa.slug}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${sanitizeForHTML(qa.meta_title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(qa.meta_description)}" />
  <meta name="twitter:image" content="${qa.featured_image_url}" />
  
  ${schemaScripts}
</head>
<body>
  <div id="root">
    <article class="static-qa-page static-content" data-qa-id="${qa.id}">
      <h1>${sanitizeForHTML(qa.title)}</h1>
      
      <div class="qa-question qa-question-main">${sanitizeForHTML(qa.question_main)}</div>
      
      ${qa.speakable_answer ? `
      <div class="speakable-box">
        <div class="speakable-box-label">Quick Answer</div>
        <div class="speakable-answer">${sanitizeForHTML(qa.speakable_answer)}</div>
      </div>
      ` : ''}
      
      <div class="qa-answer">
        ${qa.answer_main}
      </div>
      
      ${qa.related_qas && qa.related_qas.length > 0 ? `
      <section class="related-qa-section">
        <h2>Related Questions</h2>
        ${qa.related_qas.map((relatedQA: any) => `
        <div class="related-qa-item">
          <h3>${sanitizeForHTML(relatedQA.question || '')}</h3>
          <p>${sanitizeForHTML(relatedQA.answer || '')}</p>
        </div>
        `).join('')}
      </section>
      ` : ''}
      
      ${qa.source_article_slug ? `
      <a href="/blog/${qa.source_article_slug}" class="source-article-link">
        Read Full Article →
      </a>
      ` : ''}
    </article>
  </div>
  
  ${jsScripts}
</body>
</html>`;
}

/**
 * Generate static QA Index page with ItemList + CollectionPage schema
 */
function generateQAIndexHTML(qaPages: QAPageData[], productionAssets: ProductionAssets): string {
  const baseUrl = 'https://www.delsolprimehomes.com';
  
  // Generate comprehensive schema for QA index
  const indexSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${baseUrl}/qa#collectionpage`,
        "name": "Questions & Answers",
        "description": "Expert answers to common questions about buying property in Costa del Sol, Spain",
        "url": `${baseUrl}/qa`,
        "isPartOf": { "@id": `${baseUrl}/#website` },
        "about": { "@type": "Thing", "name": "Costa del Sol Real Estate" },
        "mainEntity": {
          "@type": "ItemList",
          "@id": `${baseUrl}/qa#itemlist`,
          "name": "Costa del Sol Property Q&A",
          "description": "Expert answers to common questions about buying property in Costa del Sol, Spain",
          "numberOfItems": qaPages.length,
          "itemListElement": qaPages.slice(0, 100).map((qa, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": qa.question_main,
            "url": `${baseUrl}/qa/${qa.slug}`
          }))
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${baseUrl}/qa#breadcrumb`,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
          { "@type": "ListItem", "position": 2, "name": "Q&A", "item": `${baseUrl}/qa` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/qa#webpage`,
        "url": `${baseUrl}/qa`,
        "name": "Questions & Answers | Del Sol Prime Homes",
        "description": "Find answers to common questions about buying property in Costa del Sol, Spain. Expert advice on real estate, legal processes, and lifestyle.",
        "isPartOf": { "@id": `${baseUrl}/#website` },
        "inLanguage": "en-GB"
      },
      generateOrganizationSchema()
    ]
  };

  // Group QAs by category for static display
  const qasByCategory: Record<string, QAPageData[]> = {};
  qaPages.forEach(qa => {
    const cat = (qa as any).category || 'General';
    if (!qasByCategory[cat]) qasByCategory[cat] = [];
    qasByCategory[cat].push(qa);
  });

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  const qaListHtml = Object.entries(qasByCategory).map(([category, qas]) => `
    <section class="qa-category-section">
      <h2 class="qa-category-title">${sanitizeForHTML(category)}</h2>
      <div class="qa-list">
        ${qas.slice(0, 20).map(qa => `
        <a href="/qa/${qa.slug}" class="qa-list-item">
          <h3 class="qa-item-question">${sanitizeForHTML(qa.question_main)}</h3>
          <p class="qa-item-preview">${sanitizeForHTML(qa.speakable_answer?.substring(0, 120) || '')}...</p>
        </a>
        `).join('')}
      </div>
    </section>
  `).join('');

  const indexCss = `
    ${CRITICAL_CSS}
    
    .qa-index-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 3rem 1.5rem 4rem;
    }
    
    .qa-index-hero {
      text-align: center;
      padding: 4rem 0 3rem;
    }
    
    .qa-index-hero h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      color: hsl(var(--foreground));
      margin-bottom: 1rem;
    }
    
    .qa-index-hero p {
      font-size: 1.125rem;
      color: hsl(var(--muted-foreground));
      max-width: 600px;
      margin: 0 auto;
    }
    
    .qa-category-section {
      margin-bottom: 3rem;
    }
    
    .qa-category-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid hsl(var(--prime-gold) / 0.3);
    }
    
    .qa-list {
      display: grid;
      gap: 1rem;
    }
    
    .qa-list-item {
      display: block;
      padding: 1.25rem;
      background: hsl(var(--prime-gold) / 0.05);
      border-radius: 0.5rem;
      border-left: 3px solid hsl(var(--prime-gold));
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .qa-list-item:hover {
      background: hsl(var(--prime-gold) / 0.1);
      transform: translateX(4px);
    }
    
    .qa-item-question {
      font-size: 1.125rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin-bottom: 0.5rem;
    }
    
    .qa-item-preview {
      font-size: 0.9rem;
      color: hsl(var(--muted-foreground));
      line-height: 1.5;
    }
    
    @media (min-width: 768px) {
      .qa-list {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Find answers to common questions about buying property in Costa del Sol, Spain. Expert advice on real estate, legal processes, and lifestyle.">
  <title>Questions & Answers | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${baseUrl}/qa" />
  
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>${indexCss}</style>
  
  ${cssLinks}
  
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Questions & Answers | Del Sol Prime Homes" />
  <meta property="og:description" content="Find answers to common questions about buying property in Costa del Sol, Spain." />
  <meta property="og:url" content="${baseUrl}/qa" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Questions & Answers | Del Sol Prime Homes" />
  <meta name="twitter:description" content="Find answers to common questions about buying property in Costa del Sol, Spain." />
  
  <script type="application/ld+json" data-schema="qa-index">
${JSON.stringify(indexSchema, null, 2)}
  </script>
</head>
<body>
  <div id="root">
    <main class="qa-index-page static-content">
      <div class="qa-index-hero">
        <h1>Questions & Answers</h1>
        <p>Expert answers to your questions about Costa del Sol real estate, property buying, and Mediterranean lifestyle.</p>
      </div>
      
      ${qaListHtml}
    </main>
  </div>
  
  ${jsScripts}
</body>
</html>`;
}

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

export async function generateStaticQAPages(distDir: string) {
  console.log('\n🔍 Starting static QA page generation...');
  
  try {
    const productionAssets = getProductionAssets(distDir);
    const enhancedHreflang = await checkFeatureFlag('enhanced_hreflang');
    console.log(`🏳️ Feature flag 'enhanced_hreflang': ${enhancedHreflang ? 'ENABLED' : 'DISABLED'}`);

    // Fetch all published QA pages
    const { data: qaPages, error } = await supabase
      .from('qa_pages')
      .select(`
        *,
        author:authors!author_id(*)
      `)
      .eq('status', 'published');

    if (error) {
      console.error('❌ Error fetching QA pages:', error);
      return;
    }

    if (!qaPages || qaPages.length === 0) {
      console.log('⚠️ No published QA pages found');
      return;
    }

    console.log(`📝 Found ${qaPages.length} published QA pages`);

    let generated = 0;
    let failed = 0;

    for (const qa of qaPages) {
      try {
        const lang = qa.language || 'en';
        const html = generateStaticHTML(qa as any, enhancedHreflang, productionAssets);
        // Generate with language prefix: /en/qa/{slug}/index.html
        const filePath = join(distDir, lang, 'qa', qa.slug, 'index.html');
        
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, html, 'utf-8');
        
        generated++;
        if (generated % 50 === 0) {
          console.log(`✅ Generated: ${generated} QA pages...`);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Failed to generate /${qa.language || 'en'}/qa/${qa.slug}:`, err);
      }
    }

    // Generate language-specific QA Index pages with ItemList schema
    const languages = ['en', 'de', 'nl', 'fr', 'sv', 'no', 'da', 'fi', 'pl', 'hu'];
    for (const lang of languages) {
      try {
        const langPages = qaPages.filter(qa => qa.language === lang);
        if (langPages.length > 0) {
          const indexHtml = generateQAIndexHTML(langPages as any[], productionAssets);
          const indexPath = join(distDir, lang, 'qa', 'index.html');
          mkdirSync(dirname(indexPath), { recursive: true });
          writeFileSync(indexPath, indexHtml, 'utf-8');
          console.log(`✅ Generated /${lang}/qa/ index page with ${langPages.length} items`);
        }
      } catch (err) {
        console.error(`❌ Failed to generate /${lang}/qa/ index page:`, err);
      }
    }

    console.log(`\n✨ Static QA generation complete!`);
    console.log(`   ✅ Generated: ${generated} QA pages + index`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} pages`);
    }
  } catch (err) {
    console.error('❌ Static QA generation failed:', err);
    throw err;
  }
}

// Run if called directly
const distDir = join(process.cwd(), 'dist');
generateStaticQAPages(distDir).catch(console.error);
