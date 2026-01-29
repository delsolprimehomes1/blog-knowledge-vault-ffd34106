# Sync Sitemap Generation with 410 Gone URLs System

## ✅ COMPLETED - January 29, 2026

All sitemap generation methods now filter out URLs marked in the `gone_urls` table.

---

## Implementation Summary

### Files Modified

| File | Status | Changes |
|------|--------|---------|
| `supabase/functions/regenerate-sitemap/index.ts` | ✅ Done | Added `gone_urls` fetching and filtering for all content types |
| `src/hooks/useSitemapData.ts` | ✅ Done | Added `fetchGoneUrls()` helper, all fetch functions accept goneUrls param |
| `src/pages/Sitemap.tsx` | ✅ Done | Displays 410 Gone count and info banner |

---

## Technical Details

### Edge Function Changes
- Fetches all `gone_urls` at start of sitemap generation
- Filters each content type (blog, qa, locations, comparisons) against gone paths
- Logs exclusion counts for audit: `🚫 Total 410 Gone excluded: X`
- Returns both `excluded_redirects` and `excluded_gone` stats in response

### Frontend Hook Changes
- New `fetchGoneUrls()` function with pagination support
- All fetch functions (`fetchAllArticles`, `fetchAllQAPages`, etc.) accept optional `goneUrls` Set
- Content filtered client-side before being added to sitemap

### Admin UI Changes
- Added 410 Gone count to stats grid with distinctive red styling
- Info banner explaining automatic exclusion when gone URLs exist
- Filter applied during sitemap download generation

---

## Path Matching Patterns

| Content Type | Path Format |
|--------------|-------------|
| Blog | `/{lang}/blog/{slug}` |
| Q&A | `/{lang}/qa/{slug}` |
| Comparisons | `/{lang}/compare/{slug}` |
| Locations | `/{lang}/locations/{city_slug}/{topic_slug}` |

---

## Expected Behavior

1. **Sitemap Regeneration** (edge function): Excludes all paths in `gone_urls`
2. **Admin Sitemap Page**: Downloads exclude `gone_urls` paths
3. **Build Script**: Already had filtering (unchanged)

No conflicting signals will be sent to Google - sitemaps and 410 responses are now in sync.
