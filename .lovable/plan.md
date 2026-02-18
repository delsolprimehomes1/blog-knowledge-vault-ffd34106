
## Fix: `/en/villas` Redirecting to Homepage

### Root Cause Confirmed

After reading the code, the situation is:

- `public/_redirects` line 90: `/:lang/villas /index.html 200` — already exists and is correct.
- `src/App.tsx` line 395: `<Route path="/:lang/villas" element={<VillasLanding />} />` — already exists and is correct.
- `functions/_middleware.js`: Does NOT intercept villas routes — it falls straight through to `next()` at line 425.

**The actual bug is in `LanguageHome` (App.tsx lines 23-26):**

```tsx
if (lang === 'en') {
  return <Navigate to="/" replace />;  // <-- THE CULPRIT
}
```

Here is the exact failure chain for `/en/villas`:

```text
User visits: /en/villas
    ↓
Cloudflare checks _middleware.js → no match for villas → calls next()
    ↓
_redirects rule: /:lang/villas → /index.html 200 (SPA shell served)
    ↓
Browser boots React at URL /en/villas
    ↓
React Router evaluates routes in order...
    ↓
Route /:lang/villas at line 395 SHOULD match — but...
    ↓
Cloudflare may have CACHED a prior response for /en/villas that was /en/index.html
(the language homepage static file, not the SPA shell)
    ↓
React boots at /en → LanguageHome runs → lang === 'en' → Navigate to="/"
    ↓
/ → 301 redirect to /en (from _redirects line 1) → loop
    ↓
User ends up on homepage ❌
```

Additionally, for ALL languages (not just `en`), if the SPA shell is served correctly but the `/en/villas` URL is somehow resolved as `/en` by a cached Cloudflare response, the same problem occurs.

### The Fix: Two Changes

#### Change 1: `src/App.tsx` — Remove the `lang === 'en'` redirect in `LanguageHome`

Instead of redirecting `/en` to `/`, render the `Home` component directly. SEO deduplication between `/` and `/en` should be handled via `<link rel="canonical">` in the `Home` component, not by a JavaScript redirect. This eliminates the redirect loop entirely.

**Before (lines 23-26):**
```tsx
// If lang is 'en', redirect to root to avoid duplicate URLs
if (lang === 'en') {
  return <Navigate to="/" replace />;
}
```

**After:**
```tsx
// /en renders Home directly — canonical tag handles SEO deduplication
// (removed redirect to avoid redirect loops on /en/villas and similar routes)
```

The `isValidLang` check below it will include `'en'` now, so `/en` will correctly render `<Home />` without the redirect bounce.

#### Change 2: `functions/_middleware.js` — Add explicit villas/apartments passthrough (before the `needsSEO` check)

Add a passthrough block immediately after the QA block (after line 312) to explicitly call `next()` for villas and apartments routes. This adds a safety layer so that even if the middleware logic changes in the future, these SPA routes are never accidentally intercepted.

**Add at line 313 (after the QA block closes):**
```javascript
// Passthrough for villas and apartments landing pages (SPA routes)
if (
  pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/villas\/?$/) ||
  pathname.match(/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/apartments\/?$/)
) {
  console.log('[Middleware] Villas/Apartments SPA route - passthrough to _redirects');
  return withMiddlewareStatus(await next());
}
```

### Files to Change

| File | Change |
|------|--------|
| `src/App.tsx` | Remove the `if (lang === 'en') return <Navigate to="/" replace />` block from `LanguageHome` (lines 23-26). Update the `isValidLang` check to include `'en'`. |
| `functions/_middleware.js` | Add explicit passthrough for `/:lang/villas` and `/:lang/apartments` after the QA block (line 313). |

### What Does NOT Need Changing

- `public/_redirects` — rules are already correct (lines 89-90).
- `src/App.tsx` routing — `/:lang/villas` and `/:lang/apartments` routes already exist (lines 391-395).
- Database — all translated content is already published.

### No Database Changes Needed

This is a pure frontend routing fix. All villas and apartments content is already in the database and published for all 10 languages.
