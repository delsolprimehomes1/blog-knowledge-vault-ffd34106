

# Enhance Edge Function SSR with Branded Styling

## Overview

Upgrade the `serve-seo-page` edge function to use Del Sol Prime Homes branded styling while preserving all SEO metadata (hreflang, canonical, JSON-LD schemas, AEO/GEO).

## Current State vs Target

| Aspect | Current (Basic) | Target (Branded) |
|--------|-----------------|------------------|
| Fonts | system-ui only | Playfair Display + Lato |
| Colors | Hardcoded hex values | CSS variables with brand gold |
| Speakable box | Basic yellow gradient | Brand gold gradient with label |
| Header | Simple nav | Sticky header with shadow |
| Footer | Basic dark footer | Gold top border, proper branding |
| Typography | Generic sizing | Clamp-based responsive sizing |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/serve-seo-page/index.ts` | Update `generateSSRStyles()` and `generateArticleBody()` |

## Implementation Details

### Change 1: Update `generateSSRStyles()` (Lines 1281-1383)

Replace the existing CSS with branded styles matching the static page generator:

**Key CSS additions:**
- CSS custom properties (`:root { --prime-gold: 43 74% 49%; ... }`)
- Google Fonts preconnect and link for Playfair Display + Lato
- HSL-based color system using `hsl(var(--prime-gold))`
- Speakable box with `.speakable-box-label` element
- Sticky header with box-shadow
- Footer with gold top border
- Responsive typography with `clamp()`
- `.faq-item` cards with left border accent
- `.area-card` styling for location content
- Cost table styling with gold accents

```css
:root {
  --prime-gold: 43 74% 49%;
  --prime-gold-dark: 43 74% 40%;
  --prime-950: 220 20% 10%;
  --foreground: 220 20% 10%;
  --muted-foreground: 220 10% 45%;
  --background: 0 0% 100%;
}

body {
  font-family: 'Lato', system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: 'Playfair Display', Georgia, serif;
}
```

### Change 2: Update `generateArticleBody()` (Lines 1388-1504)

**Add to `<head>` section via new fonts parameter:**
- Google Fonts preconnect links
- Font stylesheet link for Playfair Display + Lato

**Update header structure:**
- Add sticky positioning
- Use brand logo from storage
- Add box-shadow for visual depth

**Update speakable box:**
- Add `.speakable-box` class with label
- Include "Quick Answer" label element

**Update CTA section:**
- Use brand gold button color
- Add hover transform effects

**Update footer:**
- Add gold top border (`border-top: 4px solid hsl(var(--prime-gold))`)
- Improve link hover states

### Change 3: Update `generateFullHtml()` (Lines 1507-1580)

Add Google Fonts preconnect and stylesheet links to the `<head>` section:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## What Stays the Same (SEO Preserved)

All of these remain untouched:

- `generateHreflangTags()` function
- `generateQAPageSchema()` function
- `generateBlogPostingSchema()` function
- `generateBreadcrumbSchema()` function
- `generateSpeakableSchema()` function
- `generateComparisonTableSchema()` function
- `generateArticleSchema()` function
- All canonical URL logic
- All metadata fetch functions
- All hreflang sibling resolution

## Technical Summary

```text
Before:
  Edge function → Basic sans-serif fonts → Hardcoded colors → Generic layout

After:
  Edge function → Playfair Display + Lato → CSS variables → Brand-consistent layout
                  ↓
              Same SEO metadata (hreflang, canonical, JSON-LD)
```

## CSS Color System

```css
--prime-gold: 43 74% 49%;      /* Brand gold #c9a227 */
--prime-gold-dark: 43 74% 40%; /* Darker gold for hovers */
--prime-950: 220 20% 10%;      /* Near-black for text */
--foreground: 220 20% 10%;     /* Main text color */
--muted-foreground: 220 10% 45%; /* Secondary text */
--background: 0 0% 100%;       /* White background */
```

## Verification Checklist

After deployment, test:

**Visual (Browser):**
- Logo appears in sticky header
- Playfair Display font on headings
- Lato font on body text
- Gold brand colors on buttons/accents
- Speakable box has "Quick Answer" label
- CTA button has gold gradient
- Footer has gold top border

**SEO (View Page Source):**
- Multiple `<link rel="alternate" hreflang="...">` tags present
- `<link rel="canonical">` tag present
- JSON-LD scripts for Place, RealEstateAgent, FAQPage, etc.
- Open Graph meta tags present

**Test URLs:**
- https://www.delsolprimehomes.com/en/locations/marbella
- https://www.delsolprimehomes.com/en/qa/any-qa-page
- https://www.delsolprimehomes.com/en/compare/any-comparison

## Expected Outcome

Location pages and other edge-function-served content will display with full Del Sol Prime Homes branding while maintaining complete SEO metadata for search engines and AI assistants.

