
## Why Apartments and Villas Redirect to Homepage After Every Deployment

### The Exact Problem

This is a **Cloudflare edge cache race condition** that only affects pure SPA routes (apartments, villas) — not pre-rendered pages (blog, Q&A).

Here is the sequence:

1. You push code → GitHub → Cloudflare starts deploying a new build.
2. Every new build generates a **new JS bundle filename** (e.g. `assets/index-abc123.js` → `assets/index-def456.js`).
3. `index.html` is updated to reference the new bundle name.
4. During the ~1-5 minute global propagation window, some Cloudflare edge nodes still serve the **old `index.html`** (which references the old bundle name).
5. The old bundle file (`assets/index-abc123.js`) no longer exists in the new deployment.
6. React fails to load silently → the app never boots → the browser shows whatever `/` returns → **looks like a redirect to the homepage**.
7. After propagation completes, `index.html` is fresh everywhere and it works again.

**Why only apartments/villas?** Every other important page (blog, Q&A, language homepages) is pre-rendered as static HTML during the build — they carry their full content in the HTML file itself and don't depend on the React JS bundle loading correctly. Apartments and villas are **pure SPA routes** — they are 100% reliant on `index.html` loading the correct new JS bundle.

**Why doesn't the `no-store` header in `_headers` fix it?** The `_headers` rules for `/en/apartments` etc. apply `no-store` to those URL paths, but `index.html` is an underlying static file. The static file itself gets cached at the edge separately from the URL path rule. Additionally, the middleware's `STATIC_EXTENSIONS` list includes `.html`, which causes the middleware to skip Rule 3 (the villas/apartments passthrough) for `.html` files before it even has a chance to apply the `no-store` header.

### The Fix: Two Changes

**1. Add `no-store` for `index.html` itself in `public/_headers`**

The root `index.html` must never be cached at the edge, because it is the entry point for all SPA routes. Adding:

```
/index.html
  Cache-Control: no-store, no-cache, must-revalidate
  Surrogate-Control: no-store
  CDN-Cache-Control: no-store
```

This ensures that when Cloudflare serves the apartments/villas SPA routes (which resolve to `/index.html` via `_redirects`), it always fetches a fresh copy of `index.html` rather than a cached stale one.

**2. Remove `.html` from the middleware static skip list (or add an exception for index.html)**

In `functions/_middleware.js`, the `STATIC_EXTENSIONS` array includes `.html`. This means when a request for `/en/apartments` resolves to `/index.html` via `_redirects`, and the middleware encounters it on re-entry, it skips Rule 3 entirely because the resolved path ends in `.html`.

The fix is to modify the static extension check so that `index.html` is never skipped — the middleware should still passthrough (which is fine) but should set the `no-store` cache header on it:

Change the static file skip at line 123 to also explicitly set `no-store` headers when the path is `/index.html`:

```javascript
// Skip static files — but index.html must never be cached (it is the SPA entry point)
if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
  if (pathname === '/index.html' || pathname.endsWith('/index.html')) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Surrogate-Control', 'no-store');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('X-Middleware-Status', 'Active');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  // ... rest of existing static file handling
```

### Files to Change

| File | Change |
|---|---|
| `public/_headers` | Add `no-store` block for `/index.html` at the top of the file |
| `functions/_middleware.js` | In the static file skip block (~line 123), add a special branch for `index.html` that forces `no-store` headers through |

### What This Achieves

- `index.html` is never stored at Cloudflare's edge — every request for it gets the freshest copy.
- This means apartments/villas routes always boot with the correct, current JS bundle.
- All other static assets (JS, CSS, images) continue to be cached aggressively at the edge (this is correct — they use hashed filenames so stale cache is never an issue).
- No change to any React component, routing logic, or database.

### Important Note on Testing

Because middleware does not run on Lovable preview URLs, this fix can only be fully verified on the live production domain (`www.delsolprimehomes.com`) after pushing to Cloudflare. The behaviour to watch for: deploy a change to the apartments page → immediately visit `/en/apartments` → it should load correctly without waiting 1-5 minutes for propagation.
