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
  DEBUG: false
};

/**
 * Check if the path matches an SEO-relevant content page
 */
function matchSEOPath(path) {
  // Pattern: /{lang}/{type}/{slug}
  const match = path.match(/^\/([a-z]{2})\/(qa|blog|compare|locations)\/(.+)$/);
  
  if (!match) return null;
  
  const [, lang, type, slug] = match;
  
  // Validate language
  if (!CONFIG.SUPPORTED_LANGUAGES.includes(lang)) return null;
  
  return { lang, type, slug };
}

/**
 * Main middleware handler
 */
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if this is an SEO-relevant path
  const seoMatch = matchSEOPath(path);
  
  if (!seoMatch) {
    // Not an SEO path, continue to default handling
    return next();
  }
  
  const { lang, type, slug } = seoMatch;
  
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
    
    if (!seoResponse.ok) {
      console.error(`[SEO Middleware] Edge function returned ${seoResponse.status}`);
      return next();
    }
    
    const contentType = seoResponse.headers.get('content-type') || '';
    
    // If edge function returned full HTML, serve it directly
    if (contentType.includes('text/html')) {
      const html = await seoResponse.text();
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
          'X-SEO-Source': 'edge-function',
          'X-Content-Language': lang
        }
      });
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
          'X-SEO-Source': 'injected',
          'X-Content-Language': lang
        }
      });
    }
    
  } catch (error) {
    console.error(`[SEO Middleware] Error processing ${path}:`, error);
  }
  
  // Fallback to default React app handling
  return next();
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
