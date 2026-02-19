
## Fix: Add Missing Cache Headers to Apartments/Villas Middleware Rule

### Root Cause

Rule 3 in `functions/_middleware.js` (lines 96-107) intercepts the apartments and villas routes correctly, but only sets ONE of the three required cache headers:

```
spaHeaders.set('Cache-Control', 'no-store');   ← only this is set
// Surrogate-Control: no-store                 ← MISSING
// CDN-Cache-Control: no-store                 ← MISSING
```

Cloudflare's edge CDN specifically looks at `Surrogate-Control` and `CDN-Cache-Control` to decide whether to cache a response. Without those two headers, Cloudflare ignores the `Cache-Control: no-store` instruction and keeps serving its cached copy. That stale cached `index.html` references an old JS bundle filename that no longer exists after a new deploy — React fails to load silently, and the browser falls back to `/`, which looks like a redirect to the homepage.

### The Fix — One File, Three Lines Added

**`functions/_middleware.js` — Rule 3 block (lines 96–107)**

Add the two missing headers to the `spaHeaders` block:

```javascript
spaHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
spaHeaders.set('Surrogate-Control', 'no-store');      // ← ADD THIS
spaHeaders.set('CDN-Cache-Control', 'no-store');       // ← ADD THIS
```

Also strengthen `Cache-Control` from just `no-store` to the full "Golden Trio" value `no-store, no-cache, must-revalidate, proxy-revalidate` — consistent with the `_headers` file rules.

### What This Achieves

- Cloudflare's CDN layer will now see `Surrogate-Control: no-store` and `CDN-Cache-Control: no-store` and will stop caching the SPA shell for apartments and villas routes
- Every request to `/en/apartments`, `/nl/apartments` etc. will always get a fresh `index.html` with the correct current JS bundle filename
- No more "redirects to homepage" immediately after a deployment
- This matches the "Golden Trio" standard already documented in the project memory and already applied in `public/_headers`

### Files Changed

| File | Change |
|------|--------|
| `functions/_middleware.js` | Lines 100-101: Expand `Cache-Control` value + add `Surrogate-Control` and `CDN-Cache-Control` headers to Rule 3 |

### No Other Changes Needed

The `public/_headers` file already has the correct Golden Trio for all apartment/villa paths and for `/index.html`. The middleware `index.html` exception (lines 126-138) is also correctly set. **The only gap is Rule 3 missing two headers.**

### Testing After Deploy

Once pushed to GitHub → Cloudflare:
1. Visit `www.delsolprimehomes.com/en/apartments` immediately after deploy completes
2. It should load the apartments page without any redirect
3. To verify the headers are being set, open browser DevTools → Network tab → click the `/en/apartments` request → check Response Headers for `Surrogate-Control: no-store` and `CDN-Cache-Control: no-store`
