

# Sync Sitemap Generation with 410 Gone URLs System

## Problem Summary

The system has 3,512 URLs marked as permanently removed in the `gone_urls` table. However, the sitemap generation has an inconsistency:

- **Build script** (`scripts/generateSitemap.ts`): Already filters out `gone_urls` - working correctly
- **Edge function** (`supabase/functions/regenerate-sitemap/index.ts`): Does NOT filter `gone_urls` - **needs fix**
- **Frontend hook** (`src/hooks/useSitemapData.ts`): Does NOT filter `gone_urls` - **needs fix**

This means the admin "Regenerate Sitemaps" button creates conflicting signals for Google.

---

## Solution Architecture

### Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `supabase/functions/regenerate-sitemap/index.ts` | Add `gone_urls` fetching and filtering | Edge function sitemap generation |
| `src/hooks/useSitemapData.ts` | Add `gone_urls` exclusion to fetch functions | Frontend sitemap data |
| `src/pages/Sitemap.tsx` | Display excluded counts | Admin visibility |

---

## Implementation Details

### 1. Edge Function: Add Gone URLs Filtering

After fetching published content (around line 549), add:

```typescript
// Fetch gone URLs to exclude from sitemap
console.log('📥 Fetching gone URLs to exclude...');
const { data: goneUrlData } = await supabase
  .from('gone_urls')
  .select('url_path');

const goneUrlPaths = new Set((goneUrlData || []).map(g => g.url_path));
console.log(`   🚫 Gone URLs loaded: ${goneUrlPaths.size}`);
```

Then filter each content type:

```typescript
// Filter out gone URLs (in addition to redirects)
const articles = (rawArticles || []).filter(a => {
  if (a.is_redirect || a.redirect_to) return false;
  const path = `/${a.language}/blog/${a.slug}`;
  return !goneUrlPaths.has(path);
});

const qaPages = (rawQaPages || []).filter(q => {
  if (q.is_redirect || q.redirect_to) return false;
  const path = `/${q.language}/qa/${q.slug}`;
  return !goneUrlPaths.has(path);
});

const locationPages = (rawLocationPages || []).filter(l => {
  if (l.is_redirect || l.redirect_to) return false;
  const path = `/${l.language}/locations/${l.city_slug}/${l.topic_slug}`;
  return !goneUrlPaths.has(path);
});

const comparisonPages = (rawComparisonPages || []).filter(c => {
  if (c.is_redirect || c.redirect_to) return false;
  const path = `/${c.language}/compare/${c.slug}`;
  return !goneUrlPaths.has(path);
});
```

Add exclusion stats to logs:

```typescript
const excludedGone = {
  blog: rawArticles.filter(a => goneUrlPaths.has(`/${a.language}/blog/${a.slug}`)).length,
  qa: rawQaPages.filter(q => goneUrlPaths.has(`/${q.language}/qa/${q.slug}`)).length,
  locations: rawLocationPages.filter(l => goneUrlPaths.has(`/${l.language}/locations/${l.city_slug}/${l.topic_slug}`)).length,
  comparisons: rawComparisonPages.filter(c => goneUrlPaths.has(`/${c.language}/compare/${c.slug}`)).length,
};
console.log(`   🚫 Excluded due to 410 Gone: blog=${excludedGone.blog}, qa=${excludedGone.qa}, loc=${excludedGone.locations}, comp=${excludedGone.comparisons}`);
```

### 2. Frontend Hook: Add Gone URLs Filtering

Add a helper function to fetch gone URLs once:

```typescript
// Fetch all gone URL paths for filtering
export const fetchGoneUrls = async (): Promise<Set<string>> => {
  const allPaths: string[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("gone_urls")
      .select("url_path")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allPaths.push(...data.map(g => g.url_path));
    if (data.length < pageSize) break;
    page++;
  }

  return new Set(allPaths);
};
```

Modify each fetch function to accept and use the gone URLs set:

```typescript
export const fetchAllArticles = async (
  onProgress?: (fetched: number) => void,
  goneUrls?: Set<string>
): Promise<ArticleData[]> => {
  // ... existing pagination logic ...
  
  // Filter after each batch
  const filtered = goneUrls 
    ? data.filter(a => !goneUrls.has(`/${a.language}/blog/${a.slug}`))
    : data;
  allRecords.push(...(filtered as ArticleData[]));
  
  // ... rest of function
};
```

### 3. Sitemap Page: Display Exclusion Stats

Add new fields to the response data interface to show:
- Total gone URLs loaded
- URLs excluded per content type due to 410 status

---

## Expected Results After Implementation

| Metric | Before | After |
|--------|--------|-------|
| Gone URLs considered | 0 | 3,512 |
| Conflicting index/410 signals | Yes | No |
| Sitemap URL count drop | N/A | ~0 (most gone URLs are malformed legacy paths) |

**Note**: The current analysis shows most `gone_urls` entries have dates appended (e.g., `/en/blog/article-slug2025-11-03`) which don't match the clean database slugs. The filtering will still be valuable for:
1. Future 410 entries with correct paths
2. Preventing any accidental matches
3. Consistency across all sitemap generation methods

---

## Technical Notes

- The build script already implements this pattern correctly - we're mirroring it to the edge function
- Gone URL paths use the format: `/{lang}/{content-type}/{slug}`
- The edge function will log exclusion counts for audit purposes
- Edge function deployment will be automatic after code changes

