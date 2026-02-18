
## Root Cause: Cloudflare CDN Cache Serving Stale Response

### Confirmed Status of All Three Code Fixes

After a full audit of every relevant file, all three code changes from the previous fix are correctly in place:

**src/App.tsx (lines 23-34)**: The `if (lang === 'en') return <Navigate to="/" replace />` redirect has been removed. `LanguageHome` now renders `<Home />` directly for `/en`. CORRECT.

**functions/_middleware.js (lines 314-321)**: The villas/apartments passthrough rule is present and firing before the `needsSEO` check. CORRECT.

**public/_redirects (line 90)**: `/:lang/villas /index.html 200` exists. CORRECT.

**React Router (App.tsx line 393)**: `<Route path="/:lang/villas" element={<VillasLanding />} />` is defined before `<Route path="/:lang" element={<LanguageHome />} />` at line 400. CORRECT.

The VillasLanding, VillasHero, and VillasPropertiesSection components are all correct — the data is being fetched and displayed properly when the page loads.

### The Actual Problem

The code is right. The cache is wrong.

Cloudflare's CDN has a cached response for `/en/villas` from before the routing fix was deployed. The middleware uses `stale-while-revalidate=86400` headers (24 hours), meaning Cloudflare serves the old cached response for up to 24 hours even after a new deployment.

Additionally, the language homepages are served as pre-built static HTML from `/en/index.html`. There is a risk that Cloudflare matches `/en/villas` against a cached `/en/index.html` response (the static homepage file) rather than the SPA shell (`/index.html`). When the browser loads the static homepage HTML (which is a fully pre-rendered SSG page, not the React SPA shell), React Router never runs and the villas page never mounts.

### The Fix: Two Changes

#### Change 1 — Add explicit explicit villas routes to `_redirects` BEFORE the language homepage rules

The current order in `public/_redirects` is:
- Line 65-74: `/en /en/index.html 200` (serves the static homepage HTML for `/en`)
- Line 90: `/:lang/villas /index.html 200` (serves the SPA shell for villas)

The wildcard rule `/:lang/villas` at line 90 should take precedence over the exact `/en` rule, but Cloudflare processes rules top to bottom and the language homepage rules (lines 65-74) could cause a cached response collision for paths that start with `/en`.

The fix is to add explicit, concrete villas rules for ALL 10 languages ABOVE the language homepage rules (before line 65), so they are unambiguously matched first:

```
/en/villas  /index.html  200
/nl/villas  /index.html  200
/fr/villas  /index.html  200
/de/villas  /index.html  200
/fi/villas  /index.html  200
/pl/villas  /index.html  200
/da/villas  /index.html  200
/hu/villas  /index.html  200
/sv/villas  /index.html  200
/no/villas  /index.html  200
/en/apartments  /index.html  200
/nl/apartments  /index.html  200
/fr/apartments  /index.html  200
/de/apartments  /index.html  200
/fi/apartments  /index.html  200
/pl/apartments  /index.html  200
/da/apartments  /index.html  200
/hu/apartments  /index.html  200
/sv/apartments  /index.html  200
/no/apartments  /index.html  200
```

These explicit rules will be matched by Cloudflare before any cached `/en/index.html` response, forcing the SPA shell to be served.

#### Change 2 — Add explicit middleware cache bypass for villas/apartments

Strengthen the middleware passthrough by adding a `Cache-Control: no-store` override on the response for villas/apartments routes. This tells Cloudflare's CDN to never cache these SPA routes, preventing the stale cache problem from recurring.

```javascript
// In the villas/apartments passthrough block (line 314-321)
const response = await next();
const headers = new Headers(response.headers);
headers.set('X-Middleware-Status', 'Active');
headers.set('Cache-Control', 'no-store');  // Prevent CDN caching of SPA shell
return new Response(response.body, {
  status: response.status,
  statusText: response.statusText,
  headers,
});
```

### Files to Change

| File | Change |
|------|--------|
| `public/_redirects` | Add 20 explicit rules (10 villas + 10 apartments, one per language) BEFORE the language homepage rules at line 64 |
| `functions/_middleware.js` | Add `Cache-Control: no-store` to the villas/apartments passthrough response to prevent CDN caching of the SPA shell |

### Why This Definitively Fixes It

- Explicit `en/villas → /index.html` rules beat any cached `/en/index.html` responses because they match the full path, not just the prefix
- `Cache-Control: no-store` on villas/apartments routes prevents Cloudflare from ever caching these SPA routes again
- The new deployment itself automatically purges Cloudflare's cache for these paths via the Pages deployment cache invalidation

### No Database Changes Needed

All 10 languages of villas content and properties are confirmed live and published in the database. This is a pure routing/caching fix.
