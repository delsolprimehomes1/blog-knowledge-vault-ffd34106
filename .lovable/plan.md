

# 404 Resolution Dashboard

## Problem Analysis

Based on database analysis, the 5,209 URLs in `gone_urls` break down into three distinct categories:

| Category | Count | Root Cause |
|----------|-------|------------|
| Malformed URLs (date appended) | 4,159 | Copy-paste errors appending dates like `2025-12-29` to slugs |
| Language Mismatches | ~214 | Content exists but URL uses wrong language prefix (e.g., `/de/blog/norwegian-slug`) |
| Truly Missing | ~836 | Content genuinely deleted or never existed |

These issues are causing the GSC errors:
- 3,096 "Not found (404)"
- 884 "Duplicate without user-selected canonical"
- 1,132 "Soft 404"

---

## Solution: 404 Resolution Dashboard

**Location:** `/admin/404-resolver`  
**Navigation:** SEO & Health section

### Features

1. **Issue Summary Cards**
   - Total 404s in database
   - Malformed URLs (date patterns)
   - Language mismatches (fixable with redirect)
   - Truly missing (should remain 410)

2. **Three Resolution Tabs**

   **Tab 1: Malformed URL Cleanup**
   - Detect URLs matching `[0-9]{4}-[0-9]{2}-[0-9]{2}$` pattern
   - Preview affected URLs
   - One-click bulk delete to remove from `gone_urls`
   - These URLs should NOT return 410 - they were never valid

   **Tab 2: Language Mismatch Resolver**
   - Cross-reference URLs against `blog_articles` and `qa_pages`
   - Identify where content exists but with different language
   - Show: URL path | URL language | Actual language | Correct URL
   - Options:
     - Remove from `gone_urls` (let serve-seo-page handle redirect)
     - Or add 301 redirect entry to `redirects` table

   **Tab 3: Confirmed 410s**
   - URLs that are truly gone (no matching content anywhere)
   - Keep in `gone_urls` for proper 410 response
   - Option to review and potentially restore

3. **Bulk Actions**
   - Delete all malformed URLs (one click)
   - Auto-fix all language mismatches
   - Export each category to CSV

---

## Technical Implementation

### New Files

```text
src/
  pages/admin/
    NotFoundResolver.tsx           # Main page component
  components/admin/
    not-found-resolver/
      ResolverSummaryCards.tsx     # Stats overview
      MalformedUrlsTab.tsx         # Date-appended cleanup
      LanguageMismatchTab.tsx      # Language fix table
      ConfirmedGoneTab.tsx         # True 410s review
  hooks/
    useNotFoundAnalysis.ts         # Analysis queries
```

### Detection Queries

**Malformed URLs:**
```sql
SELECT id, url_path, created_at
FROM gone_urls
WHERE url_path ~ '[0-9]{4}-[0-9]{2}-[0-9]{2}$'
ORDER BY created_at DESC
```

**Language Mismatches:**
```sql
WITH parsed AS (
  SELECT 
    id, url_path,
    SUBSTRING(url_path FROM '^/([a-z]{2})/') as url_lang,
    CASE 
      WHEN url_path ~ '/qa/' THEN 'qa'
      WHEN url_path ~ '/blog/' THEN 'blog'
    END as content_type,
    REGEXP_REPLACE(url_path, '^/[a-z]{2}/(qa|blog)/', '') as slug
  FROM gone_urls
  WHERE url_path ~ '^/[a-z]{2}/(qa|blog)/'
)
SELECT 
  p.id, p.url_path, p.url_lang, p.content_type, p.slug,
  COALESCE(b.language, q.language) as actual_language
FROM parsed p
LEFT JOIN blog_articles b ON b.slug = p.slug AND b.status = 'published'
LEFT JOIN qa_pages q ON q.slug = p.slug AND q.status = 'published'
WHERE (b.language IS NOT NULL AND b.language != p.url_lang)
   OR (q.language IS NOT NULL AND q.language != p.url_lang)
```

**Truly Missing (remainder):**
```sql
-- URLs not matching malformed pattern AND not language mismatches
-- These are genuinely gone content
```

### Resolution Actions

**For Malformed URLs:**
- Delete from `gone_urls` table
- These were never valid pages

**For Language Mismatches:**
- Delete from `gone_urls` to let normal routing handle them
- The `serve-seo-page` edge function already has redirect logic for location pages
- Need to extend this to blog/qa content types

**For Truly Missing:**
- Keep in `gone_urls`
- Ensure proper 410 response

---

## Edge Function Enhancement

The `serve-seo-page` function already handles language redirects for location pages (lines 376-398). We need to extend this pattern to blog and QA pages:

```typescript
// If not found with language match, check if it exists in another language
if (!data && !error) {
  const anyLangResult = await supabase
    .from('blog_articles')
    .select('language, canonical_url, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  
  if (anyLangResult.data) {
    return 301 redirect to correct language version
  }
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/NotFoundResolver.tsx` | Create | Main 404 resolution page |
| `src/components/admin/not-found-resolver/ResolverSummaryCards.tsx` | Create | Stats cards |
| `src/components/admin/not-found-resolver/MalformedUrlsTab.tsx` | Create | Date cleanup tab |
| `src/components/admin/not-found-resolver/LanguageMismatchTab.tsx` | Create | Language fix tab |
| `src/components/admin/not-found-resolver/ConfirmedGoneTab.tsx` | Create | True 410s tab |
| `src/hooks/useNotFoundAnalysis.ts` | Create | Analysis queries |
| `supabase/functions/serve-seo-page/index.ts` | Modify | Add blog/QA language redirect logic |
| `src/components/AdminLayout.tsx` | Modify | Add navigation item |
| `src/App.tsx` | Modify | Add route |

---

## Expected Outcomes

| Category | Before | After |
|----------|--------|-------|
| Malformed URLs (date) | 4,159 | 0 (deleted - never valid) |
| Language mismatches | 214 | 0 (auto-redirect to correct lang) |
| True 410s | ~836 | ~836 (properly marked gone) |
| GSC 404 errors | 3,096 | Significantly reduced |

---

## Admin Navigation

Add to "SEO & Health" section:
```typescript
{ name: "404 Resolver", href: "/admin/404-resolver", icon: AlertTriangle }
```

---

## Workflow

```text
1. Open 404 Resolver Dashboard
   ↓
2. Review Summary Cards
   - 4,159 malformed, 214 mismatches, 836 true 410s
   ↓
3. Tab 1: Malformed Cleanup
   - Preview 4,159 date-appended URLs
   - Click "Delete All Malformed"
   ↓
4. Tab 2: Language Mismatches
   - Review 214 URLs with wrong language prefix
   - Click "Fix All Mismatches" (removes from gone_urls)
   - Edge function handles redirects automatically
   ↓
5. Tab 3: Confirmed 410s
   - Review remaining ~836 truly gone URLs
   - Keep these for proper 410 response
   ↓
6. Regenerate sitemaps
7. Ping IndexNow
8. Monitor GSC for improvements
```

---

## UI Design Notes

- Follow existing admin patterns from `GoneURLsManager.tsx` and `DuplicateDetector.tsx`
- Use Tab-based layout for three categories
- Summary cards at top showing issue breakdown
- Tables with search/filter for each category
- Bulk action buttons with confirmation dialogs
- Progress indicators for large batch operations
- Toast notifications for success/error states

