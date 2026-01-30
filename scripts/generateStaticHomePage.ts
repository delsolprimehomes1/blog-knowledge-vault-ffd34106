import 'dotenv/config';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Static Homepage Generator for SSG - Multi-Language Version
 * 
 * This script generates static index.html files for ALL 10 supported languages
 * with fully rendered content for search engine and AI bot crawlers. Each page includes:
 * - Correct <html lang="XX"> attribute
 * - Language-specific title and description
 * - Self-referencing canonical URL
 * - Full hreflang tags (10 languages + x-default)
 * - Correct Open Graph locale
 * - Critical CSS for immediate rendering
 * - Complete JSON-LD structured data
 */

interface ProductionAssets {
  css: string[];
  js: string[];
}

const BASE_URL = 'https://www.delsolprimehomes.com';

// Official 10 languages as per memory
const LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'] as const;
type Language = typeof LANGUAGES[number];

// Language-specific metadata for homepage
const HOMEPAGE_META: Record<Language, {
  title: string;
  description: string;
  ogLocale: string;
  heroHeadline: string;
  heroHighlight: string;
  heroDescription: string;
  speakableSummary: string;
}> = {
  en: {
    title: 'Del Sol Prime Homes | Luxury Costa del Sol Real Estate',
    description: 'Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties in Marbella, Estepona, and more.',
    ogLocale: 'en_GB',
    heroHeadline: 'Find Your Perfect Home on the',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium real estate agency with 35+ years of expertise in Marbella, Estepona, Fuengirola, and the entire Costa del Sol. We guide international buyers through every step of purchasing their dream property in Spain.',
    speakableSummary: 'Del Sol Prime Homes is a luxury real estate agency on Spain\'s Costa del Sol. We help international buyers find and purchase properties in Marbella, Estepona, Fuengirola, Benalmádena, Mijas, and Sotogrande. Our expert team speaks English, Dutch, French, German, and more. Contact us at +34 630 03 90 90.',
  },
  de: {
    title: 'Del Sol Prime Homes | Luxus Costa del Sol Immobilien',
    description: 'Premium-Immobilienagentur spezialisiert auf Costa del Sol Immobilien. Expertenberatung für den Kauf von Luxusvillen, Apartments und Anlageimmobilien in Marbella, Estepona und mehr.',
    ogLocale: 'de_DE',
    heroHeadline: 'Finden Sie Ihr Traumhaus an der',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium-Immobilienagentur mit über 35 Jahren Erfahrung in Marbella, Estepona, Fuengirola und der gesamten Costa del Sol. Wir begleiten internationale Käufer bei jedem Schritt zum Kauf ihrer Traumimmobilie in Spanien.',
    speakableSummary: 'Del Sol Prime Homes ist eine Luxus-Immobilienagentur an Spaniens Costa del Sol. Wir helfen internationalen Käufern beim Kauf von Immobilien in Marbella, Estepona, Fuengirola, Benalmádena, Mijas und Sotogrande. Unser Expertenteam spricht Deutsch, Englisch, Niederländisch und mehr. Kontaktieren Sie uns unter +34 630 03 90 90.',
  },
  nl: {
    title: 'Del Sol Prime Homes | Luxe Costa del Sol Vastgoed',
    description: 'Premium vastgoedkantoor gespecialiseerd in Costa del Sol eigendommen. Deskundige begeleiding bij de aankoop van luxe villa\'s, appartementen en investeringsvastgoed in Marbella, Estepona en meer.',
    ogLocale: 'nl_NL',
    heroHeadline: 'Vind Uw Droomhuis aan de',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium vastgoedkantoor met 35+ jaar ervaring in Marbella, Estepona, Fuengirola en de hele Costa del Sol. Wij begeleiden internationale kopers bij elke stap van de aankoop van hun droomwoning in Spanje.',
    speakableSummary: 'Del Sol Prime Homes is een luxe vastgoedkantoor aan de Spaanse Costa del Sol. Wij helpen internationale kopers bij het vinden en kopen van vastgoed in Marbella, Estepona, Fuengirola, Benalmádena, Mijas en Sotogrande. Ons team spreekt Nederlands, Engels, Frans, Duits en meer. Neem contact op via +34 630 03 90 90.',
  },
  fr: {
    title: 'Del Sol Prime Homes | Immobilier de Luxe Costa del Sol',
    description: 'Agence immobilière premium spécialisée dans les propriétés Costa del Sol. Conseils experts pour l\'achat de villas de luxe, appartements et biens d\'investissement à Marbella, Estepona et plus.',
    ogLocale: 'fr_FR',
    heroHeadline: 'Trouvez Votre Maison de Rêve sur la',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Agence immobilière premium avec plus de 35 ans d\'expertise à Marbella, Estepona, Fuengirola et toute la Costa del Sol. Nous accompagnons les acheteurs internationaux à chaque étape de l\'achat de leur propriété de rêve en Espagne.',
    speakableSummary: 'Del Sol Prime Homes est une agence immobilière de luxe sur la Costa del Sol en Espagne. Nous aidons les acheteurs internationaux à trouver et acheter des propriétés à Marbella, Estepona, Fuengirola, Benalmádena, Mijas et Sotogrande. Notre équipe parle français, anglais, néerlandais et plus. Contactez-nous au +34 630 03 90 90.',
  },
  pl: {
    title: 'Del Sol Prime Homes | Luksusowe Nieruchomości Costa del Sol',
    description: 'Premium agencja nieruchomości specjalizująca się w nieruchomościach Costa del Sol. Eksperckie doradztwo przy zakupie luksusowych willi, apartamentów i nieruchomości inwestycyjnych w Marbelli, Esteponie i nie tylko.',
    ogLocale: 'pl_PL',
    heroHeadline: 'Znajdź Swój Wymarzony Dom na',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium agencja nieruchomości z ponad 35-letnim doświadczeniem w Marbelli, Esteponie, Fuengiroli i całej Costa del Sol. Prowdzimy międzynarodowych nabywców przez każdy etap zakupu ich wymarzonej nieruchomości w Hiszpanii.',
    speakableSummary: 'Del Sol Prime Homes to luksusowa agencja nieruchomości na hiszpańskiej Costa del Sol. Pomagamy międzynarodowym nabywcom w znalezieniu i zakupie nieruchomości w Marbelli, Esteponie, Fuengiroli, Benalmádenie, Mijas i Sotogrande. Nasz zespół mówi po polsku, angielsku, niemiecku i więcej. Skontaktuj się z nami: +34 630 03 90 90.',
  },
  sv: {
    title: 'Del Sol Prime Homes | Lyxiga Costa del Sol Fastigheter',
    description: 'Premium fastighetsbyrå specialiserad på Costa del Sol fastigheter. Expertvägledning för köp av lyxvillor, lägenheter och investeringsfastigheter i Marbella, Estepona och mer.',
    ogLocale: 'sv_SE',
    heroHeadline: 'Hitta Ditt Drömhem på',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium fastighetsbyrå med 35+ års expertis i Marbella, Estepona, Fuengirola och hela Costa del Sol. Vi vägleder internationella köpare genom varje steg i köpet av deras drömfastighet i Spanien.',
    speakableSummary: 'Del Sol Prime Homes är en lyxig fastighetsbyrå på Spaniens Costa del Sol. Vi hjälper internationella köpare att hitta och köpa fastigheter i Marbella, Estepona, Fuengirola, Benalmádena, Mijas och Sotogrande. Vårt team talar svenska, engelska, tyska och mer. Kontakta oss på +34 630 03 90 90.',
  },
  da: {
    title: 'Del Sol Prime Homes | Luksus Costa del Sol Ejendomme',
    description: 'Premium ejendomsmæglerbureau specialiseret i Costa del Sol ejendomme. Ekspertvejledning til køb af luksusvillaer, lejligheder og investeringsejendomme i Marbella, Estepona og mere.',
    ogLocale: 'da_DK',
    heroHeadline: 'Find Dit Drømmehjem på',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium ejendomsmæglerbureau med 35+ års ekspertise i Marbella, Estepona, Fuengirola og hele Costa del Sol. Vi guider internationale købere gennem hvert trin i købet af deres drømmebolig i Spanien.',
    speakableSummary: 'Del Sol Prime Homes er et luksuriøst ejendomsmæglerbureau på Spaniens Costa del Sol. Vi hjælper internationale købere med at finde og købe ejendomme i Marbella, Estepona, Fuengirola, Benalmádena, Mijas og Sotogrande. Vores team taler dansk, engelsk, tysk og mere. Kontakt os på +34 630 03 90 90.',
  },
  hu: {
    title: 'Del Sol Prime Homes | Luxus Costa del Sol Ingatlanok',
    description: 'Prémium ingatlaniroda, amely Costa del Sol ingatlanokra specializálódott. Szakértői tanácsadás luxusvillák, apartmanok és befektetési ingatlanok vásárlásához Marbellán, Esteponán és másutt.',
    ogLocale: 'hu_HU',
    heroHeadline: 'Találja Meg Álomotthonát a',
    heroHighlight: 'Costa del Sol-on',
    heroDescription: 'Prémium ingatlaniroda több mint 35 éves tapasztalattal Marbellán, Esteponán, Fuengirolán és az egész Costa del Sol-on. Nemzetközi vásárlókat kísérünk végig álomingatlanuk megvásárlásának minden lépésén Spanyolországban.',
    speakableSummary: 'A Del Sol Prime Homes egy luxus ingatlaniroda a spanyol Costa del Sol-on. Segítünk a nemzetközi vásárlóknak ingatlanokat találni és vásárolni Marbellán, Esteponán, Fuengirolán, Benalmádenában, Mijasban és Sotogrande-ban. Csapatunk beszél magyarul, angolul, németül és más nyelveken. Elérhetőség: +34 630 03 90 90.',
  },
  fi: {
    title: 'Del Sol Prime Homes | Luksus Costa del Sol Kiinteistöt',
    description: 'Premium-kiinteistötoimisto, joka on erikoistunut Costa del Solin kiinteistöihin. Asiantunteva opastus luksushuviloiden, asuntojen ja sijoituskiinteistöjen ostamiseen Marbellassa, Esteponassa ja muualla.',
    ogLocale: 'fi_FI',
    heroHeadline: 'Löydä Unelmiesi Koti',
    heroHighlight: 'Costa del Solilta',
    heroDescription: 'Premium-kiinteistötoimisto yli 35 vuoden kokemuksella Marbellassa, Esteponassa, Fuengirolassa ja koko Costa del Solilla. Opastamme kansainvälisiä ostajia jokaisen vaiheen läpi unelmakiinteistönsä ostamisessa Espanjassa.',
    speakableSummary: 'Del Sol Prime Homes on luksuskiinteistötoimisto Espanjan Costa del Solilla. Autamme kansainvälisiä ostajia löytämään ja ostamaan kiinteistöjä Marbellasta, Esteponasta, Fuengirolasta, Benalmádenasta, Mijasista ja Sotograndesta. Tiimimme puhuu suomea, englantia, saksaa ja muita kieliä. Ota yhteyttä: +34 630 03 90 90.',
  },
  no: {
    title: 'Del Sol Prime Homes | Luksus Costa del Sol Eiendommer',
    description: 'Premium eiendomsmeglerbyrå spesialisert på Costa del Sol eiendommer. Ekspertveiledning for kjøp av luksusvillaer, leiligheter og investeringseiendommer i Marbella, Estepona og mer.',
    ogLocale: 'nb_NO',
    heroHeadline: 'Finn Ditt Drømmehjem på',
    heroHighlight: 'Costa del Sol',
    heroDescription: 'Premium eiendomsmeglerbyrå med 35+ års ekspertise i Marbella, Estepona, Fuengirola og hele Costa del Sol. Vi veileder internasjonale kjøpere gjennom hvert steg i kjøpet av drømmeeiendommen sin i Spania.',
    speakableSummary: 'Del Sol Prime Homes er et luksuriøst eiendomsmeglerbyrå på Spanias Costa del Sol. Vi hjelper internasjonale kjøpere med å finne og kjøpe eiendommer i Marbella, Estepona, Fuengirola, Benalmádena, Mijas og Sotogrande. Vårt team snakker norsk, engelsk, tysk og mer. Kontakt oss på +34 630 03 90 90.',
  },
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

function sanitizeForHTML(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate comprehensive JSON-LD structured data
function generateStructuredData(language: Language) {
  const meta = HOMEPAGE_META[language];
  const canonicalUrl = language === 'en' ? BASE_URL : `${BASE_URL}/${language}`;
  
  const organizationSchema = {
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
    "description": meta.description,
    "foundingDate": "2010",
    "slogan": "Your Trusted Partners in Costa del Sol Real Estate",
    "telephone": "+34 630 03 90 90",
    "email": "info@delsolprimehomes.com",
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
      { "@type": "City", "name": "Málaga" }
    ],
    "founders": [
      { "@type": "Person", "name": "Hans Beeckman" },
      { "@type": "Person", "name": "Cédric Van Hecke" },
      { "@type": "Person", "name": "Steven Roberts" }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["en", "de", "nl", "fr", "pl", "fi", "sv", "da", "no", "hu"],
      "telephone": "+34 630 03 90 90",
      "email": "info@delsolprimehomes.com"
    },
    "priceRange": "$$$"
  };

  const webSiteSchema = {
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    "url": BASE_URL,
    "name": "Del Sol Prime Homes",
    "description": "Luxury Costa del Sol Real Estate",
    "publisher": { "@id": `${BASE_URL}/#organization` },
    "inLanguage": language,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/${language}/properties?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const webPageSchema = {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "name": meta.title,
    "description": meta.description,
    "isPartOf": { "@id": `${BASE_URL}/#website` },
    "about": { "@id": `${BASE_URL}/#organization` },
    "inLanguage": language,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-summary", "h1", ".hero-description"]
    }
  };

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": canonicalUrl }
    ]
  };

  const localBusinessSchema = {
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/#localbusiness`,
    "name": "Del Sol Prime Homes",
    "priceRange": "€€€",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
      "addressLocality": "Fuengirola",
      "addressRegion": "Málaga",
      "postalCode": "29640",
      "addressCountry": "ES"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 36.5441,
      "longitude": -4.6261
    },
    "url": BASE_URL,
    "telephone": "+34 630 03 90 90",
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

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      webSiteSchema,
      webPageSchema,
      breadcrumbSchema,
      localBusinessSchema
    ]
  };
}

// Critical CSS for immediate rendering
const CRITICAL_CSS = `
  :root {
    --prime-gold: 43 74% 49%;
    --prime-50: 45 75% 96%;
    --prime-100: 44 74% 90%;
    --prime-900: 220 20% 12%;
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
  
  .static-homepage {
    min-height: 100vh;
  }
  
  .static-header {
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    border-bottom: 1px solid hsl(var(--prime-gold) / 0.2);
  }
  
  .static-header img {
    height: 48px;
  }
  
  .static-hero {
    background: linear-gradient(135deg, hsl(var(--prime-900)), hsl(var(--prime-950)));
    color: white;
    padding: 5rem 2rem;
    text-align: center;
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .static-hero h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1.5rem;
    max-width: 900px;
  }
  
  .hero-highlight {
    color: hsl(var(--prime-gold));
  }
  
  .hero-description {
    font-size: 1.25rem;
    max-width: 700px;
    margin-bottom: 2.5rem;
    opacity: 0.9;
    line-height: 1.6;
  }
  
  .speakable-summary {
    background: hsl(var(--prime-gold) / 0.15);
    border: 1px solid hsl(var(--prime-gold) / 0.3);
    border-radius: 0.75rem;
    padding: 1.5rem 2rem;
    max-width: 800px;
    margin: 2rem auto;
    text-align: left;
  }
  
  .speakable-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: hsl(var(--prime-gold));
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  .static-section {
    padding: 4rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .static-section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .areas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }
  
  .area-card {
    background: white;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }
  
  .area-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
  
  .area-card-content {
    padding: 1.5rem;
  }
  
  .area-card h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .area-card p {
    color: hsl(var(--muted-foreground));
    line-height: 1.6;
  }
  
  .usp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }
  
  .usp-item {
    text-align: center;
    padding: 2rem;
    background: hsl(var(--prime-50));
    border-radius: 1rem;
  }
  
  .usp-item h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: hsl(var(--prime-900));
  }
  
  .usp-item p {
    color: hsl(var(--muted-foreground));
    font-size: 0.95rem;
  }
  
  .static-footer {
    background: hsl(var(--prime-950));
    color: white;
    padding: 3rem 2rem;
    text-align: center;
  }
  
  .static-footer p {
    opacity: 0.8;
    margin-bottom: 1rem;
  }
  
  .static-footer a {
    color: hsl(var(--prime-gold));
    text-decoration: none;
  }
  
  @media (max-width: 768px) {
    .static-hero { padding: 3rem 1rem; }
    .static-section { padding: 3rem 1rem; }
    .static-header { padding: 1rem; }
  }
`;

// Generate hreflang tags for all 10 languages + x-default
function generateHreflangTags(): string {
  const tags: string[] = [];
  
  for (const lang of LANGUAGES) {
    const url = lang === 'en' ? BASE_URL : `${BASE_URL}/${lang}`;
    tags.push(`<link rel="alternate" hreflang="${lang}" href="${url}" />`);
  }
  
  // x-default points to English (root URL)
  tags.push(`<link rel="alternate" hreflang="x-default" href="${BASE_URL}" />`);
  
  return tags.join('\n    ');
}

function generateStaticHTML(productionAssets: ProductionAssets, language: Language): string {
  const meta = HOMEPAGE_META[language];
  const structuredData = generateStructuredData(language);
  const schemaScript = `<script type="application/ld+json" data-schema="homepage-graph">${JSON.stringify(structuredData, null, 2)}</script>`;

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  const hreflangTags = generateHreflangTags();
  
  // Canonical URL: English uses root, others use /{lang}
  const canonicalUrl = language === 'en' ? BASE_URL : `${BASE_URL}/${language}`;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#d4a574" />
  
  <!-- Primary Meta Tags -->
  <title>${sanitizeForHTML(meta.title)}</title>
  <meta name="title" content="${sanitizeForHTML(meta.title)}" />
  <meta name="description" content="${sanitizeForHTML(meta.description)}" />
  <meta name="keywords" content="Costa del Sol real estate, Marbella properties, Estepona villas, Spanish property investment, luxury homes Spain" />
  <meta name="author" content="Del Sol Prime Homes" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}" />
  
  <!-- Hreflang Tags (10 languages + x-default) -->
    ${hreflangTags}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${sanitizeForHTML(meta.title)}" />
  <meta property="og:description" content="${sanitizeForHTML(meta.description)}" />
  <meta property="og:image" content="${BASE_URL}/assets/logo-new.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Del Sol Prime Homes - Costa del Sol Real Estate" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  <meta property="og:locale" content="${meta.ogLocale}" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${sanitizeForHTML(meta.title)}" />
  <meta name="twitter:description" content="${sanitizeForHTML(meta.description)}" />
  <meta name="twitter:image" content="${BASE_URL}/assets/logo-new.png" />
  <meta name="twitter:image:alt" content="Del Sol Prime Homes - Costa del Sol Real Estate" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@400;700&family=Raleway:wght@400;500;600;700&display=swap" as="style">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@400;700&family=Raleway:wght@400;500;600;700&display=swap">
  
  <!-- Critical CSS -->
  <style>${CRITICAL_CSS}</style>
  
  <!-- Production Assets -->
  ${cssLinks}
  
  <!-- JSON-LD Structured Data -->
  ${schemaScript}
</head>
<body>
  <div id="root">
    <!-- Static content for SEO - will be replaced by React hydration -->
    <div class="static-homepage">
      
      <!-- Header -->
      <header class="static-header">
        <img src="/assets/logo-new.png" alt="Del Sol Prime Homes" />
        <nav>
          <a href="/${language}/properties" style="margin-right: 1.5rem; color: hsl(43 74% 49%); text-decoration: none; font-weight: 500;">Properties</a>
          <a href="/about" style="margin-right: 1.5rem; color: inherit; text-decoration: none;">About</a>
          <a href="/buyers-guide" style="margin-right: 1.5rem; color: inherit; text-decoration: none;">Buyers Guide</a>
          <a href="/${language}/blog" style="color: inherit; text-decoration: none;">Blog</a>
        </nav>
      </header>
      
      <!-- Hero Section with H1 -->
      <section class="static-hero">
        <h1>${sanitizeForHTML(meta.heroHeadline)} <span class="hero-highlight">${sanitizeForHTML(meta.heroHighlight)}</span></h1>
        <p class="hero-description">
          ${sanitizeForHTML(meta.heroDescription)}
        </p>
        
        <!-- Speakable Summary for Voice Assistants -->
        <div class="speakable-summary">
          <div class="speakable-label">Quick Answer</div>
          <p>
            ${sanitizeForHTML(meta.speakableSummary)}
          </p>
        </div>
      </section>
      
      <!-- Featured Areas Section -->
      <section class="static-section">
        <h2>Prime Locations on the Costa del Sol</h2>
        <div class="areas-grid">
          <article class="area-card">
            <div class="area-card-content">
              <h3>Marbella</h3>
              <p>The jewel of the Costa del Sol, famous for its Golden Mile, Puerto Banús, and year-round international community.</p>
            </div>
          </article>
          <article class="area-card">
            <div class="area-card-content">
              <h3>Estepona</h3>
              <p>The Garden of the Costa del Sol — charming Andalusian atmosphere with growing modern infrastructure and excellent value.</p>
            </div>
          </article>
          <article class="area-card">
            <div class="area-card-content">
              <h3>Sotogrande</h3>
              <p>Privacy and prestige. World-class polo, golf, and marina lifestyle in an exclusive residential community.</p>
            </div>
          </article>
          <article class="area-card">
            <div class="area-card-content">
              <h3>Málaga City</h3>
              <p>A vibrant cultural hub blending history with futuristic urban living. Excellent connectivity and amenities.</p>
            </div>
          </article>
        </div>
      </section>
      
      <!-- Why Choose Us Section -->
      <section class="static-section" style="background: hsl(45 75% 96%); max-width: none; padding: 4rem 2rem;">
        <div style="max-width: 1200px; margin: 0 auto;">
          <h2>Why Choose Del Sol Prime Homes?</h2>
          <div class="usp-grid">
            <div class="usp-item">
              <h3>15+ Years Experience</h3>
              <p>Deep local knowledge and established relationships with developers, lawyers, and notaries.</p>
            </div>
            <div class="usp-item">
              <h3>Multilingual Team</h3>
              <p>Native speakers of English, Dutch, French, German, and Spanish to guide you in your language.</p>
            </div>
            <div class="usp-item">
              <h3>Full-Service Support</h3>
              <p>From property search to key handover: NIE, banking, legal, and after-sales support included.</p>
            </div>
            <div class="usp-item">
              <h3>500+ Properties Sold</h3>
              <p>Proven track record with international buyers from across Europe and beyond.</p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Services Overview -->
      <section class="static-section">
        <h2>Our Services</h2>
        <div class="usp-grid">
          <div class="usp-item">
            <h3>Property Search</h3>
            <p>Access to exclusive listings, new developments, and off-market opportunities across the Costa del Sol.</p>
          </div>
          <div class="usp-item">
            <h3>Legal & Financial</h3>
            <p>Coordination with lawyers, NIE applications, mortgage arrangements, and Golden Visa guidance.</p>
          </div>
          <div class="usp-item">
            <h3>Viewing Tours</h3>
            <p>Personalized property tours with airport pickup, area orientation, and restaurant recommendations.</p>
          </div>
          <div class="usp-item">
            <h3>After-Sales</h3>
            <p>Property management, rental setup, renovation coordination, and ongoing support after purchase.</p>
          </div>
        </div>
      </section>
      
      <!-- Footer -->
      <footer class="static-footer">
        <p><strong>Del Sol Prime Homes</strong></p>
        <p>ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA, 29640 Fuengirola, Málaga, Spain</p>
        <p>
          <a href="tel:+34613578416">+34 613 578 416</a> | 
          <a href="mailto:info@delsolprimehomes.com">info@delsolprimehomes.com</a>
        </p>
        <p style="margin-top: 1.5rem; font-size: 0.875rem;">© ${new Date().getFullYear()} Del Sol Prime Homes. All rights reserved.</p>
      </footer>
      
    </div>
  </div>
  
  <!-- React App Scripts for Hydration -->
  ${jsScripts}
</body>
</html>`;
}

export async function generateStaticHomePage(distDir: string) {
  console.log('🏠 Generating static homepages for all 10 languages...');
  console.log('   ⚠️  NOTE: NOT overwriting dist/index.html to keep it as clean React shell');
  
  try {
    const productionAssets = getProductionAssets(distDir);
    console.log(`   Found ${productionAssets.css.length} CSS and ${productionAssets.js.length} JS assets`);
    
    const results: { lang: string; path: string }[] = [];
    
    for (const language of LANGUAGES) {
      const html = generateStaticHTML(productionAssets, language);
      
      if (language === 'en') {
        // English: Write to home.html (NOT index.html!) + /en/index.html
        // CRITICAL: Do NOT overwrite dist/index.html - it must remain the clean React shell
        // Middleware will serve home.html for homepage requests
        const homePath = join(distDir, 'home.html');
        writeFileSync(homePath, html, 'utf-8');
        results.push({ lang: 'en (home.html)', path: homePath });
        
        const enDir = join(distDir, 'en');
        mkdirSync(enDir, { recursive: true });
        const enPath = join(enDir, 'index.html');
        writeFileSync(enPath, html, 'utf-8');
        results.push({ lang: 'en', path: enPath });
      } else {
        // Other languages: Write to /{lang}/index.html
        const langDir = join(distDir, language);
        mkdirSync(langDir, { recursive: true });
        const langPath = join(langDir, 'index.html');
        writeFileSync(langPath, html, 'utf-8');
        results.push({ lang: language, path: langPath });
      }
    }
    
    console.log(`   ✅ Generated ${results.length} static homepage files:`);
    console.log(`   ✅ dist/index.html preserved as clean React shell`);
    results.forEach(r => console.log(`      - ${r.lang}: ${r.path}`));
    
    return { success: true, results };
  } catch (error) {
    console.error('   ❌ Failed to generate static homepages:', error);
    return { success: false, error };
  }
}

// Run if executed directly (not when imported as module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const distDir = process.argv[2] || 'dist';
  generateStaticHomePage(distDir);
}
