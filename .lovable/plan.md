

# Cloudflare CDN Cache Optimization for Q&A Pages

## What We're Fixing

The middleware-to-edge-function pipeline works correctly, but under burst traffic the 12-second middleware timeout can still trigger. Adding aggressive CDN-level caching ensures that after one successful response, all subsequent requests for the same Q&A page are served instantly from Cloudflare's edge -- no middleware, no edge function, no database.

## Changes

### 1. Middleware Cache Headers Enhancement (`functions/_middleware.js`)

**Lines 186-192** (Q&A SSR success response): Add `stale-while-revalidate` and `CDN-Cache-Control` headers so Cloudflare caches aggressively and serves stale content during revalidation.

Current:
```
'Cache-Control': 'public, max-age=3600, s-maxage=3600',
```

New:
```
'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
'CDN-Cache-Control': 'max-age=3600',
'Cloudflare-CDN-Cache-Control': 'max-age=3600',
'Vary': 'Accept-Encoding',
```

**Lines 147-156** (Q&A static file response): Add the same aggressive cache headers to static file responses so they also benefit from CDN caching.

**Lines 201-209** (SPA fallback response): Add a shorter cache with `stale-while-revalidate` so even fallback responses get some CDN caching (5 minutes edge, 1 hour stale).

### 2. Static Headers Enhancement (`public/_headers`)

**Lines 31-34**: Strengthen the existing Q&A cache headers with `CDN-Cache-Control` and `stale-while-revalidate` to match the middleware.

Current:
```
/*/qa/*
  Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=300
```

New:
```
/*/qa/*
  Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400
  CDN-Cache-Control: max-age=3600
  X-Robots-Tag: all
  X-Content-Type-Options: nosniff
```

Key change: `stale-while-revalidate` goes from 5 minutes to 24 hours, meaning Cloudflare will serve the cached version for up to 24 hours while fetching a fresh copy in the background.

## How It Works

```text
Request Flow After Caching:

1st request:  Browser -> Cloudflare CDN (MISS) -> Middleware -> Edge Function -> DB
              Response cached at CDN edge for 1 hour

2nd+ request: Browser -> Cloudflare CDN (HIT) -> instant response (~50ms)
              No middleware, no edge function, no database

After 1 hour: Browser -> Cloudflare CDN (STALE) -> serves cached instantly
              Background: CDN fetches fresh copy from edge function
```

## Impact

- First request per Q&A page: normal speed (1-3 seconds)
- All subsequent requests within 1 hour: instant from CDN (~50ms)
- Requests between 1-25 hours: still instant (stale-while-revalidate serves cached version while refreshing in background)
- Googlebot re-crawls: almost always served from CDN cache
- Edge function load: reduced by 90%+ as cache warms

## No Cloudflare Dashboard Required

All changes are done via response headers in the middleware and `_headers` file. No Cloudflare Page Rules or dashboard configuration needed.
