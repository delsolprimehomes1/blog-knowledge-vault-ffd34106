

# Fix Missing SEO Tags on Buyers Guide Pages

## Problem Summary

The Buyers Guide page (`/:lang/buyers-guide`) has complete multilingual translations working client-side, but **search engines see the raw `index.html`** which has:
- `<html lang="en">` (always English, regardless of URL)
- Generic title: "Costa del Sol Real Estate | DelSolPrimeHomes"
- No meta description, canonical, hreflang, or OG tags

## Root Cause

The page is **not included** in either of the two SEO delivery mechanisms:

1. **Middleware** (`functions/_middleware.js`): Lines 20-31 define `SEO_ROUTE_PATTERNS` but `buyers-guide` is NOT included
2. **SSG Scripts**: No `generateStaticBuyersGuidePage.ts` exists to pre-render static HTML

## Solution: Two-Part Fix

### Part 1: Add Buyers Guide to Middleware SEO Patterns

Update `functions/_middleware.js` to route Buyers Guide URLs to the edge function:

```javascript
const SEO_ROUTE_PATTERNS = [
  // Location Hub
  new RegExp(`^/(${LANG_PATTERN})/locations/?$`),
  // Blog articles
  new RegExp(`^/(${LANG_PATTERN})/blog/[^/]+$`),
  // Q&A pages
  new RegExp(`^/(${LANG_PATTERN})/qa/[^/]+$`),
  // Comparison pages
  new RegExp(`^/(${LANG_PATTERN})/compare/[^/]+$`),
  // Location pages
  new RegExp(`^/(${LANG_PATTERN})/locations/[^/]+(/[^/]+)?$`),
  // ✅ ADD: Buyers Guide (all languages)
  new RegExp(`^/(${LANG_PATTERN})/buyers-guide/?$`),
];
```

### Part 2: Add Buyers Guide Handler to Edge Function

Update `supabase/functions/serve-seo-page/index.ts` to handle Buyers Guide routes:

1. Add path detection for `/buyers-guide`:
```typescript
// In the path parsing logic
if (contentPath === 'buyers-guide') {
  contentType = 'buyers-guide';
  slug = 'buyers-guide';
}
```

2. Add a new function to generate Buyers Guide HTML:
```typescript
function generateBuyersGuidePage(lang: string): Response {
  // Use the hardcoded translations from the codebase
  const translations = getBuyersGuideTranslations(lang);
  const locale = LOCALE_MAP[lang] || 'en_GB';
  
  // Generate hreflang tags for all 10 languages
  const hreflangTags = SUPPORTED_LANGUAGES.map(l => 
    `<link rel="alternate" hreflang="${l}" href="${BASE_URL}/${l}/buyers-guide" />`
  ).join('\n    ');
  
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.meta.title}</title>
  <meta name="description" content="${translations.meta.description}">
  <link rel="canonical" href="${BASE_URL}/${lang}/buyers-guide">
  
  ${hreflangTags}
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/buyers-guide">
  
  <meta property="og:locale" content="${locale}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${translations.meta.title}">
  <meta property="og:description" content="${translations.meta.description}">
  <meta property="og:url" content="${BASE_URL}/${lang}/buyers-guide">
  <meta property="og:site_name" content="Del Sol Prime Homes">
  <meta property="og:image" content="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${translations.meta.title}">
  <meta name="twitter:description" content="${translations.meta.description}">
  
  <!-- Fonts and redirect to React -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@400;700&display=swap">
  <script>
    // Allow search engines to see static HTML, then hydrate with React
    if (!navigator.userAgent.includes('bot')) {
      // Immediate navigation for real users
    }
  </script>
</head>
<body>
  <div id="root">
    <!-- Static content for SEO -->
    <h1>${translations.hero.headline} ${translations.hero.headlineHighlight}</h1>
    <p>${translations.hero.subheadline}</p>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }
  });
}
```

3. Embed the translations directly in the edge function (since we can't import from `src/`):

```typescript
const BUYERS_GUIDE_META: Record<string, { title: string; description: string }> = {
  en: {
    title: "Complete Buyers Guide to Costa del Sol Property | Del Sol Prime Homes",
    description: "Your comprehensive guide to buying property on the Costa del Sol. Step-by-step process, costs, legal requirements, and expert advice."
  },
  nl: {
    title: "Complete Gids voor het Kopen van Vastgoed aan de Costa del Sol | Del Sol Prime Homes",
    description: "Uw uitgebreide gids voor het kopen van onroerend goed aan de Costa del Sol. Stap-voor-stap proces, kosten, juridische vereisten en deskundig advies."
  },
  de: {
    title: "Vollständiger Käuferleitfaden für Immobilien an der Costa del Sol | Del Sol Prime Homes",
    description: "Ihr umfassender Leitfaden zum Immobilienkauf an der Costa del Sol. Schritt-für-Schritt-Prozess, Kosten, rechtliche Anforderungen und Expertenberatung."
  },
  // ... continue for all 10 languages
};
```

## Implementation Steps

| Step | File | Change |
|------|------|--------|
| 1 | `functions/_middleware.js` | Add `buyers-guide` regex to `SEO_ROUTE_PATTERNS` |
| 2 | `supabase/functions/serve-seo-page/index.ts` | Add path detection for `buyers-guide` |
| 3 | `supabase/functions/serve-seo-page/index.ts` | Add `BUYERS_GUIDE_META` translations object |
| 4 | `supabase/functions/serve-seo-page/index.ts` | Add `generateBuyersGuidePage()` function |
| 5 | `supabase/functions/serve-seo-page/index.ts` | Route `buyers-guide` requests to new handler |

## Expected HTML Output

For `/nl/buyers-guide`:
```html
<html lang="nl">
<head>
  <title>Complete Gids voor het Kopen van Vastgoed aan de Costa del Sol | Del Sol Prime Homes</title>
  <meta name="description" content="Uw uitgebreide gids voor het kopen van onroerend goed aan de Costa del Sol...">
  <link rel="canonical" href="https://www.delsolprimehomes.com/nl/buyers-guide">
  <link rel="alternate" hreflang="en" href="https://www.delsolprimehomes.com/en/buyers-guide">
  <link rel="alternate" hreflang="nl" href="https://www.delsolprimehomes.com/nl/buyers-guide">
  <!-- ... 8 more hreflang tags -->
  <link rel="alternate" hreflang="x-default" href="https://www.delsolprimehomes.com/en/buyers-guide">
  <meta property="og:locale" content="nl_NL">
  <!-- ... all OG and Twitter tags -->
</head>
```

## Validation After Implementation

1. **curl test**: `curl -s https://www.delsolprimehomes.com/nl/buyers-guide | head -50`
2. **View source**: Check `<html lang="nl">` and Dutch title
3. **Hreflang check**: Verify all 11 hreflang tags present
4. **Google Search Console**: Submit URLs for re-indexing

## Alternative Approach: SSG Pre-rendering

If you prefer static files over edge function, create `scripts/generateStaticBuyersGuide.ts` to generate:
- `dist/en/buyers-guide/index.html`
- `dist/nl/buyers-guide/index.html`
- ... (10 files total)

This matches the existing pattern for homepages and location hubs.

