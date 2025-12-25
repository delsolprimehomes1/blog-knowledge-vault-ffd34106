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
  '/sitemap.xml': 'application/xml; charset=utf-8',
  '/sitemap-index.xml': 'application/xml; charset=utf-8',
  '/ai-sitemap.xml': 'application/xml; charset=utf-8',
  '/robots.txt': 'text/plain; charset=utf-8',
  '/llm.txt': 'text/plain; charset=utf-8',
  '/ai.txt': 'text/plain; charset=utf-8',
  '/facts.json': 'application/json; charset=utf-8',
  '/glossary.json': 'application/json; charset=utf-8',
  '/pages.json': 'application/json; charset=utf-8'
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
  
  // PRIORITY 0: Serve SPA shell directly for admin, auth, and login routes
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
            'X-Middleware-Version': '2025-12-25'
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
  
  // Check if this is an SEO-relevant path
  const seoMatch = matchSEOPath(path);
  
  if (!seoMatch) {
    // Not an SEO path - still add middleware header to prove it's running
    const response = await next();
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Middleware-Active', 'true');
    newResponse.headers.set('X-Middleware-Version', '2025-12-24');
    return newResponse;
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
      const response = await next();
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-Middleware-Active', 'true');
      newResponse.headers.set('X-Middleware-Version', '2025-12-24');
      newResponse.headers.set('X-SEO-Matched-Path', path);
      newResponse.headers.set('X-SEO-Error', `edge-function-${seoResponse.status}`);
      return newResponse;
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
    
    // If response contains HTML content, serve it directly (regardless of Content-Type header)
    if (isHtmlContent) {
      console.log(`[SEO Middleware] Serving edge function HTML (${responseBody.length} bytes)`);
      
      return new Response(responseBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`,
          'X-Middleware-Active': 'true',
          'X-Middleware-Version': '2025-12-24',
          'X-SEO-Source': 'edge-function',
          'X-SEO-Matched-Path': path,
          'X-Content-Language': lang,
          'X-Edge-Content-Type': contentType,
          'X-HTML-Detected': 'body-inspection'
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
