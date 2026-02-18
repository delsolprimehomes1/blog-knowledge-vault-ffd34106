
## Root Cause: Middleware Processes Villas Too Late

### The Definitive Diagnosis

After auditing every layer — `_redirects`, `_routes.json`, `_middleware.js`, `App.tsx`, React Router order, database — here is the exact failure:

**`public/_routes.json` excludes all `.html` files from middleware:**
```json
"exclude": ["/*.html", ...]
```

This means any `.html` file served by Cloudflare is delivered **directly**, bypassing the middleware entirely. The `_redirects` rule `/en/villas → /index.html 200` tells Cloudflare to rewrite to `index.html` — but if Cloudflare first checks for a physical `/en/villas/index.html` static file (from a previous pre-rendered deployment or CDN cache) and finds it, it serves that file directly under the `*.html` exclusion rule — bypassing both the middleware villas passthrough and the `_redirects` rule.

**The secondary problem — middleware order is wrong:**

The current middleware processes routes in this order:
1. www redirect (line 59)
2. CRM subdomain redirect (line 76)
3. Static file extension skip (line 104)  ← **Problem: villas routes pass through here and call `next()` immediately because they have no extension — but then fall through to...**
4. Blog SSR block (line 131)
5. Q&A SSR block (line 218)
6. **Villas/Apartments passthrough (line 314)** ← Too late; by this point Cloudflare may have already resolved the request from a cached static file

### The Fix: Move Villas Passthrough to the Top

The villas/apartments passthrough block needs to move to **immediately after the CRM subdomain redirect** (line 89), before the static file extension check at line 104. This guarantees it fires first for any villas/apartments request, before Cloudflare can resolve a cached `.html` file.

**Current order (broken):**
```text
Line 59:  www redirect
Line 76:  CRM subdomain redirect
Line 104: static extension skip ← next() fires here for /en/villas
Line 131: Blog SSR block
Line 218: Q&A SSR block
Line 314: Villas passthrough ← TOO LATE, already served
```

**Fixed order:**
```text
Line 59:  www redirect
Line 76:  CRM subdomain redirect
Line 91:  [NEW POSITION] Villas/Apartments passthrough ← FIRST
Line 104: static extension skip
Line 131: Blog SSR block
Line 218: Q&A SSR block
```

### Changes Required

**Single file: `functions/_middleware.js`**

Remove the villas/apartments passthrough block from its current position (lines 314-329) and insert it immediately after line 89 (after the CRM subdomain redirect block closes, before `const pathname = url.pathname`).

The block being moved:
```javascript
// Passthrough for villas and apartments landing pages (SPA routes)
// MUST be before static file check to prevent cached HTML interference
const villaPath = url.pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/(villas|apartments)\/?$/);
if (villaPath) {
  console.log('[Middleware] Villas/Apartments SPA route - early passthrough (no-store)');
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
```

This must be placed **before** `const pathname = url.pathname` (line 91), so it uses `url.pathname` directly from the URL object.

### Why This Definitively Fixes It

- Moving the passthrough to line 90 means Cloudflare middleware intercepts villas/apartments requests **before any static file resolution occurs**
- The `Cache-Control: no-store` header prevents Cloudflare from caching the response and re-serving a stale homepage
- The explicit `_redirects` rules at lines 64-84 already correctly map `/en/villas → /index.html 200`
- React Router's `/:lang/villas` route at App.tsx line 393 is already in the correct position (before `/:lang`)
- All 10 language variants of villas content are confirmed published in the database

### No Other Files Need Changing

- `public/_redirects` — already correct (20 explicit rules added in previous fix)
- `src/App.tsx` — already correct (en redirect removed, villas route in correct position)
- Database — all 10 languages confirmed published
