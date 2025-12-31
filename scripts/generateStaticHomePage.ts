import 'dotenv/config';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Static Homepage Generator for SSG
 * 
 * This script generates a static index.html with fully rendered content
 * for search engine and AI bot crawlers. The page includes:
 * - Full H1 and body text visible without JavaScript
 * - Complete JSON-LD structured data
 * - All meta tags and Open Graph data
 * - Critical CSS for immediate rendering
 */

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

function sanitizeForHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate comprehensive JSON-LD structured data
function generateStructuredData() {
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
    "description": "Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties in Marbella, Estepona, and more.",
    "foundingDate": "2010",
    "slogan": "Your Trusted Partners in Costa del Sol Real Estate",
    "telephone": "+34 613 578 416",
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
      "telephone": "+34 613 578 416",
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
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/en/properties?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const webPageSchema = {
    "@type": "WebPage",
    "@id": `${BASE_URL}/#webpage`,
    "url": BASE_URL,
    "name": "Del Sol Prime Homes | Luxury Costa del Sol Real Estate",
    "description": "Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties in Marbella, Estepona, and more.",
    "isPartOf": { "@id": `${BASE_URL}/#website` },
    "about": { "@id": `${BASE_URL}/#organization` },
    "inLanguage": "en",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-summary", "h1", ".hero-description"]
    }
  };

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}/#breadcrumb`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL }
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
    "telephone": "+34 613 578 416",
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

function generateStaticHTML(productionAssets: ProductionAssets): string {
  const structuredData = generateStructuredData();
  const schemaScript = `<script type="application/ld+json" data-schema="homepage-graph">${JSON.stringify(structuredData, null, 2)}</script>`;

  const cssLinks = productionAssets.css.map(href => 
    `<link rel="stylesheet" href="${href}" />`
  ).join('\n  ');
  
  const jsScripts = productionAssets.js.map(src => 
    `<script type="module" src="${src}"></script>`
  ).join('\n  ');

  // Hreflang tags for all supported languages
  const hreflangTags = `
    <link rel="alternate" hreflang="en" href="${BASE_URL}" />
    <link rel="alternate" hreflang="de" href="${BASE_URL}/de" />
    <link rel="alternate" hreflang="nl" href="${BASE_URL}/nl" />
    <link rel="alternate" hreflang="fr" href="${BASE_URL}/fr" />
    <link rel="alternate" hreflang="pl" href="${BASE_URL}/pl" />
    <link rel="alternate" hreflang="sv" href="${BASE_URL}/sv" />
    <link rel="alternate" hreflang="da" href="${BASE_URL}/da" />
    <link rel="alternate" hreflang="hu" href="${BASE_URL}/hu" />
    <link rel="alternate" hreflang="fi" href="${BASE_URL}/fi" />
    <link rel="alternate" hreflang="no" href="${BASE_URL}/no" />
    <link rel="alternate" hreflang="x-default" href="${BASE_URL}" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#d4a574" />
  
  <!-- Primary Meta Tags -->
  <title>Del Sol Prime Homes | Luxury Costa del Sol Real Estate</title>
  <meta name="title" content="Del Sol Prime Homes | Luxury Costa del Sol Real Estate" />
  <meta name="description" content="Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties in Marbella, Estepona, and more." />
  <meta name="keywords" content="Costa del Sol real estate, Marbella properties, Estepona villas, Spanish property investment, luxury homes Spain" />
  <meta name="author" content="Del Sol Prime Homes" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${BASE_URL}" />
  
  <!-- Hreflang Tags -->
  ${hreflangTags}
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}" />
  <meta property="og:title" content="Del Sol Prime Homes | Luxury Costa del Sol Real Estate" />
  <meta property="og:description" content="Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties." />
  <meta property="og:image" content="${BASE_URL}/assets/logo-new.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Del Sol Prime Homes - Costa del Sol Real Estate" />
  <meta property="og:site_name" content="Del Sol Prime Homes" />
  <meta property="og:locale" content="en_GB" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${BASE_URL}" />
  <meta name="twitter:title" content="Del Sol Prime Homes | Luxury Costa del Sol Real Estate" />
  <meta name="twitter:description" content="Premium real estate agency specializing in Costa del Sol properties." />
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
          <a href="/en/properties" style="margin-right: 1.5rem; color: hsl(43 74% 49%); text-decoration: none; font-weight: 500;">Properties</a>
          <a href="/about" style="margin-right: 1.5rem; color: inherit; text-decoration: none;">About</a>
          <a href="/buyers-guide" style="margin-right: 1.5rem; color: inherit; text-decoration: none;">Buyers Guide</a>
          <a href="/en/blog" style="color: inherit; text-decoration: none;">Blog</a>
        </nav>
      </header>
      
      <!-- Hero Section with H1 -->
      <section class="static-hero">
        <h1>Find Your Perfect Home on the <span class="hero-highlight">Costa del Sol</span></h1>
        <p class="hero-description">
          Premium real estate agency with 15+ years of expertise in Marbella, Estepona, Fuengirola, and the entire Costa del Sol. 
          We guide international buyers through every step of purchasing their dream property in Spain.
        </p>
        
        <!-- Speakable Summary for Voice Assistants -->
        <div class="speakable-summary">
          <div class="speakable-label">Quick Answer</div>
          <p>
            Del Sol Prime Homes is a luxury real estate agency on Spain's Costa del Sol. We help international buyers 
            find and purchase properties in Marbella, Estepona, Fuengirola, Benalmádena, Mijas, and Sotogrande. 
            Our expert team speaks English, Dutch, French, German, and more. Contact us at +34 613 578 416.
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
              <p>The jewel of the Costa del Sol. Luxury living, golden miles, and exclusive amenities for discerning buyers.</p>
            </div>
          </article>
          <article class="area-card">
            <div class="area-card-content">
              <h3>Estepona</h3>
              <p>The Garden of the Costa del Sol. Traditional charm meets modern luxury developments and beachfront living.</p>
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
  console.log('🏠 Generating static homepage...');
  
  try {
    const productionAssets = getProductionAssets(distDir);
    console.log(`   Found ${productionAssets.css.length} CSS and ${productionAssets.js.length} JS assets`);
    
    const html = generateStaticHTML(productionAssets);
    
    // Write the static index.html to dist root
    const outputPath = join(distDir, 'index.html');
    writeFileSync(outputPath, html, 'utf-8');
    
    console.log(`   ✅ Generated static homepage: ${outputPath}`);
    console.log(`   📄 File size: ${Math.round(html.length / 1024)}KB`);
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('   ❌ Failed to generate static homepage:', error);
    return { success: false, error };
  }
}

// Run if executed directly
const distDir = process.argv[2] || 'dist';
generateStaticHomePage(distDir);
