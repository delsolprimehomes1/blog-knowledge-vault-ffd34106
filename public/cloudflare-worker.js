/**
 * =============================================================================
 * DEL SOL PRIME HOMES - CLOUDFLARE WORKER FOR SEO METADATA INJECTION
 * =============================================================================
 * 
 * This Worker intercepts requests for content pages (Q&A, Blog, Comparisons, 
 * Locations) and fetches SEO-optimized HTML from the serve-seo-page edge 
 * function, ensuring search engines see correct metadata for each language.
 * 
 * =============================================================================
 * DEPLOYMENT INSTRUCTIONS
 * =============================================================================
 * 
 * 1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
 * 2. Select your account → Workers & Pages
 * 3. Click "Create Application" → "Create Worker"
 * 4. Name it: "delsol-seo-router" (or update existing worker)
 * 5. Paste this entire script
 * 6. Click "Deploy"
 * 7. Go to Workers → delsol-seo-router → Triggers
 * 8. Add Route: delsolprimehomes.com/* (or your domain)
 * 9. Test with: https://delsolprimehomes.com/no/qa/your-slug
 * 
 * =============================================================================
 * CONFIGURATION
 * =============================================================================
 */

const CONFIG = {
  // Supabase Edge Function URL
  EDGE_FUNCTION_URL: 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/serve-seo-page',
  
  // React App origin (Cloudflare Pages or custom)
  REACT_APP_ORIGIN: 'https://delsolprimehomes.pages.dev',
  
  // Webflow origin for non-React pages
  WEBFLOW_ORIGIN: 'https://delsolprimehomes.webflow.io',
  
  // Supported languages (ISO 639-1 codes)
  SUPPORTED_LANGUAGES: ['en', 'es', 'de', 'fr', 'nl', 'sv', 'no', 'da', 'fi', 'ru'],
  
  // Content types that need SEO injection
  SEO_CONTENT_TYPES: ['qa', 'blog', 'compare', 'locations'],
  
  // Paths that always go to React app (no SEO injection needed)
  REACT_ONLY_PATHS: ['/admin', '/auth', '/property-finder', '/sitemap'],
  
  // Cache TTL in seconds (1 hour for SEO pages)
  CACHE_TTL: 3600,
  
  // Enable debug logging
  DEBUG: false
};

/**
 * =============================================================================
 * MAIN REQUEST HANDLER
 * =============================================================================
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (CONFIG.DEBUG) {
      console.log(`[Worker] Incoming request: ${path}`);
    }
    
    // Check if this is an SEO content path that needs metadata injection
    const seoMatch = matchSEOPath(path);
    
    if (seoMatch) {
      return handleSEORequest(request, path, seoMatch, ctx);
    }
    
    // Check if this is a React-only path
    if (isReactOnlyPath(path)) {
      return fetchReactApp(request);
    }
    
    // Check if this is a React content path (English blog without language prefix)
    if (path.startsWith('/blog/') || path === '/blog') {
      return fetchReactApp(request);
    }
    
    // Default: proxy to Webflow for marketing pages
    return fetchWebflow(request);
  }
};

/**
 * =============================================================================
 * PATH MATCHING
 * =============================================================================
 */

/**
 * Match paths that need SEO metadata injection
 * Patterns:
 *   /{lang}/{type}/{slug}  - e.g., /no/qa/some-question
 *   /{lang}/{type}         - e.g., /es/blog (index pages)
 * 
 * @param {string} path - The URL path
 * @returns {object|null} - Match object with lang, type, slug or null
 */
function matchSEOPath(path) {
  // Pattern: /{lang}/{type}/{slug}
  const fullPattern = /^\/([a-z]{2})\/(qa|blog|compare|locations)\/([^\/]+)\/?$/;
  const fullMatch = path.match(fullPattern);
  
  if (fullMatch) {
    const [, lang, type, slug] = fullMatch;
    if (CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
      return { lang, type, slug };
    }
  }
  
  // Pattern: /{lang}/{type} (index pages)
  const indexPattern = /^\/([a-z]{2})\/(qa|blog|compare|locations)\/?$/;
  const indexMatch = path.match(indexPattern);
  
  if (indexMatch) {
    const [, lang, type] = indexMatch;
    if (CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
      return { lang, type, slug: null, isIndex: true };
    }
  }
  
  return null;
}

/**
 * Check if path should go directly to React app
 */
function isReactOnlyPath(path) {
  return CONFIG.REACT_ONLY_PATHS.some(reactPath => 
    path === reactPath || path.startsWith(reactPath + '/')
  );
}

/**
 * =============================================================================
 * REQUEST HANDLERS
 * =============================================================================
 */

/**
 * Handle SEO content requests by fetching metadata from edge function
 */
async function handleSEORequest(request, path, match, ctx) {
  const { lang, type, slug, isIndex } = match;
  
  if (CONFIG.DEBUG) {
    console.log(`[Worker] SEO match: lang=${lang}, type=${type}, slug=${slug}`);
  }
  
  // For index pages, serve React app (they have their own meta handling)
  if (isIndex) {
    return fetchReactApp(request);
  }
  
  // Check cache first
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;
  let cachedResponse = await cache.match(cacheKey);
  
  if (cachedResponse) {
    if (CONFIG.DEBUG) {
      console.log(`[Worker] Cache hit for ${path}`);
    }
    return cachedResponse;
  }
  
  try {
    // Call the edge function to get SEO-optimized HTML
    const edgeFunctionUrl = `${CONFIG.EDGE_FUNCTION_URL}?path=${encodeURIComponent(path)}&html=true`;
    
    if (CONFIG.DEBUG) {
      console.log(`[Worker] Calling edge function: ${edgeFunctionUrl}`);
    }
    
    const seoResponse = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
        'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker'
      }
    });
    
    if (!seoResponse.ok) {
      console.error(`[Worker] Edge function returned ${seoResponse.status}`);
      // Fallback to React app on error
      return fetchReactApp(request);
    }
    
    const contentType = seoResponse.headers.get('content-type') || '';
    
    // If edge function returns JSON (metadata only), we need to inject it into React HTML
    if (contentType.includes('application/json')) {
      const metadata = await seoResponse.json();
      return injectMetadataIntoReactApp(request, metadata, path);
    }
    
    // If edge function returns HTML, use it directly
    if (contentType.includes('text/html')) {
      const html = await seoResponse.text();
      
      const response = new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
          'X-SEO-Source': 'edge-function',
          'X-Content-Language': lang
        }
      });
      
      // Cache the response
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      
      return response;
    }
    
    // Unknown content type, fallback to React
    return fetchReactApp(request);
    
  } catch (error) {
    console.error(`[Worker] Error fetching SEO data: ${error.message}`);
    // Fallback to React app on error
    return fetchReactApp(request);
  }
}

/**
 * Inject metadata into React app's index.html
 */
async function injectMetadataIntoReactApp(request, metadata, path) {
  // Fetch the React app's index.html
  const reactResponse = await fetchReactApp(request);
  let html = await reactResponse.text();
  
  // Build the meta tags to inject
  const metaTags = buildMetaTags(metadata);
  
  // Inject meta tags into <head>
  html = html.replace(
    /<head>/i,
    `<head>\n${metaTags}`
  );
  
  // Update <html lang="...">
  if (metadata.language) {
    html = html.replace(
      /<html[^>]*>/i,
      `<html lang="${metadata.language}">`
    );
  }
  
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
      'X-SEO-Source': 'injected',
      'X-Content-Language': metadata.language || 'en'
    }
  });
}

/**
 * Build HTML meta tags from metadata object
 */
function buildMetaTags(metadata) {
  const tags = [];
  
  // Title
  if (metadata.title) {
    tags.push(`<title>${escapeHtml(metadata.title)}</title>`);
  }
  
  // Meta description
  if (metadata.description) {
    tags.push(`<meta name="description" content="${escapeHtml(metadata.description)}">`);
  }
  
  // Open Graph
  if (metadata.title) {
    tags.push(`<meta property="og:title" content="${escapeHtml(metadata.title)}">`);
  }
  if (metadata.description) {
    tags.push(`<meta property="og:description" content="${escapeHtml(metadata.description)}">`);
  }
  if (metadata.image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(metadata.image)}">`);
  }
  if (metadata.locale) {
    tags.push(`<meta property="og:locale" content="${escapeHtml(metadata.locale)}">`);
  }
  if (metadata.url) {
    tags.push(`<meta property="og:url" content="${escapeHtml(metadata.url)}">`);
  }
  
  // Canonical URL
  if (metadata.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(metadata.canonical)}">`);
  }
  
  // Hreflang tags
  if (metadata.hreflang && Array.isArray(metadata.hreflang)) {
    for (const link of metadata.hreflang) {
      if (link.lang && link.url) {
        tags.push(`<link rel="alternate" hreflang="${escapeHtml(link.lang)}" href="${escapeHtml(link.url)}">`);
      }
    }
  }
  
  // JSON-LD Schema
  if (metadata.schema) {
    const schemaJson = typeof metadata.schema === 'string' 
      ? metadata.schema 
      : JSON.stringify(metadata.schema);
    tags.push(`<script type="application/ld+json">${schemaJson}</script>`);
  }
  
  return tags.join('\n    ');
}

/**
 * =============================================================================
 * ORIGIN FETCHERS
 * =============================================================================
 */

/**
 * Fetch from React app (Cloudflare Pages)
 */
async function fetchReactApp(request) {
  const url = new URL(request.url);
  const reactUrl = new URL(url.pathname + url.search, CONFIG.REACT_APP_ORIGIN);
  
  const response = await fetch(reactUrl.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: 'follow'
  });
  
  // If not found, try index.html for SPA routing
  if (response.status === 404) {
    const indexUrl = new URL('/index.html', CONFIG.REACT_APP_ORIGIN);
    return fetch(indexUrl.toString(), {
      method: 'GET',
      headers: request.headers
    });
  }
  
  return response;
}

/**
 * Fetch from Webflow (marketing pages)
 */
async function fetchWebflow(request) {
  const url = new URL(request.url);
  const webflowUrl = new URL(url.pathname + url.search, CONFIG.WEBFLOW_ORIGIN);
  
  return fetch(webflowUrl.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: 'follow'
  });
}

/**
 * =============================================================================
 * UTILITIES
 * =============================================================================
 */

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * =============================================================================
 * END OF WORKER
 * =============================================================================
 * 
 * TESTING CHECKLIST:
 * 
 * 1. Test SEO page (should get metadata from edge function):
 *    curl -I https://delsolprimehomes.com/no/qa/some-slug
 *    → Should have X-SEO-Source: edge-function
 *    → Should have X-Content-Language: no
 * 
 * 2. Test React-only page (should go to React app):
 *    curl -I https://delsolprimehomes.com/admin
 *    → Should serve React app
 * 
 * 3. Test English blog (no language prefix):
 *    curl -I https://delsolprimehomes.com/blog/some-article
 *    → Should serve React app
 * 
 * 4. Test with Googlebot user agent:
 *    curl -H "User-Agent: Googlebot" https://delsolprimehomes.com/no/qa/some-slug
 *    → Should return full HTML with Norwegian metadata
 * 
 * 5. Test cache:
 *    - First request: X-SEO-Source: edge-function
 *    - Second request: Should be served from cache
 * 
 * =============================================================================
 * TROUBLESHOOTING:
 * 
 * 1. "Edge function returned 4xx/5xx"
 *    → Check that serve-seo-page function is deployed
 *    → Verify the path format is correct
 *    → Check Supabase Edge Function logs
 * 
 * 2. "Cache not working"
 *    → Verify Cache-Control headers are being set
 *    → Check Cloudflare caching rules
 * 
 * 3. "Wrong metadata being shown"
 *    → Clear Cloudflare cache
 *    → Verify edge function is returning correct data
 * 
 * 4. "404 on React pages"
 *    → Verify REACT_APP_ORIGIN is correct
 *    → Check that index.html fallback is working
 * 
 * =============================================================================
 */
