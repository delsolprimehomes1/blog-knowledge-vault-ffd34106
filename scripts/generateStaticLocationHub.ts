import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-client-info': 'static-build' } }
});

const BASE_URL = 'https://www.delsolprimehomes.com';
const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da'];

const LOCALE_MAP: Record<string, string> = {
  en: 'en_GB', de: 'de_DE', fr: 'fr_FR', nl: 'nl_NL',
  sv: 'sv_SE', no: 'nb_NO', da: 'da_DK', fi: 'fi_FI',
  pl: 'pl_PL', hu: 'hu_HU',
};

// Localized content for the hub page
const LOCALIZED_CONTENT: Record<string, {
  title: string;
  description: string;
  h1: string;
  subtitle: string;
  speakable: string;
}> = {
  en: {
    title: 'Costa del Sol Location Guides | City Intelligence for Property Buyers',
    description: 'Explore 8 cities across Costa del Sol with expert guides on buying property, investment areas, cost of living, expat life, and retirement planning.',
    h1: 'Costa del Sol Location Guides',
    subtitle: 'Your Complete Real Estate Intelligence Hub',
    speakable: 'Our Costa del Sol Location Guides cover 8 cities with expert analysis on property buying, investment areas, cost of living, family neighborhoods, retirement options, and expat communities. Each guide provides actionable insights to help international buyers make informed real estate decisions.'
  },
  de: {
    title: 'Costa del Sol Standortführer | Stadt-Intelligenz für Immobilienkäufer',
    description: 'Entdecken Sie 8 Städte an der Costa del Sol mit Expertenführern zu Immobilienkauf, Investitionsgebieten, Lebenshaltungskosten, Expat-Leben und Ruhestandsplanung.',
    h1: 'Costa del Sol Standortführer',
    subtitle: 'Ihr kompletter Immobilien-Intelligenz-Hub',
    speakable: 'Unsere Costa del Sol Standortführer umfassen 8 Städte mit Expertenanalysen zu Immobilienkauf, Investitionsgebieten, Lebenshaltungskosten, Familienwohngebieten, Ruhestandsoptionen und Expat-Gemeinschaften.'
  },
  nl: {
    title: 'Costa del Sol Locatiegidsen | Stad Intelligentie voor Vastgoedkopers',
    description: 'Ontdek 8 steden aan de Costa del Sol met expertgidsen over vastgoedaankoop, investeringsgebieden, kosten van levensonderhoud, expat-leven en pensioenplanning.',
    h1: 'Costa del Sol Locatiegidsen',
    subtitle: 'Uw Complete Vastgoed Intelligentie Hub',
    speakable: 'Onze Costa del Sol Locatiegidsen behandelen 8 steden met deskundige analyses over vastgoedaankoop, investeringsgebieden, kosten van levensonderhoud, gezinsbuurten, pensioenopties en expat-gemeenschappen.'
  },
  fr: {
    title: 'Guides des Villes Costa del Sol | Intelligence Immobilière pour Acheteurs',
    description: 'Explorez 8 villes de la Costa del Sol avec des guides experts sur l\'achat immobilier, les zones d\'investissement, le coût de la vie, la vie d\'expatrié et la retraite.',
    h1: 'Guides des Villes Costa del Sol',
    subtitle: 'Votre Hub Complet d\'Intelligence Immobilière',
    speakable: 'Nos guides des villes de la Costa del Sol couvrent 8 villes avec des analyses expertes sur l\'achat immobilier, les zones d\'investissement, le coût de la vie, les quartiers familiaux, les options de retraite et les communautés d\'expatriés.'
  },
  sv: {
    title: 'Costa del Sol Stadsguider | Stadsintelligens för Fastighetsköpare',
    description: 'Utforska 8 städer längs Costa del Sol med expertguider om fastighetsköp, investeringsområden, levnadskostnader, expatlivet och pensionärsliv.',
    h1: 'Costa del Sol Stadsguider',
    subtitle: 'Din Kompletta Fastighetsintelligenshub',
    speakable: 'Våra Costa del Sol stadsguider täcker 8 städer med expertanalyser om fastighetsköp, investeringsområden, levnadskostnader, familjekvarter, pensionsalternativ och expatgemenskaper.'
  },
  pl: {
    title: 'Przewodniki po Miastach Costa del Sol | Inteligencja Miejska dla Nabywców Nieruchomości',
    description: 'Odkryj 8 miast Costa del Sol z eksperckimi przewodnikami po zakupie nieruchomości, obszarach inwestycyjnych, kosztach życia, życiu ekspatów i planowaniu emerytury.',
    h1: 'Przewodniki po Miastach Costa del Sol',
    subtitle: 'Twój Kompletny Hub Inteligencji Nieruchomości',
    speakable: 'Nasze przewodniki po miastach Costa del Sol obejmują 8 miast z eksperckimi analizami zakupu nieruchomości, obszarów inwestycyjnych, kosztów życia, dzielnic rodzinnych, opcji emerytalnych i społeczności ekspatów.'
  },
  no: {
    title: 'Costa del Sol Byguider | Byintelligens for Eiendomskjøpere',
    description: 'Utforsk 8 byer langs Costa del Sol med ekspertguider om eiendomskjøp, investeringsområder, levekostnader, expatliv og pensjonering.',
    h1: 'Costa del Sol Byguider',
    subtitle: 'Din Komplette Eiendomsintelligenshub',
    speakable: 'Våre Costa del Sol byguider dekker 8 byer med ekspertanalyser om eiendomskjøp, investeringsområder, levekostnader, familienabolag, pensjonsalternativer og expatsamfunn.'
  },
  da: {
    title: 'Costa del Sol Byguider | Byintelligens for Ejendomskøbere',
    description: 'Udforsk 8 byer langs Costa del Sol med ekspertguider om ejendomskøb, investeringsområder, leveomkostninger, expatliv og pensionering.',
    h1: 'Costa del Sol Byguider',
    subtitle: 'Din Komplette Ejendomsintelligenshub',
    speakable: 'Vores Costa del Sol byguider dækker 8 byer med ekspertanalyser om ejendomskøb, investeringsområder, leveomkostninger, familiekvarterer, pensionsmuligheder og expatsamfund.'
  },
  fi: {
    title: 'Costa del Sol Kaupunkioppaat | Kaupunki-intelligenssi Kiinteistön Ostajille',
    description: 'Tutustu 8 kaupunkiin Costa del Solilla asiantuntijaoppaiden avulla kiinteistön ostosta, sijoitusalueista, elinkustannuksista, ekspaattielämästä ja eläkkeelle jäämisestä.',
    h1: 'Costa del Sol Kaupunkioppaat',
    subtitle: 'Täydellinen Kiinteistö-intelligenssi Keskuksesi',
    speakable: 'Costa del Sol kaupunkioppaatmme kattavat 8 kaupunkia asiantuntija-analyyseineen kiinteistöjen ostosta, sijoitusalueista, elinkustannuksista, perhealueista, eläkevaihtoehdoista ja ekspaattiyhteisöistä.'
  },
  hu: {
    title: 'Costa del Sol Városvezetők | Városi Intelligencia Ingatlanvásárlóknak',
    description: 'Fedezzen fel 8 várost a Costa del Sol mentén szakértői útmutatókkal az ingatlanvásárlásról, befektetési területekről, megélhetési költségekről, expat életről és nyugdíjtervezésről.',
    h1: 'Costa del Sol Városvezetők',
    subtitle: 'Teljes Ingatlanhírszerzési Központja',
    speakable: 'Costa del Sol városvezetőink 8 várost fednek le szakértői elemzésekkel az ingatlanvásárlásról, befektetési területekről, megélhetési költségekről, családi környékekről, nyugdíjlehetőségekről és expat közösségekről.'
  }
};

// City data for ItemList schema
const CITIES = [
  { name: 'Marbella', slug: 'marbella', guideCount: 8 },
  { name: 'Estepona', slug: 'estepona', guideCount: 8 },
  { name: 'Fuengirola', slug: 'fuengirola', guideCount: 8 },
  { name: 'Benalmádena', slug: 'benalmadena', guideCount: 8 },
  { name: 'Mijas', slug: 'mijas', guideCount: 5 },
  { name: 'Casares', slug: 'casares', guideCount: 4 },
  { name: 'Málaga', slug: 'malaga', guideCount: 3 },
  { name: 'Torremolinos', slug: 'torremolinos', guideCount: 3 }
];

// Intent types for FAQ
const INTENT_TYPES = [
  'Buying Property',
  'Best Areas for Families',
  'Investment Areas',
  'Expat Guide',
  'Retirement Guide',
  'Cost of Living',
  'Property Prices',
  'Relocation Guide'
];

interface ProductionAssets {
  css: string[];
  js: string[];
}

function getProductionAssets(distDir: string): ProductionAssets {
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) return { css: [], js: [] };
  
  const indexHtml = readFileSync(indexPath, 'utf-8');
  
  const cssMatches = indexHtml.match(/href="(\/assets\/[^"]+\.css)"/g) || [];
  const css = cssMatches.map(m => m.match(/href="([^"]+)"/)?.[1] || '').filter(Boolean);
  
  const jsMatches = indexHtml.match(/src="(\/assets\/[^"]+\.js)"/g) || [];
  const js = jsMatches.map(m => m.match(/src="([^"]+)"/)?.[1] || '').filter(Boolean);
  
  return { css, js };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateHreflangTags(currentLang: string): string {
  const tags = SUPPORTED_LANGUAGES.map(lang => 
    `  <link rel="alternate" hreflang="${lang}" href="${BASE_URL}/${lang}/locations" />`
  );
  tags.push(`  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/locations" />`);
  return tags.join('\n');
}

function generateJsonLdGraph(lang: string, content: typeof LOCALIZED_CONTENT['en']) {
  const canonicalUrl = `${BASE_URL}/${lang}/locations`;
  
  const graph = [
    // WebPage with SpeakableSpecification
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      "url": canonicalUrl,
      "name": content.title,
      "description": content.description,
      "inLanguage": LOCALE_MAP[lang] || lang,
      "isPartOf": {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        "name": "Del Sol Prime Homes",
        "url": BASE_URL
      },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".speakable-hub-intro", ".hub-h1"]
      },
      "datePublished": "2024-01-01T00:00:00Z",
      "dateModified": new Date().toISOString()
    },
    // CollectionPage
    {
      "@type": "CollectionPage",
      "@id": `${canonicalUrl}#collectionpage`,
      "name": content.h1,
      "description": content.speakable,
      "url": canonicalUrl,
      "mainEntity": {
        "@type": "ItemList",
        "@id": `${canonicalUrl}#itemlist`,
        "numberOfItems": CITIES.length,
        "itemListElement": CITIES.map((city, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": city.name,
          "url": `${BASE_URL}/${lang}/locations/${city.slug}`
        }))
      }
    },
    // BreadcrumbList
    {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/${lang}` },
        { "@type": "ListItem", "position": 2, "name": content.h1, "item": canonicalUrl }
      ]
    },
    // Organization
    {
      "@type": "RealEstateAgent",
      "@id": `${BASE_URL}/#organization`,
      "name": "Del Sol Prime Homes",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/assets/logo-new.png`,
        "width": 512,
        "height": 512
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Marbella",
        "addressRegion": "Málaga",
        "addressCountry": "ES"
      },
      "areaServed": CITIES.map(city => ({
        "@type": "City",
        "name": city.name
      }))
    },
    // FAQPage
    {
      "@type": "FAQPage",
      "@id": `${canonicalUrl}#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What are Location Intelligence Pages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Location Intelligence Pages are comprehensive guides covering 8 Costa del Sol cities. Each guide addresses specific buyer intents including property buying, investment analysis, cost of living, family neighborhoods, retirement planning, and expat communities."
          }
        },
        {
          "@type": "Question",
          "name": "Which cities are covered?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `We cover ${CITIES.length} Costa del Sol cities: ${CITIES.map(c => c.name).join(', ')}. Each city has multiple guides tailored to different buyer needs and intents.`
          }
        },
        {
          "@type": "Question",
          "name": "What topics do the guides cover?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Our guides cover ${INTENT_TYPES.length} intent types: ${INTENT_TYPES.join(', ')}. Each guide provides expert analysis, price data, and actionable recommendations.`
          }
        },
        {
          "@type": "Question",
          "name": "Are guides available in my language?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, our guides are available in ${SUPPORTED_LANGUAGES.length} languages: English, German, Dutch, French, Swedish, Polish, Norwegian, Danish, Finnish, and Hungarian.`
          }
        },
        {
          "@type": "Question",
          "name": "How often is the content updated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our location guides are updated regularly with the latest market data, price trends, and neighborhood insights. We monitor property markets continuously to ensure accuracy."
          }
        }
      ]
    }
  ];

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

function generateStaticHTML(lang: string, productionAssets: ProductionAssets): string {
  const content = LOCALIZED_CONTENT[lang] || LOCALIZED_CONTENT.en;
  const canonicalUrl = `${BASE_URL}/${lang}/locations`;
  const hreflangTags = generateHreflangTags(lang);
  const jsonLd = generateJsonLdGraph(lang, content);
  const locale = LOCALE_MAP[lang] || 'en_GB';
  
  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(content.title)}</title>
  <meta name="title" content="${escapeHtml(content.title)}" />
  <meta name="description" content="${escapeHtml(content.description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  
  <!-- Canonical & Hreflang -->
  <link rel="canonical" href="${canonicalUrl}" />
${hreflangTags}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${escapeHtml(content.title)}" />
  <meta property="og:description" content="${escapeHtml(content.description)}" />
  <meta property="og:image" content="${BASE_URL}/assets/costa-del-sol-locations.jpg" />
  <meta property="og:locale" content="${locale}" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${escapeHtml(content.title)}" />
  <meta name="twitter:description" content="${escapeHtml(content.description)}" />
  <meta name="twitter:image" content="${BASE_URL}/assets/costa-del-sol-locations.jpg" />
  
  <!-- JSON-LD Schema -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@300;400;500;700&family=Raleway:wght@300;400;500;600&display=swap" rel="stylesheet" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png" />
  
  <!-- Production Assets -->
  ${cssLinks}
</head>
<body>
  <div id="root">
    <!-- Static content for SEO crawlers -->
    <main class="static-hub-content" style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
      <nav aria-label="Breadcrumb" style="margin-bottom: 1.5rem; font-size: 0.875rem; color: #6b7280;">
        <a href="/${lang}" style="color: inherit;">Home</a> › 
        <span style="color: #c9a227;">${escapeHtml(content.h1)}</span>
      </nav>
      
      <header style="text-align: center; margin-bottom: 3rem;">
        <div style="display: inline-flex; gap: 0.5rem; margin-bottom: 1rem;">
          <span style="background: rgba(201, 162, 39, 0.1); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">${CITIES.length} Cities</span>
          <span style="background: rgba(201, 162, 39, 0.1); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">${CITIES.reduce((sum, c) => sum + c.guideCount, 0)}+ Guides</span>
          <span style="background: rgba(201, 162, 39, 0.1); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">${SUPPORTED_LANGUAGES.length} Languages</span>
        </div>
        <h1 class="hub-h1" style="font-family: 'Playfair Display', serif; font-size: 2.5rem; margin-bottom: 0.5rem;">${escapeHtml(content.h1)}</h1>
        <p style="font-size: 1.25rem; color: #6b7280;">${escapeHtml(content.subtitle)}</p>
      </header>
      
      <!-- Speakable Hub Introduction -->
      <section class="speakable-hub-intro" style="background: linear-gradient(135deg, rgba(201, 162, 39, 0.1), rgba(201, 162, 39, 0.05)); border-left: 4px solid #c9a227; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 3rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #c9a227; font-weight: 600;">🎙️ AI-Ready Summary</span>
        </div>
        <p style="font-size: 1.125rem; line-height: 1.6;">${escapeHtml(content.speakable)}</p>
      </section>
      
      <!-- What to Expect Section -->
      <section style="margin-bottom: 3rem;">
        <h2 style="font-family: 'Playfair Display', serif; font-size: 1.75rem; text-align: center; margin-bottom: 2rem;">What to Expect</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          ${INTENT_TYPES.map(intent => `
          <div style="padding: 1.25rem; background: rgba(201, 162, 39, 0.05); border-radius: 0.75rem; border-left: 3px solid rgba(201, 162, 39, 0.5);">
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">${intent}</h3>
          </div>
          `).join('')}
        </div>
      </section>
      
      <!-- Featured Cities -->
      <section style="margin-bottom: 3rem;">
        <h2 style="font-family: 'Playfair Display', serif; font-size: 1.75rem; text-align: center; margin-bottom: 2rem;">Explore by City</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
          ${CITIES.map(city => `
          <a href="/${lang}/locations/${city.slug}" style="display: block; padding: 1.5rem; background: #f9fafb; border-radius: 0.75rem; text-decoration: none; color: inherit; transition: box-shadow 0.2s;">
            <h3 style="font-family: 'Playfair Display', serif; font-size: 1.25rem; margin-bottom: 0.5rem;">${city.name}</h3>
            <span style="font-size: 0.875rem; color: #c9a227;">${city.guideCount} guides available</span>
          </a>
          `).join('')}
        </div>
      </section>
      
      <!-- FAQ Section -->
      <section style="padding-top: 2rem; border-top: 1px solid rgba(201, 162, 39, 0.2);">
        <h2 style="font-family: 'Playfair Display', serif; font-size: 1.75rem; text-align: center; margin-bottom: 2rem;">Frequently Asked Questions</h2>
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="margin-bottom: 1rem; padding: 1.25rem; background: rgba(201, 162, 39, 0.05); border-radius: 0.5rem; border-left: 3px solid rgba(201, 162, 39, 0.5);">
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">What are Location Intelligence Pages?</h3>
            <p style="color: #6b7280; line-height: 1.6;">Location Intelligence Pages are comprehensive guides covering 8 Costa del Sol cities. Each guide addresses specific buyer intents including property buying, investment analysis, cost of living, family neighborhoods, retirement planning, and expat communities.</p>
          </div>
          <div style="margin-bottom: 1rem; padding: 1.25rem; background: rgba(201, 162, 39, 0.05); border-radius: 0.5rem; border-left: 3px solid rgba(201, 162, 39, 0.5);">
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Which cities are covered?</h3>
            <p style="color: #6b7280; line-height: 1.6;">We cover ${CITIES.length} Costa del Sol cities: ${CITIES.map(c => c.name).join(', ')}. Each city has multiple guides tailored to different buyer needs.</p>
          </div>
          <div style="margin-bottom: 1rem; padding: 1.25rem; background: rgba(201, 162, 39, 0.05); border-radius: 0.5rem; border-left: 3px solid rgba(201, 162, 39, 0.5);">
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Are guides available in my language?</h3>
            <p style="color: #6b7280; line-height: 1.6;">Yes, our guides are available in ${SUPPORTED_LANGUAGES.length} languages: English, German, Dutch, French, Swedish, Polish, Norwegian, Danish, Finnish, and Hungarian.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
  
  ${jsScripts}
</body>
</html>`;
}

async function main() {
  const distDir = process.argv[2] || 'dist';
  console.log('🌍 Generating static Location Hub pages...');
  console.log(`   Target directory: ${distDir}`);
  
  const productionAssets = getProductionAssets(distDir);
  console.log(`   Found ${productionAssets.css.length} CSS, ${productionAssets.js.length} JS assets`);
  
  let generated = 0;
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const outputDir = join(distDir, lang, 'locations');
    mkdirSync(outputDir, { recursive: true });
    
    const html = generateStaticHTML(lang, productionAssets);
    const outputPath = join(outputDir, 'index.html');
    
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`   ✅ Generated: ${lang}/locations/index.html`);
    generated++;
  }
  
  console.log(`\n✅ Generated ${generated} Location Hub pages`);
}

main().catch(console.error);
