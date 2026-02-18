
## Root Cause: Cloudflare Ignoring Cache-Control on Apartments Routes

### What's Happening

The live site at `www.delsolprimehomes.com/en/apartments` is serving the old cached HTML from before the Villas section was added. Cloudflare is ignoring the `no-cache` directives because the apartments entries in `public/_headers` are **incomplete** compared to the villas entries.

Compare the two sets of rules in `public/_headers`:

Villas routes (working correctly — Cloudflare respects these):
```
/en/villas/properties
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Surrogate-Control: no-store
  CDN-Cache-Control: no-store
```

Apartments routes (broken — missing the Cloudflare-specific directives):
```
/en/apartments
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

Cloudflare's CDN does **not** reliably respect the standard HTTP `Cache-Control` header. It requires its own proprietary directives:
- `Surrogate-Control: no-store` — tells the Cloudflare edge to never cache this resource
- `CDN-Cache-Control: no-store` — Cloudflare's preferred override for CDN-layer caching

Without these two directives, Cloudflare caches the HTML regardless of `Cache-Control`, which is why the old "View Properties" button is still showing on the live site even after a cache purge.

### The Fix

Update `public/_headers` to add the missing `Surrogate-Control` and `CDN-Cache-Control` directives to all 10 apartment language routes, making them identical in structure to the villas routes.

### Files to Change

**`public/_headers`** — Lines 82–101

Change each apartment language entry from:
```
/en/apartments
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

To:
```
/en/apartments
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Surrogate-Control: no-store
  CDN-Cache-Control: no-store
```

This will be applied to all 10 language variants: `en`, `nl`, `fr`, `de`, `fi`, `pl`, `da`, `hu`, `sv`, `no`.

### Why This Works

Once these headers are deployed (published), Cloudflare will:
1. Receive the updated `_headers` file
2. Recognize `CDN-Cache-Control: no-store` and immediately stop caching the apartments page HTML
3. Serve the fresh `index.html` on every request, which contains the new React bundle with both "View Apartments" and "View Villas" buttons and the full Villas section

No further Cloudflare cache purges will be needed — the directives prevent caching at the edge going forward.

### No Code Changes Needed

The React code in `ApartmentsLanding.tsx` is already correct and complete. This is purely a Cloudflare cache configuration fix in `public/_headers`.

### After Deployment

The live page at `www.delsolprimehomes.com/en/apartments` will show:
- Header with "View Apartments" (outline button) and "View Villas" (gold button)
- Apartments properties section (`#apartments-section`)
- Villas properties section below (`#villas-section`)
- Lead capture modals for both property types
