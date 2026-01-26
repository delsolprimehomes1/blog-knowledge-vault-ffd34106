
# Static Site Generation for Buyers Guide Pages

## Overview

This plan implements SSG (Static Site Generation) for the Buyers Guide pages across all 10 languages. This ensures perfect SEO compliance with server-rendered metadata in the raw HTML source, matching the pattern used for Homepage, Location Hub, Blog, and other content pillars.

## Current State

| Aspect | Status |
|--------|--------|
| Route handling | SPA fallback via `index.html` |
| `<html lang="">` | Set by inline JS (client-side) |
| Meta title/description | Client-side via React Helmet |
| Canonical URL | Client-side via React Helmet |
| Hreflang tags | Client-side via React Helmet |
| JSON-LD schema | Not implemented |
| View-source SEO | Incomplete - crawlers see generic template |

## Target State

| Aspect | After SSG |
|--------|-----------|
| Route handling | Static HTML files served directly |
| `<html lang="">` | Correct in raw HTML (e.g., `lang="de"`) |
| Meta title/description | Localized in raw HTML |
| Canonical URL | Self-referencing in raw HTML |
| Hreflang tags | All 11 tags in raw HTML |
| JSON-LD schema | WebPage + BreadcrumbList + SpeakableSpecification |
| View-source SEO | 100% compliant for all crawlers |

---

## Implementation Plan

### Step 1: Create SSG Script

**New file**: `scripts/generateStaticBuyersGuide.ts`

This script will:
1. Read production assets (CSS/JS hashes) from `dist/index.html`
2. Import localized content from `src/i18n/translations/buyersGuide/`
3. Generate 10 static HTML files with complete SEO metadata

**Key functions**:
- `getProductionAssets()` - Extract hashed asset paths from build
- `generateHreflangTags()` - Create all 11 hreflang link tags
- `generateJsonLdSchema()` - Create WebPage + Breadcrumb + Speakable JSON-LD
- `generateStaticHTML()` - Combine everything into complete HTML document

**Output structure**:
```text
dist/
├── en/buyers-guide/index.html  ← Static HTML with lang="en"
├── de/buyers-guide/index.html  ← Static HTML with lang="de"
├── nl/buyers-guide/index.html  ← Static HTML with lang="nl"
├── fr/buyers-guide/index.html  ← Static HTML with lang="fr"
├── sv/buyers-guide/index.html  ← Static HTML with lang="sv"
├── no/buyers-guide/index.html  ← Static HTML with lang="no"
├── da/buyers-guide/index.html  ← Static HTML with lang="da"
├── fi/buyers-guide/index.html  ← Static HTML with lang="fi"
├── pl/buyers-guide/index.html  ← Static HTML with lang="pl"
└── hu/buyers-guide/index.html  ← Static HTML with lang="hu"
```

### Step 2: HTML Template Structure

Each generated file will contain:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>Kompletter Käuferleitfaden für Costa del Sol Immobilien | Del Sol Prime Homes</title>
  <meta name="description" content="Ihr umfassender Leitfaden..." />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://www.delsolprimehomes.com/de/buyers-guide" />
  
  <!-- Hreflang Tags (11 total) -->
  <link rel="alternate" hreflang="en" href="https://www.delsolprimehomes.com/en/buyers-guide" />
  <link rel="alternate" hreflang="de" href="https://www.delsolprimehomes.com/de/buyers-guide" />
  <!-- ... 8 more languages ... -->
  <link rel="alternate" hreflang="x-default" href="https://www.delsolprimehomes.com/en/buyers-guide" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="de_DE" />
  <meta property="og:title" content="..." />
  <meta property="og:url" content="https://www.delsolprimehomes.com/de/buyers-guide" />
  
  <!-- JSON-LD Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "inLanguage": "de", ... },
      { "@type": "BreadcrumbList", ... },
      { "@type": "SpeakableSpecification", ... }
    ]
  }
  </script>
  
  <!-- Production Assets (hashed) -->
  <link rel="stylesheet" href="/assets/index-KtEB6bPX.css" />
</head>
<body>
  <div id="root">
    <!-- Static content for SEO crawlers -->
    <main class="static-buyers-guide">
      <h1>Kompletter Leitfaden zum Immobilienkauf an der Costa del Sol</h1>
      <p class="speakable-intro">...</p>
      <!-- Key sections rendered as static HTML -->
    </main>
  </div>
  <script type="module" src="/assets/index-BkQTAGQh.js"></script>
</body>
</html>
```

### Step 3: Update Build Pipeline

**File**: `build.sh`

Add the SSG script execution after other static page generators:

```bash
# Generate static buyers guide pages
echo "📖 Generating static buyers guide pages..."
npx tsx scripts/generateStaticBuyersGuide.ts dist
```

### Step 4: Update Redirects

**File**: `public/_redirects`

Add explicit rules to serve static HTML files for buyers-guide routes (before the SPA fallback):

```text
# Buyers Guide - serve SSG HTML
/:lang/buyers-guide  /:lang/buyers-guide/index.html  200
```

---

## JSON-LD Schema Structure

Each page will include a complete `@graph` with:

1. **WebPage** - Main page entity with `speakable` specification
2. **BreadcrumbList** - Home → Buyers Guide navigation
3. **HowTo** - Step-by-step buying process (8 steps)
4. **FAQPage** - Common questions section

---

## Technical Notes

### Translation Import Strategy

The script will import translations directly from the TypeScript source files using `tsx` runtime, avoiding the need for separate JSON files.

### Asset Path Extraction

Following the established pattern from `generateStaticLocationHub.ts`:
```typescript
function getProductionAssets(distDir: string): ProductionAssets {
  const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');
  const css = indexHtml.match(/href="(\/assets\/[^"]+\.css)"/g);
  const js = indexHtml.match(/src="(\/assets\/[^"]+\.js)"/g);
  return { css, js };
}
```

### Locale Mapping

Standard OG locale codes:
```typescript
const LOCALE_MAP = {
  en: 'en_GB', de: 'de_DE', fr: 'fr_FR', nl: 'nl_NL',
  sv: 'sv_SE', no: 'nb_NO', da: 'da_DK', fi: 'fi_FI',
  pl: 'pl_PL', hu: 'hu_HU'
};
```

---

## Validation Checklist

After deployment, verify each language version:

- [ ] `curl -s https://www.delsolprimehomes.com/de/buyers-guide | head -20` shows `<html lang="de">`
- [ ] View-source contains all 11 hreflang tags
- [ ] View-source contains localized meta title/description
- [ ] View-source contains self-referencing canonical URL
- [ ] View-source contains JSON-LD schema with correct `inLanguage`
- [ ] React hydration works (page is interactive)
- [ ] Language switcher navigates correctly

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `scripts/generateStaticBuyersGuide.ts` | Create | SSG script |
| `build.sh` | Modify | Add script execution |
| `public/_redirects` | Modify | Add static file routing |

---

## Rollback Plan

If issues occur:
1. Remove the `npx tsx scripts/generateStaticBuyersGuide.ts` line from `build.sh`
2. Remove the `/:lang/buyers-guide` rule from `_redirects`
3. Buyers Guide falls back to SPA routing (current state)
