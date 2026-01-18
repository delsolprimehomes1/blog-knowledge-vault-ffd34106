// ============================================================
// Cloudflare Pages Middleware - Routes SEO pages to edge function
// Calls Supabase serve-seo-page function for dynamic SEO content
// Last updated: 2026-01-18
// ============================================================

const SUPABASE_URL = 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';

// Supported languages
const LANGUAGES = ['en', 'nl', 'fr', 'de', 'fi', 'pl', 'da', 'hu', 'sv', 'no'];
const LANG_PATTERN = LANGUAGES.join('|');

// SEO content routes that need edge function
const SEO_ROUTE_PATTERNS = [
  // Language homepages
  new RegExp(`^/(${LANG_PATTERN})/?$`),
  // Blog articles
  new RegExp(`^/(${LANG_PATTERN})/blog/[^/]+$`),
  // Q&A pages
  new RegExp(`^/(${LANG_PATTERN})/qa/[^/]+$`),
  // Comparison pages
  new RegExp(`^/(${LANG_PATTERN})/compare/[^/]+$`),
  // Location pages (city index and topic pages)
  new RegExp(`^/(${LANG_PATTERN})/locations/[^/]+(/[^/]+)?$`),
  // About pages
  new RegExp(`^/(${LANG_PATTERN})/about$`),
];

// Check if path needs SEO edge function
function needsSEO(pathname) {
  // Root homepage
  if (pathname === '/') return true;
  
  // Check against SEO route patterns
  return SEO_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Static file extensions - skip edge function
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', 
  '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.map',
  '.xml', '.txt', '.json'
];

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  const isLocalhost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '::1';

  // ============================================================
  // RULE 1: Enforce www. prefix (301 Permanent Redirect)
  // Non-www URLs must redirect to www for SEO consistency
  // (Must run before ANY other logic)
  // ============================================================
  if (!isLocalhost && url.hostname === 'delsolprimehomes.com') {
    const redirectUrl = new URL(url);
    redirectUrl.hostname = 'www.delsolprimehomes.com';

    return new Response(null, {
      status: 301,
      headers: {
        Location: redirectUrl.toString(),
        'X-Middleware-Status': 'Active',
      },
    });
  }

  const pathname = url.pathname;

  // Adds a debug header so we can verify middleware execution in the Network tab.
  function withMiddlewareStatus(response) {
    const headers = new Headers(response.headers);
    headers.set('X-Middleware-Status', 'Active');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Skip static files
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    // Special handling for XML files
    if (pathname.endsWith('.xml')) {
      const response = await next();
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'application/xml; charset=utf-8');
      headers.set('X-Middleware-Status', 'Active');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return withMiddlewareStatus(await next());
  }

  // Skip asset paths
  if (pathname.startsWith('/assets/') || pathname.startsWith('/.well-known/')) {
    return withMiddlewareStatus(await next());
  }

  // Check if this route needs SEO
  if (needsSEO(pathname)) {
    console.log('[Middleware] Routing to SEO edge function:', pathname);

    try {
      // Call Supabase edge function with 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const seoResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/serve-seo-page${pathname}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'X-Original-URL': url.toString(),
            'X-Forwarded-Host': url.host,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Get response body
      const body = await seoResponse.text();

      // ============================================================
      // RULE 2: Handle 410 Gone (empty content) - return immediately
      // Do NOT fall back to React SPA for 410 responses
      // ============================================================
      if (seoResponse.status === 410) {
        console.log('[Middleware] 410 Gone from edge function:', pathname);
        return new Response(body, {
          status: 410,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex',
            'X-SEO-Source': 'edge-function-410',
            'X-Middleware-Status': 'Active',
          }
        });
      }

      // If we got HTML content (check for DOCTYPE or <html), use it
      if (
        seoResponse.ok &&
        (body.includes('<!DOCTYPE html>') || body.includes('<html'))
      ) {
        console.log('[Middleware] SEO function returned HTML');
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'X-SEO-Source': 'edge-function',
            'X-Middleware-Status': 'Active',
          }
        });
      }

      // Edge function didn't return HTML, fall through to React app
      console.log('[Middleware] SEO function did not return HTML, status:', seoResponse.status);

    } catch (error) {
      // Timeout or network error - fall through to React app
      console.error('[Middleware] SEO function error:', error.message);
    }
  }

  // All other requests - pass through to React SPA
  return withMiddlewareStatus(await next());
}
