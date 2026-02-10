

# Fix Edge Function Timeouts - Critical SEO Fix

## Root Cause Analysis

The `serve-seo-page` edge function times out because each Q&A request makes **2-3 sequential database queries**, each pulling unnecessary data:

1. `fetchQAMetadata`: `select('*')` on `qa_pages` (all columns including large JSONB) -- line 286
2. Empty content check: already optimized to skip if `answer_main` exists from step 1
3. `fetchHreflangSiblings`: separate query on `qa_pages` by `hreflang_group_id` -- line 602

Under concurrent load, these sequential queries stack up and exceed the 15-second total timeout.

**Good news**: Database indexes already exist (`faq_pages_slug_language_idx` on `(slug, language)`), so the fix is purely in the edge function code.

## Changes (all in `supabase/functions/serve-seo-page/index.ts`)

### Fix 1: Optimize Q&A Query to Select Only Needed Columns

Replace `select('*')` in `fetchQAMetadata` (line 286) with specific columns:

```
.select('language, slug, question_main, answer_main, speakable_answer, meta_title, meta_description, canonical_url, featured_image_url, featured_image_alt, date_published, date_modified, hreflang_group_id, related_qas, translations, title')
```

This eliminates transferring large unused JSONB fields like `detailed_content`, `internal_links`, `external_citations`, etc.

### Fix 2: Increase Cache Size and TTL

- Change `CACHE_TTL` from 5 minutes to **1 hour** (line 20: `60 * 60 * 1000`)
- Increase max cache entries from 200 to **2000** (line 43) to cover more of the 9,600 Q&A pages
- This means repeated crawler hits serve from memory instantly

### Fix 3: Increase Query Timeout

- Change `QUERY_TIMEOUT` from 6,000ms to **12,000ms** (line 15) to allow cold-start queries to complete
- Keep the total request timeout at 15,000ms (line 2604) -- this is fine

### Fix 4: Improve Fallback HTML with Hreflang Tags and Q&A Content

Update `generateFallbackHTML` (lines 91-154) to:
- Detect Q&A paths and extract language/slug
- Include all 10 hreflang tags (even without DB data, we can construct the URLs from the slug pattern)
- Add a basic content section instead of just a redirect
- Remove the `meta http-equiv="refresh"` redirect so crawlers actually index the fallback content

### Fix 5: Optimize Hreflang Siblings Query

Add `.limit(15)` to the hreflang siblings query (line 602-606) as a safety net, and select only the 3 needed columns (already done correctly).

Also add a partial index check -- the `idx_qa_pages_hreflang_group` index already exists, so this query should be fast. The main optimization is combining fewer round trips.

## Technical Details

| Change | Location | Impact |
|---|---|---|
| Select specific columns | Line 286 | Reduces data transfer ~80% |
| Cache TTL 5min to 1hr | Line 20 | Eliminates repeat DB queries |
| Cache size 200 to 2000 | Line 43 | Covers more pages in memory |
| Query timeout 6s to 12s | Line 15 | Allows cold-start queries to finish |
| Fallback HTML with hreflang | Lines 91-154 | Crawlers get SEO value even on timeout |

## Expected Outcome

- Most requests served from in-memory cache (0ms DB time)
- Cache misses complete in under 3 seconds (optimized query)
- Timeout fallback now includes hreflang tags (SEO safety net)
- Consecutive timeout rate should drop from ~100% to under 5%
