
## Three Changes in One Deployment

### What the Current State Shows

After reading all relevant files, here is exactly what exists today:

**`src/App.tsx` (lines 20-34):** `LanguageHome` renders `<Home />` directly for all valid languages including `en`. There is no redirect from `/en` back to `/`. The user wants `/en` to redirect to `/` (so the homepage URL stays clean), but `/en/villas` and `/en/apartments` must NOT be affected. This requires adding `useLocation` to the import and doing an exact-path check inside `LanguageHome`.

**`public/_redirects` (lines 111-112):** Two duplicate wildcard rules remain:
- `/:lang/apartments /index.html 200`
- `/:lang/villas /index.html 200`

These are exact duplicates of the 20 explicit rules already at lines 65-84. They create routing ambiguity and must be removed.

**`public/_headers`:** The file already exists with sitemap, robots.txt, Q&A, and JSON rules. The 20 villas/apartments `Cache-Control: no-store` rules need to be appended to it. The file does NOT already have these rules — this is a new addition.

**`functions/_middleware.js` (line 95):** The early villas/apartments passthrough is already correctly positioned at Rule 3, before the static file check. No changes needed here.

### Change 1 — `src/App.tsx`: Add exact-path redirect for `/en`

Add `useLocation` to the React Router import (it is not currently imported). Update `LanguageHome` to check `location.pathname === '/en'` before redirecting:

```typescript
// Add useLocation to imports (line 6)
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

// Updated LanguageHome (lines 20-34)
const LanguageHome = () => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();

  // Redirect /en exactly to / for clean homepage URL
  // Does NOT affect /en/villas or /en/apartments (different routes entirely)
  if (lang === 'en' && location.pathname === '/en') {
    return <Navigate to="/" replace />;
  }

  const isValidLang = lang && SUPPORTED_LANGUAGES.includes(lang as typeof SUPPORTED_LANGUAGES[number]);

  if (!isValidLang) {
    return <NotFound />;
  }

  return <Home />;
};
```

Note: `/en/villas` and `/en/apartments` are handled by their own dedicated routes (`<Route path="/:lang/villas" />` etc.) in the router and never hit `LanguageHome` at all — so this redirect is truly safe.

### Change 2 — `public/_redirects`: Remove duplicate wildcard rules (lines 111-112)

Delete lines 111-112:
```
/:lang/apartments  /index.html  200
/:lang/villas      /index.html  200
```

The 20 explicit language-specific rules at lines 65-84 already handle all 10 languages for both villas and apartments. The wildcard duplicates at lines 111-112 add ambiguity and serve no purpose.

### Change 3 — `public/_headers`: Add cache bypass for all villas/apartments paths

Append 20 new path rules to the existing `public/_headers` file. This operates at the Cloudflare CDN level — before any middleware or `_redirects` processing — and forces Cloudflare to never serve a stale cached version of these SPA routes:

```text
# Villas/Apartments SPA routes - prevent CDN caching of stale static HTML
/en/villas
  Cache-Control: no-store, no-cache, must-revalidate
/nl/villas
  Cache-Control: no-store, no-cache, must-revalidate
... (all 10 languages for both /villas and /apartments)
```

### Files Changed

| File | What Changes |
|------|-------------|
| `src/App.tsx` | Add `useLocation` import; add exact `/en` path check in `LanguageHome` |
| `public/_redirects` | Remove lines 111-112 (duplicate wildcard rules) |
| `public/_headers` | Append 20 villas/apartments cache-control rules |

### Why These Changes Are Safe Together

- The `/en` redirect in `App.tsx` only fires when `location.pathname === '/en'` exactly. The `/en/villas` route is a completely separate `<Route>` in the router tree and never renders `LanguageHome`.
- Removing the duplicate `_redirects` rules does not change behavior — the explicit rules at lines 65-84 already match identically.
- The `_headers` additions only apply to the 20 specific villas/apartments paths — they have no effect on any other route.

### No Changes Needed

- `functions/_middleware.js` — Rule 3 villas passthrough is already correctly positioned at line 95
- React Router route order in `App.tsx` — `/:lang/villas` already comes before `/:lang`
- Database — all content confirmed published in previous audit
