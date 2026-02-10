

# Phase 4: Multi-Language Verification and Google Re-indexing Preparation

## What's Already Done (No Changes Needed)

- **Sitemap priorities**: Q&A pages already use `priority 0.7` in `scripts/generateSitemap.ts` (line 336). Blog is at `1.0`, locations at `0.9`.
- **robots.txt**: Already correctly configured with `Allow: /` for all crawlers, sitemap reference, and `/admin/` and `/crm/` blocked.
- **Database**: Confirmed 960 published Q&A pages per language, 9,600 total across all 10 languages (en, nl, de, fr, pl, sv, da, hu, fi, no).

## New Scripts to Create

### Script 1: `scripts/testAllLanguagesQA.ts`

A verification script that tests one Q&A page per language against the production domain.

- Queries the database for one published Q&A slug per language
- For each language, fetches the production URL (`https://www.delsolprimehomes.com/{lang}/qa/{slug}`) with a Googlebot user-agent
- Validates each response for:
  - HTTP 200 status
  - Correct `<html lang="{lang}">` attribute
  - `X-SEO-Source` header present
  - Response body length greater than 5,000 characters
  - Presence of all 10 hreflang `<link>` tags
  - `<title>` tag with content
- Prints a pass/fail report per language

### Script 2: `scripts/sampleQAPages.ts`

A broader verification script that tests 100 random Q&A pages (10 per language).

- Queries the database for 10 random published Q&A slugs per language (using SQL `ORDER BY random() LIMIT 10`)
- Fetches each URL on the production domain with Googlebot user-agent
- Validates the same criteria as Script 1
- Reports failures with the specific URL and reason
- Outputs a summary: "95/100 passed, 5 failed" with details

### Script 3: `scripts/generatePriorityQAUrls.ts`

Generates a plain text file of Q&A URLs for manual Google Search Console submission.

- Queries the database for all 9,600 published Q&A pages (or top 100 per language = 1,000 URLs)
- Outputs one URL per line to `public/priority-qa-urls.txt`
- Format: `https://www.delsolprimehomes.com/{lang}/qa/{slug}`
- Groups by language for readability

### Package.json Updates

Add three new npm scripts:
- `"test-qa-languages": "tsx scripts/testAllLanguagesQA.ts"`
- `"sample-qa-pages": "tsx scripts/sampleQAPages.ts"`
- `"generate-priority-urls": "tsx scripts/generatePriorityQAUrls.ts"`

## Technical Notes

- All scripts use the existing Supabase client pattern from `scripts/generateSitemap.ts` (dotenv + createClient with build-optimized settings)
- Scripts target the **production** domain since the middleware only runs there
- The fetch calls use `AbortSignal.timeout(15000)` to handle slow responses
- No database or edge function changes required
- No sitemap regeneration needed since priorities are already correct

