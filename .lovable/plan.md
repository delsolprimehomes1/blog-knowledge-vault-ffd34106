
# Fix: Update Admin Dashboard to Show Accurate Article Counts

## Problem
The Admin Dashboard currently shows "Published Articles: 1000" because the query fetches all articles using `.select("*")`, which is capped at 1000 rows by Supabase's default limit. The actual count is 3,271+ published articles.

## Solution
Replace the current approach of fetching all articles and counting client-side with efficient COUNT queries using Supabase's `{ count: "exact", head: true }` feature.

---

## Implementation

### Changes to `src/pages/admin/Dashboard.tsx`

**1. Add new COUNT query for accurate stats:**

Replace the current query that fetches all articles:
```typescript
// BEFORE (capped at 1000)
const { data: articles } = useQuery({
  queryKey: ["articles-stats"],
  queryFn: async () => {
    const { data } = await supabase.from("blog_articles").select("*");
    return data;
  },
});
const stats = {
  published: articles?.filter(a => a.status === 'published').length || 0,
  // ...
};
```

With efficient COUNT queries:
```typescript
// AFTER (accurate counts)
const { data: articleStats, isLoading } = useQuery({
  queryKey: ["dashboard-article-counts"],
  queryFn: async () => {
    const [draftCount, publishedCount, archivedCount, tofuCount, mofuCount, bofuCount] = await Promise.all([
      supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "archived"),
      supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("funnel_stage", "TOFU"),
      supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("funnel_stage", "MOFU"),
      supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("funnel_stage", "BOFU"),
    ]);
    return {
      draft: draftCount.count || 0,
      published: publishedCount.count || 0,
      archived: archivedCount.count || 0,
      tofu: tofuCount.count || 0,
      mofu: mofuCount.count || 0,
      bofu: bofuCount.count || 0,
      total: (draftCount.count || 0) + (publishedCount.count || 0) + (archivedCount.count || 0),
    };
  },
});
```

**2. Add language distribution query:**
```typescript
const { data: languageStats } = useQuery({
  queryKey: ["dashboard-language-counts"],
  queryFn: async () => {
    const languages = ['en', 'es', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu'];
    const counts = await Promise.all(
      languages.map(async (lang) => {
        const { count } = await supabase
          .from("blog_articles")
          .select("id", { count: "exact", head: true })
          .eq("language", lang);
        return { lang, count: count || 0 };
      })
    );
    return counts.reduce((acc, { lang, count }) => {
      acc[lang] = count;
      return acc;
    }, {} as Record<string, number>);
  },
});
```

**3. Update stats display to use new data:**
```typescript
// Use articleStats instead of calculated stats
<div className="text-2xl font-bold text-green-600">{articleStats?.published || 0}</div>
```

---

## Expected Results

| Stat | Before (Capped) | After (Accurate) |
|------|-----------------|------------------|
| Draft Articles | 0 | Actual count |
| Published Articles | 1,000 | 3,271 |
| Archived Articles | 0 | Actual count |
| TOFU/MOFU/BOFU | Capped | Accurate |
| Language counts | Capped | Accurate |

---

## Technical Benefits

1. **Performance**: COUNT queries with `head: true` don't transfer row data - just the count
2. **Accuracy**: No more 1000 row limit issues
3. **Efficiency**: Parallel queries using `Promise.all()` for fast loading
4. **Consistency**: Matches the approach used in the Sitemap page

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/Dashboard.tsx` | Replace article fetch with COUNT queries; update stats display |

---

## Schema Health Consideration

The Schema Health calculation currently validates each article individually. Since we can't efficiently do this with COUNT queries, we have two options:

1. **Keep approximate**: Sample first 1000 articles for schema health (acceptable for dashboard overview)
2. **Separate detailed view**: Link to a dedicated schema audit page for full analysis

I recommend Option 1 for the dashboard with a note that it's based on a sample, and keep the detailed validation in the existing schema audit tools.
