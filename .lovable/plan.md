
## New Page: `/:lang/listings` — Apartments-Only Landing Page

### What This Creates

A completely new, standalone landing page at `/:lang/listings` for all 10 language variants (en, nl, fr, de, fi, pl, da, hu, sv, no). It mirrors the visual layout of the apartments page but is entirely independent — separate file, separate route, separate URL, separate cache rules — so it can go live immediately without touching or risking the existing `/apartments` page.

The page will show: Logo header with language switcher → Hero section → Apartments properties grid → Footer + Lead form modal.

---

### Files to Create

**1. `src/pages/listings/ListingsLanding.tsx`** — New page component

Cloned from `ApartmentsLanding.tsx` with these key differences:
- Imports `ApartmentsHero` and `ApartmentsPropertiesSection` (apartments content, no villas section)
- All internal references use `/listings` instead of `/apartments`
- The `canonical` and `hreflang` URLs point to `/{lang}/listings`
- Language selector navigates to `/{lang}/listings`
- Meta title/description fetched from `apartments_page_content` (same database table, reusing existing published content — no new database needed)
- Header has a single "View Listings" button (no villas button needed)

---

### Files to Modify

**2. `src/App.tsx`** — Register the new routes

Add a lazy import and two new routes, placed alongside the existing apartments routes:

```tsx
const ListingsLanding = lazy(() => import("./pages/listings/ListingsLanding"));

// In the Routes section, after the apartments route:
<Route path="/listings" element={<Navigate to="/en/listings" replace />} />
<Route path="/:lang/listings" element={<ListingsLanding />} />
```

**3. `public/_redirects`** — Tell Cloudflare to serve SPA shell for the new paths

Add 10 explicit rules (same pattern used for apartments):
```
/en/listings  /index.html  200
/nl/listings  /index.html  200
... (all 10 languages)
```
These must be placed before the `/*  /index.html  200` catch-all at the bottom.

**4. `public/_headers`** — Add Golden Trio cache-busting rules for the new paths

Add 10 explicit no-store blocks (same Golden Trio as apartments):
```
/en/listings
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Surrogate-Control: no-store
  CDN-Cache-Control: no-store
... (all 10 languages)
```

Also bump the timestamp on line 1 to `2026-02-19T18:00:00Z` to force Cloudflare to re-parse the entire file and pick up the new rules.

**5. `functions/_middleware.js`** — Add `/listings` to the middleware intercept pattern

The existing Rule 3 intercepts `villas/properties` and `apartments`. The same rule needs to also match `listings` so the middleware sets the Golden Trio headers at the edge for all listing requests. This is a one-line regex change to the existing pattern.

---

### Why This Approach Is Safe

- Zero changes to the existing `/apartments` page, components, or database
- The new page reuses the existing `apartments_page_content` database table and `ApartmentsHero` / `ApartmentsPropertiesSection` components — no new database tables needed
- All 4 layers of cache protection are applied (middleware + `_headers` + `_redirects` + SPA route), matching the exact same architecture as apartments and villas
- The route is added before the `/:lang` wildcard in App.tsx so it won't conflict with language homepage routing

---

### Technical Summary

| Layer | Change |
|-------|--------|
| New page component | `src/pages/listings/ListingsLanding.tsx` |
| React Router | 2 new routes in `src/App.tsx` |
| Cloudflare redirects | 10 new rules in `public/_redirects` |
| Cloudflare cache headers | 10 new Golden Trio blocks in `public/_headers` |
| Middleware edge intercept | Pattern update in `functions/_middleware.js` |

After deploying to GitHub → Cloudflare, `www.delsolprimehomes.com/en/listings` will load the apartments-only landing page live with no redirect issues.
