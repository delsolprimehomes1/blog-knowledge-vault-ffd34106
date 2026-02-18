
## /villas → /villas/properties Migration: All 7 Files in One Deployment

### What Is Changing and Why

The public-facing URL for the Villas landing page is being renamed from `/:lang/villas` to `/:lang/villas/properties`. The old URLs will continue to work via 301 redirects (good for SEO and bookmarks). All 7 files are changed in a single deployment so there is no window where the route and redirects are out of sync.

The trailing-slash workaround (`/en/villas → /en/villas/`) that was added to bypass the stale Cloudflare cache is being **replaced** by the redirect to `/villas/properties`. Since `/en/villas/properties` is a brand-new path that Cloudflare has never cached, it will be served fresh without needing the trailing-slash trick.

---

### File-by-File Changes

**1. `src/App.tsx` — 2 line changes**

```tsx
// FROM:
<Route path="/villas" element={<Navigate to="/en/villas" replace />} />
<Route path="/:lang/villas" element={<VillasLanding />} />

// TO:
<Route path="/villas" element={<Navigate to="/en/villas/properties" replace />} />
<Route path="/:lang/villas/properties" element={<VillasLanding />} />
```

**2. `src/pages/villas/VillasLanding.tsx` — 4 line changes**

```tsx
// Canonical URL (line 61):
const canonical = `${BASE_URL}/${language}/villas/properties`;

// hreflang loop (line 70):
href={`${BASE_URL}/${l}/villas/properties`}

// x-default hreflang (line 72):
href={`${BASE_URL}/en/villas/properties`}

// Language switcher (line 91):
onLanguageChange={(lang) => navigate(`/${lang}/villas/properties`)}
```

**3. `src/pages/admin/VillasPageContent.tsx` — 1 line change (line 135)**

```tsx
href={`https://www.delsolprimehomes.com/${selectedLang}/villas/properties`}
```

**4. `src/pages/admin/VillasProperties.tsx` — 1 line change (line 214)**

```tsx
href={`https://www.delsolprimehomes.com/${lang}/villas/properties`}
```

**5. `public/_redirects` — Replace 20 villas rules (lines 65–85)**

The current trailing-slash workaround block is replaced entirely with:

```
# Old /villas URLs → 301 to /villas/properties (SEO continuity)
/en/villas  /en/villas/properties  301
/nl/villas  /nl/villas/properties  301
/fr/villas  /fr/villas/properties  301
/de/villas  /de/villas/properties  301
/fi/villas  /fi/villas/properties  301
/pl/villas  /pl/villas/properties  301
/da/villas  /da/villas/properties  301
/hu/villas  /hu/villas/properties  301
/sv/villas  /sv/villas/properties  301
/no/villas  /no/villas/properties  301
# New /villas/properties URLs → serve SPA
/en/villas/properties  /index.html  200
/nl/villas/properties  /index.html  200
/fr/villas/properties  /index.html  200
/de/villas/properties  /index.html  200
/fi/villas/properties  /index.html  200
/pl/villas/properties  /index.html  200
/da/villas/properties  /index.html  200
/hu/villas/properties  /index.html  200
/sv/villas/properties  /index.html  200
/no/villas/properties  /index.html  200
```

The old `/en/villas/ → /index.html 200` trailing-slash rules are removed entirely (no longer needed).

**6. `public/_headers` — 10 path key changes (lines 42–61)**

All 10 path keys updated:
```
/en/villas/properties
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
/nl/villas/properties
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
... (same for all 10 languages)
```

**7. `functions/_middleware.js` — 1 regex change (line 95)**

```js
// FROM:
const villaPath = url.pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/(villas|apartments)\/?$/);

// TO:
const villaPath = url.pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/(villas\/properties|apartments)\/?$/);
```

---

### Technical Summary

| File | Lines Changed | Change Type |
|------|--------------|-------------|
| `src/App.tsx` | 396–397 | Route path update |
| `src/pages/villas/VillasLanding.tsx` | 61, 70, 72, 91 | URL string update |
| `src/pages/admin/VillasPageContent.tsx` | 135 | Admin link update |
| `src/pages/admin/VillasProperties.tsx` | 214 | Admin link update |
| `public/_redirects` | 65–85 | Replace 20 rules with new pattern |
| `public/_headers` | 42–61 | Update 10 path keys |
| `functions/_middleware.js` | 95 | Regex update |

### Why the Trailing-Slash Workaround Is No Longer Needed

The trailing-slash trick (`/en/villas → /en/villas/`) was only needed because Cloudflare had a stale cached HTML file at the exact path `/en/villas`. The new path `/en/villas/properties` has never been cached by Cloudflare, so it will be processed fresh by the `_redirects` rules and serve the correct `index.html` on the first request — no cache bypass needed.
