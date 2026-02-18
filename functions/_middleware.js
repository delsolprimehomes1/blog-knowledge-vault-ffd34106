// ============================================================
// Cloudflare Pages Middleware - Routes SEO pages to edge function
// Calls Supabase serve-seo-page function for dynamic SEO content
// Last updated: 2026-01-18
// v2.1 - Query param fix: ?path= instead of URL path appending
// ============================================================

// Hardcoded values ensure middleware works in Cloudflare Pages environment
// (environment variables are NOT available in Pages Functions)
const SUPABASE_URL = 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';

// Supported languages
const LANGUAGES = ['en', 'nl', 'fr', 'de', 'fi', 'pl', 'da', 'hu', 'sv', 'no'];
const LANG_PATTERN = LANGUAGES.join('|');

// SEO content routes that need edge function SSR
// NOTE: All content pages (blog, QA, compare, locations) are now pre-rendered
// as static HTML files during build. The middleware should NOT intercept them.
// Static files contain full branding + all SEO metadata (hreflang, canonical, schemas).
// Edge function is ONLY for truly dynamic routes or fallback scenarios.
const SEO_ROUTE_PATTERNS = [
  // Location Hub ONLY - the hub index pages need edge function for dynamic city listing
  // Individual location pages (/{lang}/locations/{city}/{topic}) are served as static files
  new RegExp(`^/(${LANG_PATTERN})/locations/?$`),
];

// Check if path needs SEO edge function
function needsSEO(pathname) {
  // Root homepage should be served as static file, NOT via edge function
  // The homepage is pre-rendered as home.html during build
  if (pathname === '/') return false;
  
  // Check against SEO route patterns
  return SEO_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Static file extensions - skip edge function
const STATIC_EXTENSIONS = [
  '.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', 
  '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.map',
  '.xml', '.txt', '.json'
];

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  // env is optional; used only for diagnostics

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

  // ============================================================
  // RULE 2: Redirect CRM routes from Lovable subdomain to production
  // Catches old email links that used the fallback subdomain
  // ============================================================
  if (url.hostname === 'blog-knowledge-vault.lovable.app' && url.pathname.startsWith('/crm/')) {
    const redirectUrl = new URL(url);
    redirectUrl.hostname = 'www.delsolprimehomes.com';
    
    console.log(`[Middleware] Redirecting CRM from Lovable subdomain: ${url.pathname} → ${redirectUrl.toString()}`);
    
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

  // ============================================================
  // BLOG SSR FALLBACK: Try static file first, then edge function
  // Ensures crawlers get full HTML with internal links section
  // ============================================================
  const blogMatch = pathname.match(/^\/([a-z]{2})\/blog\/(.+)/);
  if (blogMatch) {
    const staticResponse = await next();
    const staticClone = staticResponse.clone();
    const staticBody = await staticClone.text();

    const isComplete =
      staticBody.includes('<!DOCTYPE html>') &&
      !staticBody.includes('<div id="root"></div>') &&
      staticBody.length > 5000 &&
      staticBody.includes('internal-links-section');

    if (isComplete) {
      console.log(`[Middleware] Blog static file served (complete): ${pathname}`);
      const headers = new Headers(staticResponse.headers);
      headers.set('X-Middleware-Status', 'Active');
      headers.set('X-SEO-Source', 'static');
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
      headers.set('CDN-Cache-Control', 'max-age=3600');
      headers.set('Cloudflare-CDN-Cache-Control', 'max-age=3600');
      headers.set('Vary', 'Accept-Encoding');
      return new Response(staticBody, {
        status: staticResponse.status,
        statusText: staticResponse.statusText,
        headers,
      });
    }

    // Static file missing/thin/no internal links — call SSR
    console.log(`[Middleware] Blog static incomplete for ${pathname}, trying SSR fallback`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const ssrResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/serve-seo-page?path=${encodeURIComponent(pathname)}&html=true`,
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

      const ssrBody = await ssrResponse.text();

      if (ssrResponse.ok && ssrBody.includes('<!DOCTYPE html>') && ssrBody.length > 1000) {
        console.log(`[Middleware] Blog SSR fallback success: ${pathname}`);
        return new Response(ssrBody, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'max-age=3600',
            'Cloudflare-CDN-Cache-Control': 'max-age=3600',
            'Vary': 'Accept-Encoding',
            'X-SEO-Source': 'edge-function-ssr',
            'X-Robots-Tag': 'all',
            'X-Middleware-Status': 'Active',
          },
        });
      }

      console.log(`[Middleware] Blog SSR returned ${ssrResponse.status}, falling through to SPA`);
    } catch (err) {
      console.error(`[Middleware] Blog SSR fallback error for ${pathname}:`, err?.message);
    }

    // Both failed — serve SPA shell with short cache
    const headers = new Headers(staticResponse.headers);
    headers.set('X-Middleware-Status', 'Active');
    headers.set('X-SEO-Source', 'spa-fallback');
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');
    headers.set('CDN-Cache-Control', 'max-age=300');
    headers.set('Vary', 'Accept-Encoding');
    return new Response(staticBody, {
      status: staticResponse.status,
      statusText: staticResponse.statusText,
      headers,
    });
  }

  // ============================================================
  // Q&A SSR FALLBACK: Try static file first, then edge function
  // Ensures crawlers always get full HTML even if static files
  // are missing from deployment.
  // ============================================================
  const qaMatch = pathname.match(/^\/([a-z]{2})\/qa\/(.+)/);
  if (qaMatch) {
    const [, lang, slug] = qaMatch;

    // 1. Try static file via next() (_redirects may resolve it)
    const staticResponse = await next();
    const staticClone = staticResponse.clone();
    const staticBody = await staticClone.text();

    // 2. Check if response is substantial HTML (not the empty SPA shell)
    const isSubstantialHTML =
      staticBody.includes('<!DOCTYPE html>') &&
      !staticBody.includes('<div id="root"></div>') &&
      staticBody.length > 5000 &&
      staticBody.includes('internal-links-section');

      if (isSubstantialHTML) {
        console.log(`[Middleware] Q&A static file served: ${pathname}`);
        const headers = new Headers(staticResponse.headers);
        headers.set('X-Middleware-Status', 'Active');
        headers.set('X-SEO-Source', 'static');
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
        headers.set('CDN-Cache-Control', 'max-age=3600');
        headers.set('Cloudflare-CDN-Cache-Control', 'max-age=3600');
        headers.set('Vary', 'Accept-Encoding');
        return new Response(staticBody, {
          status: staticResponse.status,
          statusText: staticResponse.statusText,
          headers,
        });
      }

    // 3. Static file missing/thin — call serve-seo-page edge function
    console.log(`[Middleware] Q&A static missing for ${pathname}, trying SSR fallback`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const ssrResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/serve-seo-page?path=${encodeURIComponent(pathname)}&html=true`,
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

      const ssrBody = await ssrResponse.text();

      if (ssrResponse.ok && ssrBody.includes('<!DOCTYPE html>') && ssrBody.length > 1000) {
        console.log(`[Middleware] Q&A SSR fallback success: ${pathname}`);
        return new Response(ssrBody, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'max-age=3600',
            'Cloudflare-CDN-Cache-Control': 'max-age=3600',
            'Vary': 'Accept-Encoding',
            'X-SEO-Source': 'edge-function-ssr',
            'X-Robots-Tag': 'all',
            'X-Middleware-Status': 'Active',
          },
        });
      }

      console.log(`[Middleware] Q&A SSR returned ${ssrResponse.status}, falling through to SPA`);
    } catch (err) {
      console.error(`[Middleware] Q&A SSR fallback error for ${pathname}:`, err?.message);
    }

    // 4. Both failed — serve original SPA response with short cache
    const headers = new Headers(staticResponse.headers);
    headers.set('X-Middleware-Status', 'Active');
    headers.set('X-SEO-Source', 'spa-fallback');
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');
    headers.set('CDN-Cache-Control', 'max-age=300');
    headers.set('Vary', 'Accept-Encoding');
    return new Response(staticBody, {
      status: staticResponse.status,
      statusText: staticResponse.statusText,
      headers,
    });
  }

  // Passthrough for villas and apartments landing pages (SPA routes)
  if (
    pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/villas\/?$/) ||
    pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/apartments\/?$/)
  ) {
    console.log('[Middleware] Villas/Apartments SPA route - passthrough to _redirects (no-store)');
    const spaResponse = await next();
    const spaHeaders = new Headers(spaResponse.headers);
    spaHeaders.set('X-Middleware-Status', 'Active');
    spaHeaders.set('Cache-Control', 'no-store');
    return new Response(spaResponse.body, {
      status: spaResponse.status,
      statusText: spaResponse.statusText,
      headers: spaHeaders,
    });
  }

  // Check if this route needs SEO
  if (needsSEO(pathname)) {
    console.log('[Middleware] Routing to SEO edge function:', pathname);

    let seoStatus = 'pending';
    let seoBody = '';

    try {
      // Call Supabase edge function with 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const seoResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/serve-seo-page?path=${encodeURIComponent(pathname)}&html=true`,
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
      seoStatus = String(seoResponse.status);

      // Get response body
      seoBody = await seoResponse.text();

      // ============================================================
      // FAIL LOUDLY: If edge function returns ANY non-200 status,
      // return that response directly - NEVER fall back to React
      // ============================================================
      if (!seoResponse.ok) {
        console.log(`[Middleware] Edge function returned ${seoResponse.status}:`, pathname);
        
        // Determine content type from response or default to text/html
        const contentType = seoResponse.headers.get('Content-Type') || 'text/html; charset=utf-8';
        
        return new Response(seoBody, {
          status: seoResponse.status,
          headers: {
            'Content-Type': contentType,
            'X-Robots-Tag': 'noindex',
            'X-SEO-Source': `edge-function-${seoResponse.status}`,
            'X-SEO-Status': seoStatus,
            'X-Middleware-Status': 'Active',
            'X-SEO-Debug': 'fail-loud-mode',
          }
        });
      }

      // If we got HTML content (check for DOCTYPE or <html), use it
      if (seoBody.includes('<!DOCTYPE html>') || seoBody.includes('<html')) {
        console.log('[Middleware] SEO function returned HTML');
        return new Response(seoBody, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'X-SEO-Source': 'edge-function',
            'X-SEO-Status': seoStatus,
            'X-Middleware-Status': 'Active',
          }
        });
      }

      // Edge function returned 200 but no HTML - still show the raw response
      console.log('[Middleware] SEO function returned 200 but no HTML');
      return new Response(seoBody || 'Edge function returned empty body', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-SEO-Source': 'edge-function-no-html',
          'X-SEO-Status': seoStatus,
          'X-Middleware-Status': 'Active',
        }
      });

    } catch (err) {
      return new Response(
        JSON.stringify(
          {
            error: 'Middleware Crash',
            name: err?.name,
            details: err?.message,
            stack: err?.stack,
            env_check: {
              has_url: !!env?.SUPABASE_URL,
              has_key: !!env?.SUPABASE_ANON_KEY,
            },
          },
          null,
          2
        ),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Middleware-Status': 'Active',
            'X-SEO-Status': 'MiddlewareCrash',
          },
        }
      );
    }
  }

  // All other requests - pass through to React SPA
  return withMiddlewareStatus(await next());
}
