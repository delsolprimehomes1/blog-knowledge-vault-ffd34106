

# Phase 2: Fix Q&A Crawlability -- Middleware SSR Fallback + Timeout Fix

## Diagnosis Summary

The edge function `serve-seo-page` is being hit for Q&A pages and **timing out on nearly every request**. The logs show constant `Timeout after 8000ms` warnings. When it times out, it returns a generic fallback HTML page (hardcoded `lang="en"`, generic brand description, meta refresh redirect) -- which is exactly the "thin content" Google sees.

The root cause chain:
1. Static HTML files may or may not exist in the deployment (generated at build time by `generateStaticQAPages`)
2. `_redirects` rules (lines 80-81) should serve static files, but if they are missing from `dist/`, Cloudflare falls through to the SPA `index.html`
3. The middleware currently does NOT intercept Q&A pages (Q&A is excluded from `SEO_ROUTE_PATTERNS`)
4. So crawlers either get an empty SPA shell OR hit the edge function directly (via the Cloudflare worker file), which times out and returns thin fallback HTML

## Two-Pronged Fix

### Change 1: Add Q&A SSR Fallback in Middleware (`functions/_middleware.js`)

Add Q&A page detection **before** the `needsSEO()` check. When a Q&A request arrives:

1. First, try to serve the static file via `next()` (the `_redirects` rule may resolve it)
2. Check if the response is substantial HTML (contains `<!DOCTYPE html>` and word count > 100)
3. If static file is thin/missing, call `serve-seo-page` edge function as SSR fallback
4. If SSR also fails, pass through to the SPA (better than nothing)

This ensures crawlers always get content even when static files are missing from deployment.

**Key middleware logic:**
- Detect Q&A paths: `/^\/([a-z]{2})\/qa\/(.+)/`
- Try static file first via `next()`
- Validate response has real content (not just `<div id="root"></div>`)
- Fallback to edge function with `?path=/{lang}/qa/{slug}&html=true`
- Add `X-SEO-Source` header for debugging (`static` vs `edge-function-ssr` vs `spa-fallback`)

### Change 2: Increase Edge Function Timeout (`supabase/functions/serve-seo-page/index.ts`)

The current 8-second timeout (line 2592) is too aggressive for cold starts + multiple DB queries. The Q&A handler makes **3 sequential DB calls** (metadata fetch, empty content check, hreflang siblings), each with a 10-second individual timeout.

Changes:
- Increase main timeout from 8000ms to 15000ms
- Reduce individual query timeout from 10000ms to 6000ms (force faster failures)
- Fix the fallback HTML to use the correct language from the URL instead of hardcoded `lang="en"`
- Add content-type-specific info to fallback HTML (not just generic brand text)

### Change 3: Optimize Edge Function DB Queries

The Q&A path currently makes redundant DB calls:
1. `fetchQAMetadata` -- fetches `*` from `qa_pages` (includes `answer_main`)
2. Wrecking Ball check (lines 2432-2440) -- fetches `answer_main` from `qa_pages` AGAIN

Fix: Skip the redundant Wrecking Ball query for Q&A pages since `fetchQAMetadata` already fetched `answer_main` in `metadata.answer_main`. This eliminates one DB round-trip.

## Technical Details

### Middleware Changes (`functions/_middleware.js`)

Insert a new block after asset path checks (after line 125) and before `needsSEO()`:

```text
// Q&A FALLBACK: Try static file first, then SSR edge function
if (pathname matches /{lang}/qa/{slug}) {
  1. response = await next()  // Try static file
  2. Clone and read body to check content
  3. If body contains "<!DOCTYPE html>" AND substantial content:
     -> return response (static file works)
  4. Else: call serve-seo-page edge function
  5. If edge function returns HTML:
     -> return SSR response with cache headers
  6. Else: return original response (SPA fallback)
}
```

### Edge Function Changes (`supabase/functions/serve-seo-page/index.ts`)

1. Line 15: `QUERY_TIMEOUT = 10000` -> `6000` (faster individual query failures)
2. Line 16: Keep `TOTAL_REQUEST_TIMEOUT = 20000`
3. Line 2592: `8000` -> `15000` (main timeout)
4. Lines 91-149: Update `generateFallbackHTML` to extract language from URL path
5. Lines 2432-2440: Skip redundant Q&A content query when `metadata.answer_main` already exists

### No Changes Needed

- `public/_redirects` -- already has correct Q&A rules (lines 80-81)
- `public/_headers` -- already has Q&A cache headers
- `scripts/generateStaticQAPages.ts` -- works correctly; build reliability is a separate concern
- Database schema -- no changes needed

## Expected Results

After these changes:
- Crawlers hitting Q&A pages will get full HTML content (either from static files or SSR fallback)
- The `X-SEO-Source` response header will show exactly which path served the content
- Edge function timeouts should decrease significantly (one fewer DB call, faster query timeout)
- Fallback HTML will at least have the correct `lang` attribute even when timing out

