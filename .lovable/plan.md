
## Fix: Bust the Stale Cloudflare Cache for /en/villas/properties

### Root Cause

The files are all correctly configured:
- `public/_redirects` line 88: `/en/villas/properties /index.html 200` — correct
- `App.tsx` line 397: `<Route path="/:lang/villas/properties" element={<VillasLanding />} />` — correct
- `functions/_middleware.js` line 95: regex correctly matches `villas/properties` — correct

The problem is that Cloudflare's edge nodes have a **stale cached 301 redirect** for `/en/villas/properties → /` (homepage) written during the earlier routing experiments. Even though the rules are fixed, Cloudflare is serving the cached redirect to incognito users from its edge cache.

The `public/_headers` file already has `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` for `/en/villas/properties`, but that header only applies to **fresh responses**. It cannot override a response that is already cached at the edge.

### The Fix: Force Cloudflare to Abandon the Stale Cache

The most reliable way to bust a stale Cloudflare CDN cache without direct dashboard access is to make a meaningful change to the headers file for those exact paths. Cloudflare re-validates its cache when the response headers change.

**Step 1 — Add a cache-busting `Vary` header to `public/_headers`**

For all 10 `/lang/villas/properties` paths, add a `Surrogate-Control: no-store` header alongside the existing `Cache-Control`. Cloudflare respects `Surrogate-Control` specifically at the CDN layer and will immediately drop cached entries for those paths.

Current state of lines 42-61 in `public/_headers`:
```
/en/villas/properties
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

New state (add one line per path):
```
/en/villas/properties
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Surrogate-Control: no-store
  CDN-Cache-Control: no-store
```

This will be applied to all 10 language variants.

**Step 2 — Add a versioned `ETag`-busting query comment to `_redirects`**

Touch the `/en/villas/properties /index.html 200` rule with a comment above it to force Cloudflare Pages to treat the redirects config as changed, triggering a full re-evaluation:

```
# villas/properties SPA rewrite - cache-bust v2
/en/villas/properties  /index.html  200
```

### Files to Change

1. **`public/_headers`** — Add `Surrogate-Control: no-store` and `CDN-Cache-Control: no-store` to all 10 `/:lang/villas/properties` blocks (lines 42-61).

2. **`public/_redirects`** — Add a version comment above the 10 villas/properties rewrite rules (lines 87-97) to force Cloudflare Pages to invalidate its rules cache on next deploy.

### Why This Won't Break Anything Else

- The `Surrogate-Control` and `CDN-Cache-Control` headers only affect the exact paths they are declared for.
- The homepage rule (`/en / 301`) is untouched.
- The `/:lang` → `LanguageHome` React route is untouched.
- Apartments (`/en/apartments`) already works — those paths are not being changed.

### Expected Outcome After Deploy

- `https://www.delsolprimehomes.com/en/villas/properties` loads the Villas landing page correctly in incognito.
- All 10 language variants resolve correctly.
- No homepage redirect loop.
