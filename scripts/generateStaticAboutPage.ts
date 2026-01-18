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

interface Founder {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  credentials: string[];
  years_experience: number;
  languages: string[];
  specialization: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Credential {
  name: string;
  issuer: string;
  year: string;
}

interface AboutPageData {
  id: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string | null;
  speakable_summary: string;
  hero_headline: string;
  hero_subheadline: string;
  mission_statement: string;
  our_story_content: string;
  why_choose_us_content: string;
  years_in_business: number | null;
  properties_sold: number | null;
  client_satisfaction_percent: number | null;
  faq_entities: FAQ[];
  founders: Founder[];
  credentials: Credential[];
  language: string | null;
}

interface ProductionAssets {
  css: string[];
  js: string[];
}

const BASE_URL = 'https://www.delsolprimehomes.com';

// Hardcoded founder data with LinkedIn URLs for entity disambiguation
const FOUNDERS_DATA: Founder[] = [
  {
    name: "Steven Roberts",
    role: "Co-Founder & Director",
    bio: "British real estate professional with 20+ years experience in Costa del Sol. Specializes in luxury villa sales and new developments.",
    photo_url: "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/steven-roberts.jpg",
    linkedin_url: "https://www.linkedin.com/in/stevenrobertsrealestate/",
    credentials: ["API Licensed Agent", "RICS Affiliate"],
    years_experience: 20,
    languages: ["English", "Spanish"],
    specialization: "Luxury Villas & New Developments"
  },
  {
    name: "Hans Beeckman",
    role: "Co-Founder & Sales Director",
    bio: "Belgian real estate expert with deep knowledge of the Dutch and Belgian buyer market. 15+ years guiding international clients through Spanish property purchases.",
    photo_url: "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/hans-beeckman.jpg",
    linkedin_url: "https://www.linkedin.com/in/hansbeeckman/",
    credentials: ["API Licensed Agent", "Property Investment Specialist"],
    years_experience: 15,
    languages: ["Dutch", "French", "English", "Spanish"],
    specialization: "International Buyers & Investment Properties"
  },
  {
    name: "Cédric Van Hecke",
    role: "Co-Founder & Client Relations",
    bio: "Belgian real estate consultant specializing in client relations and after-sales support. Expert in helping buyers navigate Spanish bureaucracy.",
    photo_url: "https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/cedric-vanhecke.jpg",
    linkedin_url: "https://www.linkedin.com/in/cedricvanhecke/",
    credentials: ["API Licensed Agent", "NIE & Residency Specialist"],
    years_experience: 12,
    languages: ["Dutch", "French", "English", "Spanish"],
    specialization: "Client Relations & Legal Coordination"
  }
];

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

// API Credential Schema
function generateAPICredentialSchema() {
  return {
    "@type": "EducationalOccupationalCredential",
    "@id": `${BASE_URL}/#api-credential`,
    "credentialCategory": "license",
    "name": "Agente de la Propiedad Inmobiliaria (API)",
    "description": "Official Spanish real estate agent license issued by the professional college",
    "recognizedBy": {
      "@type": "Organization",
      "name": "Colegio Oficial de Agentes de la Propiedad Inmobiliaria",
      "url": "https://www.consejocoapis.org/"
    }
  };
}

// Schema generators
function generateOrganizationSchema(content: AboutPageData) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "RealEstateAgent"],
    "@id": `${BASE_URL}/#organization`,
    "name": "Del Sol Prime Homes",
    "alternateName": "DSPH",
    "url": BASE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${BASE_URL}/assets/logo-new.png`,
      "width": 400,
      "height": 100
    },
    "description": content.speakable_summary,
    "foundingDate": "2010",
    "slogan": "Your Trusted Partners in Costa del Sol Real Estate",
    "knowsAbout": [
      "Costa del Sol Real Estate",
      "Spanish Property Law",
      "International Property Purchases",
      "Marbella Properties",
      "NIE Applications",
      "Golden Visa Spain"
    ],
    "areaServed": [
      { "@type": "City", "name": "Marbella", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Estepona", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Benalmádena", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Fuengirola", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } },
      { "@type": "City", "name": "Mijas", "containedInPlace": { "@type": "AdministrativeArea", "name": "Málaga" } }
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Avenida Ricardo Soriano",
      "addressLocality": "Marbella",
      "postalCode": "29601",
      "addressRegion": "Málaga",
      "addressCountry": "ES"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+34-952-000-000",
        "contactType": "sales",
        "availableLanguage": ["English", "Spanish", "Dutch", "French", "German"]
      }
    ],
    "sameAs": [
      "https://www.facebook.com/delsolprimehomes",
      "https://www.instagram.com/delsolprimehomes",
      "https://www.linkedin.com/company/delsolprimehomes"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": (content.properties_sold || 500).toString(),
      "bestRating": "5",
      "worstRating": "1"
    }
  };
}

function generateLocalBusinessSchema(content: AboutPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/#localbusiness`,
    "name": "Del Sol Prime Homes",
    "priceRange": "€€€",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Avenida Ricardo Soriano",
      "addressLocality": "Marbella",
      "postalCode": "29601",
      "addressRegion": "Málaga",
      "addressCountry": "ES"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 36.5090,
      "longitude": -4.8826
    },
    "url": BASE_URL,
    "telephone": "+34-952-000-000",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "10:00",
        "closes": "14:00"
      }
    ]
  };
}

function generatePersonSchemas(founders: Founder[]) {
  return founders.map((founder, index) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${BASE_URL}/about#founder-${index + 1}`,
    "name": founder.name,
    "jobTitle": founder.role,
    "description": founder.bio,
    "image": founder.photo_url?.startsWith('http') ? founder.photo_url : `${BASE_URL}${founder.photo_url}`,
    "url": founder.linkedin_url,
    "sameAs": [founder.linkedin_url],
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "knowsAbout": ["Costa del Sol Real Estate", founder.specialization, "Spanish Property Market"],
    "knowsLanguage": founder.languages?.map(lang => ({ "@type": "Language", "name": lang })) || []
  }));
}

function generateFAQPageSchema(faqs: FAQ[]) {
  if (!faqs?.length) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BASE_URL}/about#faq`,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

function generateBreadcrumbSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}/about#breadcrumb`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "About Us", "item": `${BASE_URL}/about` }
    ]
  };
}

function generateWebPageSchema(content: AboutPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${BASE_URL}/about#webpage`,
    "url": `${BASE_URL}/about`,
    "name": content.meta_title,
    "description": content.meta_description,
    "inLanguage": content.language || "en",
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "Del Sol Prime Homes"
    },
    "about": { "@id": `${BASE_URL}/#organization` },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-summary", ".mission-statement", "h1", ".faq-answer"]
    }
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
  
  .static-about {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }
  
  .static-about h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1rem;
    text-align: center;
  }
  
  .hero-subheadline {
    text-align: center;
    font-size: 1.25rem;
    color: hsl(var(--muted-foreground));
    margin-bottom: 3rem;
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
  
  .speakable-summary {
    font-size: 1.125rem;
    line-height: 1.6;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin: 3rem 0;
    text-align: center;
  }
  
  .stat-item h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2.5rem;
    color: hsl(var(--prime-gold));
    margin-bottom: 0.5rem;
  }
  
  .stat-item p {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
  
  .content-section {
    margin: 3rem 0;
  }
  
  .content-section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
  }
  
  .mission-statement {
    font-size: 1.25rem;
    font-style: italic;
    text-align: center;
    padding: 2rem;
    background: hsl(var(--prime-gold) / 0.05);
    border-radius: 0.75rem;
    margin: 2rem 0;
  }
  
  .founders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }
  
  .founder-card {
    padding: 1.5rem;
    background: hsl(var(--prime-gold) / 0.05);
    border-radius: 0.75rem;
    text-align: center;
  }
  
  .founder-card img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 1rem;
    border: 3px solid hsl(var(--prime-gold));
  }
  
  .founder-card h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }
  
  .founder-card .role {
    color: hsl(var(--prime-gold));
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  
  .founder-card .bio {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
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
  
  .faq-item p, .faq-answer {
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
  }
  
  @media (max-width: 768px) {
    .static-about { padding: 2rem 1rem 3rem; }
    .stats-grid { grid-template-columns: 1fr; gap: 1.5rem; }
    .stat-item h3 { font-size: 2rem; }
  }
`;

function generateStaticHTML(content: AboutPageData, productionAssets: ProductionAssets): string {
  // Use hardcoded founders if none in database
  const founders = content.founders && content.founders.length > 0 
    ? content.founders 
    : FOUNDERS_DATA;

  const organizationSchema = generateOrganizationSchema({ ...content, founders });
  const localBusinessSchema = generateLocalBusinessSchema(content);
  const apiCredentialSchema = generateAPICredentialSchema();
  const personSchemas = generatePersonSchemas(founders);
  const faqSchema = generateFAQPageSchema(content.faq_entities || []);
  const breadcrumbSchema = generateBreadcrumbSchema();
  const webPageSchema = generateWebPageSchema(content);
  
  // Build @graph array with API credential and Person schemas
  const graphItems = [
    organizationSchema,
    localBusinessSchema,
    apiCredentialSchema,
    ...personSchemas,
    breadcrumbSchema,
    webPageSchema,
    faqSchema
  ].filter(Boolean);
  
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": graphItems
  };
  
  const schemaScript = `<script type="application/ld+json" data-schema="about-graph">${JSON.stringify(schemaGraph, null, 2)}</script>`;

  const canonicalUrl = content.canonical_url || `${BASE_URL}/about`;

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  const foundersHTML = content.founders?.length 
    ? `<section class="content-section">
        <h2>Our Team</h2>
        <div class="founders-grid">
          ${content.founders.map((founder: Founder) => `
          <div class="founder-card">
            ${founder.photo_url ? `<img src="${founder.photo_url}" alt="${sanitizeForHTML(founder.name)}" />` : ''}
            <h3>${sanitizeForHTML(founder.name)}</h3>
            <p class="role">${sanitizeForHTML(founder.role)}</p>
            <p class="bio">${sanitizeForHTML(founder.bio)}</p>
          </div>
          `).join('')}
        </div>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="${content.language || 'en'}" data-static="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${sanitizeForHTML(content.meta_description)}">
  <meta name="author" content="Del Sol Prime Homes">
  <title>${sanitizeForHTML(content.meta_title)} | Del Sol Prime Homes</title>
  
  <link rel="canonical" href="${canonicalUrl}" />
  
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>${CRITICAL_CSS}</style>
  
  ${cssLinks}
  
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${sanitizeForHTML(content.meta_title)}" />
  <meta property="og:description" content="${sanitizeForHTML(content.meta_description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${sanitizeForHTML(content.meta_title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(content.meta_description)}" />
  
  ${schemaScript}
</head>
<body>
  <div id="root">
    <article class="static-about static-content" data-about-id="${content.id}">
      <h1>${sanitizeForHTML(content.hero_headline)}</h1>
      <p class="hero-subheadline">${sanitizeForHTML(content.hero_subheadline)}</p>
      
      <div class="speakable-box">
        <div class="speakable-box-label">About Us</div>
        <div class="speakable-summary">${sanitizeForHTML(content.speakable_summary)}</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <h3>${content.years_in_business}+</h3>
          <p>Years in Business</p>
        </div>
        <div class="stat-item">
          <h3>${content.properties_sold}+</h3>
          <p>Properties Sold</p>
        </div>
        <div class="stat-item">
          <h3>${content.client_satisfaction_percent}%</h3>
          <p>Client Satisfaction</p>
        </div>
      </div>
      
      <div class="mission-statement">
        "${sanitizeForHTML(content.mission_statement)}"
      </div>
      
      ${content.our_story_content ? `
      <section class="content-section">
        <h2>Our Story</h2>
        <div>${content.our_story_content}</div>
      </section>
      ` : ''}
      
      ${content.why_choose_us_content ? `
      <section class="content-section">
        <h2>Why Choose Us</h2>
        <div>${content.why_choose_us_content}</div>
      </section>
      ` : ''}
      
      ${foundersHTML}
      
      ${content.faq_entities && content.faq_entities.length > 0 ? `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${content.faq_entities.map((faq: FAQ) => `
        <div class="faq-item">
          <h3>${sanitizeForHTML(faq.question)}</h3>
          <p class="faq-answer">${sanitizeForHTML(faq.answer)}</p>
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

export async function generateStaticAboutPage(distDir: string) {
  console.log('👤 Starting static about page generation...');
  
  try {
    const productionAssets = getProductionAssets(distDir);
    
    const { data: aboutContent, error } = await supabase
      .from('about_page_content')
      .select('*')
      .eq('language', 'en')
      .single();

    if (error) {
      console.error('❌ Error fetching about content:', error);
      return;
    }

    if (!aboutContent) {
      console.log('⚠️ No about page content found');
      return;
    }

    // Parse JSON fields with proper type casting
    const content: AboutPageData = {
      ...aboutContent,
      faq_entities: (aboutContent.faq_entities as unknown as FAQ[]) || [],
      founders: (aboutContent.founders as unknown as Founder[]) || [],
      credentials: (aboutContent.credentials as unknown as Credential[]) || []
    };

    const html = generateStaticHTML(content, productionAssets);
    const filePath = join(distDir, 'about', 'index.html');
    
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, html, 'utf-8');
    
    console.log('✨ About page generated successfully!');
  } catch (err) {
    console.error('❌ About page generation failed:', err);
    throw err;
  }
}

// Run if called directly
const distDir = process.argv[2] || 'dist';
generateStaticAboutPage(distDir);
