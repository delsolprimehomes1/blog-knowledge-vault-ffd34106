/**
 * Cloudflare Pages Middleware for SEO Metadata Injection
 * ========================================================
 * 
 * This middleware intercepts requests for content pages and injects
 * correct SEO metadata by calling the Supabase edge function.
 * 
 * For Cloudflare Pages projects, place this file in: functions/_middleware.js
 * It will automatically run for all requests.
 * 
 * Supported content types:
 * - Q&A pages: /{lang}/qa/{slug}
 * - Blog articles: /{lang}/blog/{slug}
 * - Comparison pages: /{lang}/compare/{slug}
 * - Location pages: /{lang}/locations/{slug}
 */

// Configuration
const CONFIG = {
  EDGE_FUNCTION_URL: 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/serve-seo-page',
  SUPPORTED_LANGUAGES: ['en', 'es', 'de', 'fr', 'nl', 'sv', 'no', 'da', 'fi', 'pl', 'ru', 'it', 'tr', 'hu'],
  CONTENT_TYPES: ['qa', 'blog', 'compare', 'locations'],
  CACHE_TTL: 3600, // 1 hour
  DEBUG: true  // Enabled for testing - set to false in production
};

// Static files that should be served directly with correct content types
const STATIC_FILES = {
  '/ai-sitemap.xml': 'application/xml; charset=utf-8',
  '/robots.txt': 'text/plain; charset=utf-8',
  '/llm.txt': 'text/plain; charset=utf-8',
  '/ai.txt': 'text/plain; charset=utf-8',
  '/facts.json': 'application/json; charset=utf-8',
  '/glossary.json': 'application/json; charset=utf-8',
  '/pages.json': 'application/json; charset=utf-8'
};

// Supabase Storage URL for sitemaps (served fresh, bypasses Cloudflare cache)
const SUPABASE_STORAGE_URL = 'https://kazggnufaoicopvmwhdl.supabase.co/storage/v1/object/public/sitemaps';

/**
 * Normalize a slug by removing hidden characters, URL-encoded garbage, 
 * and accidentally appended domains from copy-paste errors.
 */
function normalizeSlug(rawSlug) {
  if (!rawSlug) return '';
  
  let clean = decodeURIComponent(rawSlug);
  // Remove newlines, carriage returns, tabs, null bytes
  clean = clean.replace(/[\r\n\t\x00]/g, '');
  // Remove accidentally appended domain (common copy-paste error)
  clean = clean.replace(/delsolprimehomes\.com.*$/i, '');
  // Trim whitespace
  clean = clean.trim();
  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '');
  
  return clean;
}

/**
 * Check if the path matches an SEO-relevant content page
 */
function matchSEOPath(path) {
  // Pattern: /{lang}/{type}/{slug} or /{lang}/locations/{citySlug}/{topicSlug}
  
  // First check for location pages with compound slug (city/topic)
  const locationMatch = path.match(/^\/([a-z]{2})\/locations\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (locationMatch) {
    const [, lang, citySlug, topicSlug] = locationMatch;
    if (CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
      // Combine into compound slug for edge function
      const rawSlug = `${citySlug}/${topicSlug}`;
      const slug = rawSlug; // Already normalized format
      return { lang, type: 'locations', slug, rawSlug, needsRedirect: false };
    }
  }
  
  // Standard pattern: /{lang}/{type}/{slug}
  const match = path.match(/^\/([a-z]{2})\/(qa|blog|compare|locations)\/(.+)$/);
  
  if (!match) return null;
  
  const [, lang, type, rawSlug] = match;
  
  // Validate language
  if (!CONFIG.SUPPORTED_LANGUAGES.includes(lang)) return null;
  
  // Normalize the slug to handle malformed URLs
  const slug = normalizeSlug(rawSlug);
  
  // If slug was normalized, mark for redirect
  const needsRedirect = slug !== rawSlug;
  
  return { lang, type, slug, rawSlug, needsRedirect };
}

// Supabase config for database lookups
const SUPABASE_URL = 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';
const BASE_URL = 'https://www.delsolprimehomes.com';

// Known patterns for dead URLs that should return 410 (add patterns from GSC export)
const GONE_PATTERNS = [
  /^\/[a-z]{2}\/uncategorized\//,      // Old uncategorized pages
  /^\/[a-z]{2}\/draft-/,                // Draft pages leaked
  /^\/[a-z]{2}\/preview-/,              // Preview pages
  /^\/uncategorized\//,                 // Old uncategorized (no lang prefix)
  /^\/draft-/,                          // Draft pages (no lang prefix)
  /^\/preview-/,                        // Preview pages (no lang prefix)
];

/**
 * Helper function to lookup article language from database
 * Returns null if article not found (for 404 handling)
 */
async function lookupArticleLanguage(table, slug) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=language`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
    );
    const data = await response.json();
    // Return null if not found - caller handles 404
    return data?.[0]?.language || null;
  } catch (e) {
    console.error('[Middleware] Error looking up article language:', e);
    return null; // Return null on error - caller handles 404
  }
}

/**
 * Log 410 hit to database for monitoring
 */
async function logGoneHit(urlPath, userAgent) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gone_url_hits`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        url_path: urlPath,
        user_agent: userAgent?.substring(0, 500) || null
      })
    });
  } catch (e) {
    // Non-blocking - don't fail the request if logging fails
    console.error('[Middleware] Error logging gone hit:', e);
  }
}

/**
 * Main middleware handler
 */
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const userAgent = request.headers.get('user-agent') || '';
  
  // ============================================================
  // PRIORITY -2: Handle 410 Gone URLs (permanently removed pages)
  // ============================================================
  
  // Check pattern-based gone URLs first (fast)
  const matchesGonePattern = GONE_PATTERNS.some(p => p.test(path));
  if (matchesGonePattern) {
    console.log(`[Middleware] 410 Gone (pattern match): ${path}`);
    logGoneHit(path, userAgent); // Non-blocking
    return new Response('410 Gone - This page has been permanently removed', {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=2592000', // 30 days
        'X-Robots-Tag': 'noindex',
        'X-Middleware-Active': 'true',
        'X-Gone-Reason': 'pattern-match'
      }
    });
  }
  
  // Check database for specific gone URLs (slower, but precise)
  try {
    const goneResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/gone_urls?url_path=eq.${encodeURIComponent(path)}&select=url_path,reason`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
    );
    const goneUrls = await goneResponse.json();
    if (goneUrls && goneUrls.length > 0) {
      console.log(`[Middleware] 410 Gone (database match): ${path}`);
      logGoneHit(path, userAgent); // Non-blocking
      return new Response('410 Gone - This page has been permanently removed', {
        status: 410,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=2592000', // 30 days
          'X-Robots-Tag': 'noindex',
          'X-Middleware-Active': 'true',
          'X-Gone-Reason': goneUrls[0].reason || 'database-match'
        }
      });
    }
  } catch (e) {
    console.error('[Middleware] Error checking gone_urls:', e);
  }
  
  // ============================================================
  // PRIORITY -1.5: Handle legacy URLs with 301 redirects (server-side)
  // This fixes "Alternate page with proper canonical" in GSC
  // ============================================================
  
  // Legacy blog: /blog/:slug → /{lang}/blog/:slug OR 404 if not found
  const legacyBlogMatch = path.match(/^\/blog\/([a-z0-9][a-z0-9-]*[a-z0-9])\/?$/);
  if (legacyBlogMatch) {
    const [, slug] = legacyBlogMatch;
    const articleLang = await lookupArticleLanguage('blog_articles', slug);
    
    // If slug doesn't exist, return 404 instead of redirecting to /en/
    if (!articleLang) {
      console.log(`[Middleware] 404 - Legacy blog slug not found: ${slug}`);
      return new Response('404 Not Found - This article does not exist', {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-Middleware-Active': 'true',
          'X-404-Reason': 'slug-not-found'
        }
      });
    }
    
    console.log(`[Middleware] 301 redirect: /blog/${slug} → /${articleLang}/blog/${slug}`);
    return Response.redirect(`${BASE_URL}/${articleLang}/blog/${slug}`, 301);
  }
  
  // Legacy Q&A: /qa/:slug → /{lang}/qa/:slug OR 404 if not found
  const legacyQaMatch = path.match(/^\/qa\/([a-z0-9][a-z0-9-]*[a-z0-9])\/?$/);
  if (legacyQaMatch) {
    const [, slug] = legacyQaMatch;
    const qaLang = await lookupArticleLanguage('qa_pages', slug);
    
    // If slug doesn't exist, return 404 instead of redirecting to /en/
    if (!qaLang) {
      console.log(`[Middleware] 404 - Legacy Q&A slug not found: ${slug}`);
      return new Response('404 Not Found - This Q&A page does not exist', {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-Middleware-Active': 'true',
          'X-404-Reason': 'slug-not-found'
        }
      });
    }
    
    console.log(`[Middleware] 301 redirect: /qa/${slug} → /${qaLang}/qa/${slug}`);
    return Response.redirect(`${BASE_URL}/${qaLang}/qa/${slug}`, 301);
  }
  
  // Legacy compare: /compare/:slug → /en/compare/:slug (default to English)
  const legacyCompareMatch = path.match(/^\/compare\/([a-z0-9][a-z0-9-]*[a-z0-9])\/?$/);
  if (legacyCompareMatch) {
    const [, slug] = legacyCompareMatch;
    console.log(`[Middleware] 301 redirect: /compare/${slug} → /en/compare/${slug}`);
    return Response.redirect(`${BASE_URL}/en/compare/${slug}`, 301);
  }
  
  // Legacy locations: /locations/:city → /en/locations/:city
  const legacyLocMatch = path.match(/^\/locations\/([a-z0-9-]+)\/?$/);
  if (legacyLocMatch) {
    const [, citySlug] = legacyLocMatch;
    console.log(`[Middleware] 301 redirect: /locations/${citySlug} → /en/locations/${citySlug}`);
    return Response.redirect(`${BASE_URL}/en/locations/${citySlug}`, 301);
  }
  
  // Legacy locations with topic: /locations/:city/:topic → /en/locations/:city/:topic
  const legacyLocTopicMatch = path.match(/^\/locations\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  if (legacyLocTopicMatch) {
    const [, citySlug, topicSlug] = legacyLocTopicMatch;
    console.log(`[Middleware] 301 redirect: /locations/${citySlug}/${topicSlug} → /en/locations/${citySlug}/${topicSlug}`);
    return Response.redirect(`${BASE_URL}/en/locations/${citySlug}/${topicSlug}`, 301);
  }
  
  // PRIORITY -1: Serve sitemaps from Supabase Storage (bypasses Cloudflare cache)
  // This ensures Google always gets fresh sitemap data
  if (path === '/sitemap.xml' || path === '/sitemap-index.xml' || path.startsWith('/sitemaps/')) {
    try {
      // Map path to storage file path
      const storagePath = path.startsWith('/') ? path.substring(1) : path;
      const storageUrl = `${SUPABASE_STORAGE_URL}/${storagePath}`;
      
      console.log(`[Middleware] Fetching sitemap from storage: ${storageUrl}`);
      
      const storageResponse = await fetch(storageUrl, {
        headers: {
          'Accept': 'application/xml, text/xml',
        }
      });
      
      if (storageResponse.ok) {
        const xmlContent = await storageResponse.text();
        return new Response(xmlContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
            'X-Sitemap-Source': 'supabase-storage',
            'X-Middleware-Active': 'true',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      } else {
        console.log(`[Middleware] Storage returned ${storageResponse.status}, falling back to static file`);
        // Fall back to static file if storage fails
      }
    } catch (error) {
      console.error(`[Middleware] Error fetching sitemap from storage:`, error);
      // Fall back to static file
    }
    return next();
  }
  
  // PRIORITY 0: Serve SSG homepage for root path
  // The static index.html contains fully rendered H1, body text, and JSON-LD for bots
  if (path === '/' || path === '') {
    try {
      const indexRequest = new Request(new URL('/index.html', request.url).toString(), {
        method: 'GET',
        headers: request.headers
      });
      const assetResponse = await env.ASSETS.fetch(indexRequest);
      
      if (assetResponse.ok) {
        const html = await assetResponse.text();
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Middleware-Active': 'true',
            'X-Middleware-Version': '2025-12-31',
            'X-SSG-Page': 'homepage',
            'X-Rendering-Method': 'SSG'
          }
        });
      }
    } catch (error) {
      console.error(`[Middleware] Error serving SSG homepage:`, error);
    }
    return next();
  }
  
  // PRIORITY 0.5: Handle About page - serve with SEO metadata
  const aboutPageMatch = path.match(/^\/([a-z]{2})\/about\/?$/);
  if (aboutPageMatch) {
    const [, aboutLang] = aboutPageMatch;
    
    if (CONFIG.SUPPORTED_LANGUAGES.includes(aboutLang)) {
      try {
        const indexRequest = new Request(new URL('/index.html', request.url).toString());
        const assetResponse = await env.ASSETS.fetch(indexRequest);
        
        if (assetResponse.ok) {
          let html = await assetResponse.text();
          
          const baseUrl = 'https://www.delsolprimehomes.com';
          const canonicalUrl = `${baseUrl}/${aboutLang}/about`;
          
          const ABOUT_PAGE_META = {
            en: { title: 'About Us | Del Sol Prime Homes', description: 'Meet the team behind Del Sol Prime Homes - licensed API agents with 15+ years experience in Costa del Sol real estate.' },
            de: { title: 'Über Uns | Del Sol Prime Homes', description: 'Lernen Sie das Team von Del Sol Prime Homes kennen - lizenzierte API-Makler mit über 15 Jahren Erfahrung.' },
            nl: { title: 'Over Ons | Del Sol Prime Homes', description: 'Maak kennis met het team van Del Sol Prime Homes - erkende API-makelaars met 15+ jaar ervaring.' },
            fr: { title: 'À Propos | Del Sol Prime Homes', description: 'Découvrez l\'équipe Del Sol Prime Homes - agents API agréés avec plus de 15 ans d\'expérience.' },
            pl: { title: 'O Nas | Del Sol Prime Homes', description: 'Poznaj zespół Del Sol Prime Homes - licencjonowani agenci API z ponad 15-letnim doświadczeniem.' },
            sv: { title: 'Om Oss | Del Sol Prime Homes', description: 'Möt teamet bakom Del Sol Prime Homes - licensierade API-mäklare med 15+ års erfarenhet.' },
            da: { title: 'Om Os | Del Sol Prime Homes', description: 'Mød holdet bag Del Sol Prime Homes - licenserede API-mæglere med 15+ års erfaring.' },
            hu: { title: 'Rólunk | Del Sol Prime Homes', description: 'Ismerje meg a Del Sol Prime Homes csapatát - engedéllyel rendelkező API ügynökök 15+ év tapasztalattal.' },
            fi: { title: 'Meistä | Del Sol Prime Homes', description: 'Tutustu Del Sol Prime Homes -tiimiin - lisensoituja API-välittäjiä yli 15 vuoden kokemuksella.' },
            no: { title: 'Om Oss | Del Sol Prime Homes', description: 'Møt teamet bak Del Sol Prime Homes - lisensierte API-meglere med 15+ års erfaring.' }
          };
          
          const meta = ABOUT_PAGE_META[aboutLang] || ABOUT_PAGE_META.en;
          
          const hreflangTags = CONFIG.SUPPORTED_LANGUAGES
            .filter(l => ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'].includes(l))
            .map(l => `    <link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/about" />`)
            .join('\n');
          
          const seoBlock = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${hreflangTags}
    <link rel="alternate" hreflang="x-default" href="${baseUrl}/en/about" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Del Sol Prime Homes" />
`;
          
          html = html.replace(/<title>.*?<\/title>/, '');
          html = html.replace('</head>', `${seoBlock}</head>`);
          html = html.replace(/<html[^>]*>/, `<html lang="${aboutLang}">`);
          
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
              'X-Middleware-Active': 'true',
              'X-Middleware-Version': '2025-12-31',
              'X-SEO-Source': 'about-page-injection',
              'X-Content-Language': aboutLang,
              'X-Page-Type': 'about'
            }
          });
        }
      } catch (error) {
        console.error(`[Middleware] Error processing about page ${path}:`, error);
      }
    }
  }
  
  // PRIORITY 0.6: Handle Buyers Guide page - serve with SEO metadata (11 hreflang tags)
  const buyersGuideMatch = path.match(/^\/([a-z]{2})\/buyers-guide\/?$/) || path === '/buyers-guide';
  if (buyersGuideMatch) {
    const lang = buyersGuideMatch[1] || 'en';
    
    if (CONFIG.SUPPORTED_LANGUAGES.includes(lang) || path === '/buyers-guide') {
      try {
        const indexRequest = new Request(new URL('/index.html', request.url).toString());
        const assetResponse = await env.ASSETS.fetch(indexRequest);
        
        if (assetResponse.ok) {
          let html = await assetResponse.text();
          
          const baseUrl = 'https://www.delsolprimehomes.com';
          const canonicalLang = path === '/buyers-guide' ? 'en' : lang;
          const canonicalUrl = `${baseUrl}/${canonicalLang}/buyers-guide`;
          
          const BUYERS_GUIDE_META = {
            en: { title: 'Complete Buyers Guide to Costa del Sol Property | Del Sol Prime Homes', description: 'Your comprehensive guide to buying property on the Costa del Sol. Step-by-step process, costs, legal requirements, Golden Visa information.' },
            de: { title: 'Vollständiger Immobilienkauf-Leitfaden Costa del Sol | Del Sol Prime Homes', description: 'Ihr umfassender Leitfaden zum Immobilienkauf an der Costa del Sol. Schritt-für-Schritt-Prozess, Kosten, rechtliche Anforderungen.' },
            nl: { title: 'Complete Koopgids voor Costa del Sol Vastgoed | Del Sol Prime Homes', description: 'Uw uitgebreide gids voor het kopen van onroerend goed aan de Costa del Sol. Stapsgewijs proces, kosten, juridische vereisten.' },
            fr: { title: 'Guide Complet d\'Achat Immobilier Costa del Sol | Del Sol Prime Homes', description: 'Votre guide complet pour acheter une propriété sur la Costa del Sol. Processus étape par étape, coûts, exigences légales.' },
            pl: { title: 'Kompletny Przewodnik Kupna Nieruchomości Costa del Sol | Del Sol Prime Homes', description: 'Twój kompleksowy przewodnik po zakupie nieruchomości na Costa del Sol. Proces krok po kroku, koszty, wymogi prawne.' },
            sv: { title: 'Komplett Köpguide för Costa del Sol Fastigheter | Del Sol Prime Homes', description: 'Din omfattande guide till att köpa fastighet på Costa del Sol. Steg-för-steg-process, kostnader, juridiska krav.' },
            da: { title: 'Komplet Købsguide til Costa del Sol Ejendomme | Del Sol Prime Homes', description: 'Din omfattende guide til at købe ejendom på Costa del Sol. Trin-for-trin proces, omkostninger, juridiske krav.' },
            hu: { title: 'Teljes Vásárlási Útmutató Costa del Sol Ingatlanokhoz | Del Sol Prime Homes', description: 'Átfogó útmutatója a Costa del Sol-i ingatlanvásárláshoz. Lépésről lépésre folyamat, költségek, jogi követelmények.' },
            fi: { title: 'Täydellinen Ostajan Opas Costa del Sol Kiinteistöihin | Del Sol Prime Homes', description: 'Kattava oppaasi kiinteistön ostamiseen Costa del Solilla. Vaiheittainen prosessi, kustannukset, lakisääteiset vaatimukset.' },
            no: { title: 'Komplett Kjøpsguide for Costa del Sol Eiendommer | Del Sol Prime Homes', description: 'Din omfattende guide til å kjøpe eiendom på Costa del Sol. Steg-for-steg prosess, kostnader, juridiske krav.' }
          };
          
          const meta = BUYERS_GUIDE_META[canonicalLang] || BUYERS_GUIDE_META.en;
          
          // 11 hreflang tags (10 languages + x-default)
          const hreflangTags = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no']
            .map(l => `    <link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/buyers-guide" />`)
            .join('\n');
          
          const seoBlock = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <link rel="canonical" href="${canonicalUrl}" />
${hreflangTags}
    <link rel="alternate" hreflang="x-default" href="${baseUrl}/en/buyers-guide" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Del Sol Prime Homes" />
    <meta property="og:image" content="${baseUrl}/assets/costa-del-sol-bg.jpg" />
`;
          
          html = html.replace(/<title>.*?<\/title>/, '');
          html = html.replace('</head>', `${seoBlock}</head>`);
          html = html.replace(/<html[^>]*>/, `<html lang="${canonicalLang}">`);
          
          // Redirect legacy /buyers-guide to /en/buyers-guide
          if (path === '/buyers-guide') {
            return Response.redirect(`${baseUrl}/en/buyers-guide`, 301);
          }
          
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
              'X-Middleware-Active': 'true',
              'X-Middleware-Version': '2026-01-03',
              'X-SEO-Source': 'buyers-guide-injection',
              'X-Content-Language': canonicalLang,
              'X-Page-Type': 'buyers-guide'
            }
          });
        }
      } catch (error) {
        console.error(`[Middleware] Error processing buyers guide page ${path}:`, error);
      }
    }
  }
  
  // PRIORITY 0.7: Handle City Brochure pages - serve with SEO metadata (11 hreflang tags)
  const brochureMatch = path.match(/^\/([a-z]{2})\/brochure\/([a-z0-9-]+)\/?$/);
  if (brochureMatch) {
    const [, lang, citySlug] = brochureMatch;
    
    if (CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
      try {
        const indexRequest = new Request(new URL('/index.html', request.url).toString());
        const assetResponse = await env.ASSETS.fetch(indexRequest);
        
        if (assetResponse.ok) {
          let html = await assetResponse.text();
          
          const baseUrl = 'https://www.delsolprimehomes.com';
          const canonicalUrl = `${baseUrl}/${lang}/brochure/${citySlug}`;
          
          // City name mapping for meta titles
          const CITY_NAMES = {
            'marbella': 'Marbella',
            'estepona': 'Estepona',
            'fuengirola': 'Fuengirola',
            'benalmadena': 'Benalmádena',
            'mijas': 'Mijas',
            'sotogrande': 'Sotogrande',
            'malaga-city': 'Málaga City',
            'casares': 'Casares',
            'manilva': 'Manilva',
            'torremolinos': 'Torremolinos'
          };
          
          const cityName = CITY_NAMES[citySlug] || citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          // Language-specific meta templates
          const BROCHURE_META = {
            en: { title: `Luxury Properties in ${cityName} | Del Sol Prime Homes`, description: `Discover exceptional luxury properties in ${cityName} on the Costa del Sol. Expert guidance from API-licensed agents.` },
            de: { title: `Luxusimmobilien in ${cityName} | Del Sol Prime Homes`, description: `Entdecken Sie außergewöhnliche Luxusimmobilien in ${cityName} an der Costa del Sol.` },
            nl: { title: `Luxe Vastgoed in ${cityName} | Del Sol Prime Homes`, description: `Ontdek uitzonderlijk luxe vastgoed in ${cityName} aan de Costa del Sol.` },
            fr: { title: `Propriétés de Luxe à ${cityName} | Del Sol Prime Homes`, description: `Découvrez des propriétés de luxe exceptionnelles à ${cityName} sur la Costa del Sol.` },
            pl: { title: `Luksusowe Nieruchomości w ${cityName} | Del Sol Prime Homes`, description: `Odkryj wyjątkowe luksusowe nieruchomości w ${cityName} na Costa del Sol.` },
            sv: { title: `Lyxfastigheter i ${cityName} | Del Sol Prime Homes`, description: `Upptäck exceptionella lyxfastigheter i ${cityName} på Costa del Sol.` },
            da: { title: `Luksusejendomme i ${cityName} | Del Sol Prime Homes`, description: `Opdag enestående luksusejendomme i ${cityName} på Costa del Sol.` },
            hu: { title: `Luxus Ingatlanok ${cityName} | Del Sol Prime Homes`, description: `Fedezze fel a kivételes luxus ingatlanokat ${cityName} városában a Costa del Solon.` },
            fi: { title: `Luksuskiinteistöt ${cityName} | Del Sol Prime Homes`, description: `Löydä poikkeuksellisia luksuskiinteistöjä ${cityName} Costa del Solilla.` },
            no: { title: `Luksuseiendommer i ${cityName} | Del Sol Prime Homes`, description: `Oppdag eksepsjonelle luksuseiendommer i ${cityName} på Costa del Sol.` }
          };
          
          const meta = BROCHURE_META[lang] || BROCHURE_META.en;
          
          // 11 hreflang tags (10 languages + x-default)
          const hreflangTags = CONFIG.SUPPORTED_LANGUAGES
            .map(l => `    <link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/brochure/${citySlug}" />`)
            .join('\n');
          
          // JSON-LD schema for brochure page
          const brochureSchema = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": `${canonicalUrl}#webpage`,
                "name": meta.title,
                "description": meta.description,
                "url": canonicalUrl,
                "inLanguage": lang === 'en' ? 'en-GB' : lang,
                "isPartOf": { "@id": `${baseUrl}/#website` },
                "speakable": {
                  "@type": "SpeakableSpecification",
                  "cssSelector": [".brochure-hero h1", ".brochure-hero p", ".brochure-description"]
                }
              },
              {
                "@type": "Place",
                "name": cityName,
                "description": `${cityName} - Premium real estate destination on Spain's Costa del Sol`,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": cityName,
                  "addressRegion": "Andalucía",
                  "addressCountry": "ES"
                }
              },
              {
                "@type": "RealEstateAgent",
                "name": "Del Sol Prime Homes",
                "url": baseUrl,
                "areaServed": { "@type": "Place", "name": cityName }
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
                  { "@type": "ListItem", "position": 2, "name": cityName, "item": canonicalUrl }
                ]
              }
            ]
          };
          
          const seoBlock = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
${hreflangTags}
    <link rel="alternate" hreflang="x-default" href="${baseUrl}/en/brochure/${citySlug}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Del Sol Prime Homes" />
    <meta property="og:locale" content="${lang === 'en' ? 'en_GB' : lang}" />
    <script type="application/ld+json">${JSON.stringify(brochureSchema)}</script>
`;
          
          html = html.replace(/<title>.*?<\/title>/, '');
          html = html.replace('</head>', `${seoBlock}</head>`);
          html = html.replace(/<html[^>]*>/, `<html lang="${lang}">`);
          
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
              'X-Middleware-Active': 'true',
              'X-Middleware-Version': '2026-01-03',
              'X-SEO-Source': 'brochure-injection',
              'X-Content-Language': lang,
              'X-Page-Type': 'city-brochure',
              'X-City-Slug': citySlug
            }
          });
        }
      } catch (error) {
        console.error(`[Middleware] Error processing brochure page ${path}:`, error);
      }
    }
  }
  
  // Legacy redirect: /brochure/{slug} → /en/brochure/{slug}
  const legacyBrochureMatch = path.match(/^\/brochure\/([a-z0-9-]+)\/?$/);
  if (legacyBrochureMatch) {
    const [, citySlug] = legacyBrochureMatch;
    const baseUrl = 'https://www.delsolprimehomes.com';
    return Response.redirect(`${baseUrl}/en/brochure/${citySlug}`, 301);
  }
  
  // PRIORITY 1: Serve SPA shell directly for admin, auth, and login routes
  // These are SPA routes that should always return index.html, never redirect or modify
  const isSPAOnlyRoute = 
    path === '/admin' || path.startsWith('/admin/') || 
    path === '/auth' || path.startsWith('/auth/') ||
    path === '/login' || path.startsWith('/login/');
  
  if (isSPAOnlyRoute) {
    try {
      // Explicitly fetch and serve index.html from Cloudflare Pages assets
      const indexRequest = new Request(new URL('/index.html', request.url).toString(), {
        method: 'GET',
        headers: request.headers
      });
      const assetResponse = await env.ASSETS.fetch(indexRequest);
      
      if (assetResponse.ok) {
        const html = await assetResponse.text();
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Middleware-SPA-Route': path,
            'X-Middleware-Active': 'true',
            'X-Middleware-Version': '2025-12-31'
          }
        });
      }
    } catch (error) {
      console.error(`[Middleware] Error serving SPA shell for ${path}:`, error);
    }
    // Fallback to next() if asset fetch fails
    return next();
  }
  
  // PRIORITY 1: Serve known static files directly with correct content types
  const staticContentType = STATIC_FILES[path];
  if (staticContentType) {
    try {
      // Use env.ASSETS.fetch to get the static file from Cloudflare Pages assets
      const assetResponse = await env.ASSETS.fetch(request);
      
      if (assetResponse.ok) {
        const body = await assetResponse.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': staticContentType,
            'Cache-Control': 'public, max-age=3600',
            'X-Served-By': 'middleware-static',
            'X-Content-Type-Override': staticContentType
          }
        });
      }
    } catch (error) {
      console.error(`[Middleware] Error serving static file ${path}:`, error);
    }
  }
  
  // PRIORITY 2: Serve XML files in /sitemaps/ directory
  if (path.startsWith('/sitemaps/') && path.endsWith('.xml')) {
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.ok) {
        const body = await assetResponse.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Served-By': 'middleware-sitemap'
          }
        });
      }
    } catch (error) {
      console.error(`[Middleware] Error serving sitemap ${path}:`, error);
    }
  }
  
  // Skip middleware processing for other static assets
  if (path.match(/\.(xml|txt|json|ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|map)$/)) {
    return next();
  }
  
  // PRIORITY 3: Handle index pages (/{lang}/{type}) with proper SEO meta injection
  const indexPageMatch = path.match(/^\/([a-z]{2})\/(blog|qa|compare|locations)\/?$/);
  if (indexPageMatch) {
    const [, lang, pageType] = indexPageMatch;
    
    if (CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
      try {
        // Fetch the SPA shell
        const indexRequest = new Request(new URL('/index.html', request.url).toString());
        const assetResponse = await env.ASSETS.fetch(indexRequest);
        
        if (assetResponse.ok) {
          let html = await assetResponse.text();
          
          // Generate SEO tags for index pages
          const baseUrl = 'https://www.delsolprimehomes.com';
          const canonicalUrl = `${baseUrl}/${lang}/${pageType}`;
          
          // Page-specific metadata
          const INDEX_PAGE_META = {
            blog: {
              title: 'Real Estate Blog | Del Sol Prime Homes',
              description: 'Expert articles about Costa del Sol real estate, property guides, market insights, and investment advice for buyers.'
            },
            qa: {
              title: 'Questions & Answers | Del Sol Prime Homes',
              description: 'Find answers to common questions about buying property in Costa del Sol, from mortgages to legal requirements.'
            },
            compare: {
              title: 'Property Comparisons | Del Sol Prime Homes',
              description: 'Compare locations, property types, and investment options in Costa del Sol to make informed decisions.'
            },
            locations: {
              title: 'Locations Guide | Del Sol Prime Homes',
              description: 'Explore prime locations across Costa del Sol - Marbella, Estepona, Fuengirola, and more for your perfect property.'
            }
          };
          
          const meta = INDEX_PAGE_META[pageType];
          
          // Build hreflang tags (hardcoded to ensure they always render)
          const hreflangTags = `
    <link rel="alternate" hreflang="en" href="${baseUrl}/en/${pageType}" />
    <link rel="alternate" hreflang="de" href="${baseUrl}/de/${pageType}" />
    <link rel="alternate" hreflang="nl" href="${baseUrl}/nl/${pageType}" />
    <link rel="alternate" hreflang="fr" href="${baseUrl}/fr/${pageType}" />
    <link rel="alternate" hreflang="pl" href="${baseUrl}/pl/${pageType}" />
    <link rel="alternate" hreflang="sv" href="${baseUrl}/sv/${pageType}" />
    <link rel="alternate" hreflang="da" href="${baseUrl}/da/${pageType}" />
    <link rel="alternate" hreflang="hu" href="${baseUrl}/hu/${pageType}" />
    <link rel="alternate" hreflang="fi" href="${baseUrl}/fi/${pageType}" />
    <link rel="alternate" hreflang="no" href="${baseUrl}/no/${pageType}" />
    <link rel="alternate" hreflang="x-default" href="${baseUrl}/en/${pageType}" />`;
          
          // Build the complete SEO block to inject
          const seoBlock = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${hreflangTags}
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Del Sol Prime Homes" />
`;
          
          // Remove the default title and inject SEO block before </head>
          html = html.replace(/<title>.*?<\/title>/, '');
          html = html.replace('</head>', `${seoBlock}</head>`);
          
          // Update <html lang="...">
          html = html.replace(/<html[^>]*>/, `<html lang="${lang}">`);
          
          if (CONFIG.DEBUG) {
            console.log(`[Middleware] Index page SEO injection for: ${path}`);
          }
          
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
              'X-Middleware-Active': 'true',
              'X-Middleware-Version': '2025-12-26',
              'X-SEO-Source': 'index-page-injection',
              'X-Content-Language': lang,
              'X-Page-Type': pageType
            }
          });
        }
      } catch (error) {
        console.error(`[Middleware] Error processing index page ${path}:`, error);
      }
    }
  }
  
  // Check if this is an SEO-relevant path with slug
  const seoMatch = matchSEOPath(path);
  
  if (!seoMatch) {
    // Not an SEO path - still add middleware header to prove it's running
    const response = await next();
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Middleware-Active', 'true');
    newResponse.headers.set('X-Middleware-Version', '2025-12-26');
    return newResponse;
  }
  
  const { lang, type, slug, rawSlug, needsRedirect } = seoMatch;
  
  // If slug was normalized (cleaned up from malformed URL), 301 redirect to clean URL
  if (needsRedirect) {
    const cleanUrl = `${url.origin}/${lang}/${type}/${slug}`;
    console.log(`[SEO Middleware] Redirecting malformed URL: "${rawSlug}" → "${slug}"`);
    return Response.redirect(cleanUrl, 301);
  }
  
  if (CONFIG.DEBUG) {
    console.log(`[SEO Middleware] Processing: ${path} (lang=${lang}, type=${type})`);
  }
  
  try {
    // Build edge function URL
    const edgeFunctionUrl = `${CONFIG.EDGE_FUNCTION_URL}?path=${encodeURIComponent(path)}&html=true`;
    
    // Call the edge function
    const seoResponse = await fetch(edgeFunctionUrl, {
      headers: {
        'Accept': 'text/html,application/json',
        'User-Agent': 'Cloudflare-Pages-Middleware/1.0'
      }
    });
    
    // Handle non-OK responses (404, etc.)
    if (!seoResponse.ok) {
      console.error(`[SEO Middleware] Edge function returned ${seoResponse.status}`);
      
      // Check if it's a redirect response (language mismatch)
      const responseBody = await seoResponse.text();
      try {
        const errorData = JSON.parse(responseBody);
        
        // If we have a redirect URL (language mismatch), do 301 redirect
        if (errorData.redirectTo) {
          console.log(`[SEO Middleware] Language mismatch redirect: ${path} → ${errorData.redirectTo}`);
          return Response.redirect(errorData.redirectTo, 301);
        }
      } catch (parseError) {
        // Not JSON, continue to 404 handling
      }
      
      // Return a proper 404 page with noindex
      console.log(`[SEO Middleware] Returning 404 for: ${path}`);
      const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Page Not Found | Del Sol Prime Homes</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #333; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 2rem; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Page Not Found</h1>
    <p>The page you're looking for doesn't exist or has been moved.</p>
    <a href="/">Return to Homepage</a>
  </div>
</body>
</html>`;
      
      return new Response(notFoundHtml, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Middleware-Active': 'true',
          'X-Middleware-Version': '2026-01-03',
          'X-SEO-Matched-Path': path,
          'X-Robots-Tag': 'noindex, nofollow'
        }
      });
    }
    
    const contentType = seoResponse.headers.get('content-type') || '';
    
    // Get the response body first to check its content
    const responseBody = await seoResponse.text();
    const trimmedBody = responseBody.trim();
    
    // Check if it's HTML based on content (not just Content-Type header)
    // Supabase Edge Functions may return HTML with text/plain content-type
    const isHtmlContent = trimmedBody.startsWith('<!DOCTYPE html>') || 
                          trimmedBody.startsWith('<!doctype html>') ||
                          trimmedBody.startsWith('<html');
    
    if (CONFIG.DEBUG) {
      console.log(`[SEO Middleware] Edge function content-type: ${contentType}`);
      console.log(`[SEO Middleware] Response body starts with: ${trimmedBody.substring(0, 50)}...`);
      console.log(`[SEO Middleware] Detected as HTML: ${isHtmlContent}`);
    }
    
    // If response contains HTML content, extract SEO tags and inject into real index.html
    if (isHtmlContent) {
      console.log(`[SEO Middleware] Extracting SEO from edge function HTML (${responseBody.length} bytes)`);
      
      try {
        // Get the real index.html (contains React app)
        const indexRequest = new Request(new URL('/index.html', request.url).toString());
        const assetResponse = await env.ASSETS.fetch(indexRequest);
        
        if (assetResponse.ok) {
          let indexHtml = await assetResponse.text();
          
          // Extract <head> content from edge function HTML
          const headMatch = responseBody.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
          const seoHead = headMatch ? headMatch[1] : '';
          
          // Extract language attribute from edge function HTML
          const langMatch = responseBody.match(/<html[^>]*lang="([^"]+)"/i);
          const langAttr = langMatch ? langMatch[1] : lang;
          
          // Update html lang attribute in real index.html
          indexHtml = indexHtml.replace(/<html[^>]*>/, `<html lang="${langAttr}">`);
          
          // Remove default title from index.html (will be replaced by SEO title)
          indexHtml = indexHtml.replace(/<title>.*?<\/title>/, '');
          
          // Remove any existing meta description
          indexHtml = indexHtml.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
          
          // Inject SEO head content before </head>
          indexHtml = indexHtml.replace('</head>', `${seoHead}\n</head>`);
          
          console.log(`[SEO Middleware] Injected SEO into real index.html for: ${path}`);
          
          return new Response(indexHtml, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
              'X-Middleware-Active': 'true',
              'X-Middleware-Version': '2025-12-28',
              'X-SEO-Source': 'edge-function-injected',
              'X-SEO-Matched-Path': path,
              'X-Content-Language': langAttr
            }
          });
        } else {
          console.error(`[SEO Middleware] Failed to fetch index.html: ${assetResponse.status}`);
        }
      } catch (injectionError) {
        console.error(`[SEO Middleware] Error injecting SEO:`, injectionError);
      }
      
      // Fallback: if injection fails, continue to JSON handling or default
    }
    
    // If edge function returned JSON metadata, inject into React app HTML
    if (contentType.includes('application/json')) {
      const metadata = await seoResponse.json();
      
      // Get the default React app response
      const reactResponse = await next();
      let html = await reactResponse.text();
      
      // Inject language attribute
      if (metadata.metadata?.language) {
        html = html.replace(
          /<html[^>]*>/,
          `<html lang="${metadata.metadata.language}">`
        );
      }
      
      // Inject title
      if (metadata.metadata?.title) {
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>${escapeHtml(metadata.metadata.title)}</title>`
        );
      }
      
      // Inject meta description
      if (metadata.metadata?.description) {
        const metaDesc = `<meta name="description" content="${escapeHtml(metadata.metadata.description)}" />`;
        html = html.replace('</head>', `${metaDesc}\n</head>`);
      }
      
      // Inject canonical URL
      if (metadata.metadata?.canonical) {
        const canonicalTag = `<link rel="canonical" href="${metadata.metadata.canonical}" />`;
        html = html.replace('</head>', `${canonicalTag}\n</head>`);
      }
      
      // Inject hreflang tags
      if (metadata.hreflangTags && Array.isArray(metadata.hreflangTags)) {
        const hreflangHtml = metadata.hreflangTags.join('\n');
        html = html.replace('</head>', `${hreflangHtml}\n</head>`);
      }
      
      // Inject Open Graph tags
      if (metadata.metadata) {
        const m = metadata.metadata;
        const ogTags = [];
        
        if (m.title) ogTags.push(`<meta property="og:title" content="${escapeHtml(m.title)}" />`);
        if (m.description) ogTags.push(`<meta property="og:description" content="${escapeHtml(m.description)}" />`);
        if (m.canonical) ogTags.push(`<meta property="og:url" content="${m.canonical}" />`);
        if (m.image) ogTags.push(`<meta property="og:image" content="${m.image}" />`);
        if (m.locale) ogTags.push(`<meta property="og:locale" content="${m.locale}" />`);
        
        ogTags.push('<meta property="og:type" content="article" />');
        ogTags.push('<meta property="og:site_name" content="Del Sol Prime Homes" />');
        
        html = html.replace('</head>', `${ogTags.join('\n')}\n</head>`);
      }
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
          'X-Middleware-Active': 'true',
          'X-Middleware-Version': '2025-12-24',
          'X-SEO-Source': 'injected',
          'X-SEO-Matched-Path': path,
          'X-Content-Language': lang
        }
      });
    }
    
  } catch (error) {
    console.error(`[SEO Middleware] Error processing ${path}:`, error);
  }
  
  // Fallback to default React app handling with middleware headers
  const response = await next();
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-Middleware-Active', 'true');
  newResponse.headers.set('X-Middleware-Version', '2025-12-24');
  newResponse.headers.set('X-SEO-Matched-Path', path);
  newResponse.headers.set('X-SEO-Fallback', 'true');
  return newResponse;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
