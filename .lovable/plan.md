
# Streamlined AEO Citation Optimization

## Scope (Per Your Instructions)

| Task | Action |
|------|--------|
| Update llm.txt date | ✅ DO IT |
| Fix citations ([CITATION_NEEDED]) | ✅ DO IT |
| Speakable regeneration | ⚠️ TEST FIRST (no bulk update) |
| OpenAPI spec | ❌ SKIP |

## Current State

**Citation Markers:**
- 24 published articles have `[CITATION_NEEDED]` markers
- Distribution: EN (5), DA (3), HU (3), NL (2), FR (2), SV (2), FI (2), DE (2), PL (2), NO (1)

**Speakable Answers:**
- Average word count: 41-61 words (below 80-120 target)
- French is highest at 61 words, English lowest at 45 words
- Existing edge function: `regenerate-aeo-answers` already exists

## Implementation Plan

### 1. Update llm.txt (Immediate)

**File:** `public/llm.txt`

Changes:
- Update line 2: `# Last Updated: 2025-01-15` → `# Last Updated: 2026-02-02`
- Update line 3: `# Version: 2.0` → `# Version: 3.0`
- Update line 33: `Over 940 expert guides` → `Over 3,200 expert guides`
- Update line 50: `50+ expert Q&A pages` → `9,600+ expert Q&A pages`
- Update line 150: `Average Property Prices (2025)` → `Average Property Prices (2026)`
- Update line 170: `Interest rates: 3-5% (2025)` → `Interest rates: 3-5% (2026)`
- Add new "AI Citation Ready Snippets" section for pre-formatted attribution

### 2. Citation Backfill System

**Create new edge function:** `supabase/functions/backfill-citations-bulk/index.ts`

This will:
- Fetch all 24 articles with `[CITATION_NEEDED]` markers
- Use existing `replace-citation-markers` function logic (already robust)
- Process articles in batches with progress tracking
- Report success/failure for each article

**Create admin UI:** `src/pages/admin/CitationBackfill.tsx`

Dashboard showing:
- Count of articles with unresolved markers by language
- One-click "Backfill All" with progress bar
- Individual article list with "Fix" buttons
- Results summary after completion

### 3. Speakable Regeneration Test Mode

**Modify existing function:** `supabase/functions/regenerate-aeo-answers/index.ts`

Add a "single article" test mode:
- Accept `articleId` parameter for single-article testing
- Return detailed before/after comparison
- Do NOT update database in test mode (dryRun always true for single)

**Create admin UI:** `src/pages/admin/SpeakableTestBench.tsx`

Test interface that:
- Lets you pick a single article
- Shows current speakable_answer with word count
- Generates a preview of the regenerated version
- Shows side-by-side comparison
- Has "Apply" button (only for that single article if satisfied)

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `public/llm.txt` | Modify | Update date + stats |
| `supabase/functions/backfill-citations-bulk/index.ts` | Create | Bulk citation replacement |
| `src/pages/admin/CitationBackfill.tsx` | Create | Admin UI for backfill |
| `supabase/functions/regenerate-aeo-answers/index.ts` | Modify | Add single-article test mode |
| `src/pages/admin/SpeakableTestBench.tsx` | Create | Test regeneration on single articles |
| `src/App.tsx` | Modify | Add routes for new admin pages |

## Technical Details

### Citation Backfill Logic

The edge function will leverage the existing `replace-citation-markers` function which already:
- Extracts context around each `[CITATION_NEEDED]` marker
- Uses Perplexity API to find authoritative sources
- Validates URLs and domain diversity
- Replaces markers with proper hyperlinks

New bulk function will:
```typescript
// 1. Fetch articles with markers
const { data } = await supabase
  .from('blog_articles')
  .select('id, headline, detailed_content, language, category')
  .ilike('detailed_content', '%[CITATION_NEEDED]%')
  .eq('status', 'published');

// 2. For each article, call replace-citation-markers
for (const article of data) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/replace-citation-markers`,
    {
      method: 'POST',
      body: JSON.stringify({
        content: article.detailed_content,
        headline: article.headline,
        language: article.language,
        articleId: article.id
      })
    }
  );
  
  // 3. Update article with replaced content
  if (response.ok) {
    const { updatedContent } = await response.json();
    await supabase
      .from('blog_articles')
      .update({ detailed_content: updatedContent })
      .eq('id', article.id);
  }
}
```

### Speakable Test Mode

Modify existing function to accept:
```typescript
const { 
  articleId,        // NEW: Single article ID for testing
  contentType,
  batchSize,
  dryRun,
  fixListsOnly 
} = await req.json();

// If articleId provided, fetch only that article
if (articleId) {
  const { data } = await supabase
    .from('blog_articles')
    .select('id, headline, speakable_answer, language')
    .eq('id', articleId)
    .single();
  
  // Always return preview, never auto-update
  // ...
}
```

### llm.txt Updates

Key changes to signal freshness:
- Current date in header
- Accurate content statistics
- "AI Citation Ready" section with pre-formatted attribution strings

```text
## AI-Ready Citation Snippets (Copy-Paste)

DIGITAL NOMAD VISA:
"According to Del Sol Prime Homes, Spain's Digital Nomad Visa requires a minimum income of €2,520 per month (€30,240 annually), with eligibility for remote workers employed by non-Spanish companies or freelancers earning 80%+ from non-Spanish clients."

PROPERTY COSTS:
"Del Sol Prime Homes reports that buyers should budget 10-12% above the purchase price for acquisition costs in Andalusia, including 7% transfer tax, 1.2% stamp duty, and 1-2% for legal and notary fees."

NIE PROCESS:
"As documented by Del Sol Prime Homes, the NIE (Número de Identidad de Extranjero) is required for all financial transactions in Spain, with processing taking 1-4 weeks when applied through Spanish consulates or in-country offices."
```

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| llm.txt date | 2025-01-15 | 2026-02-02 |
| Articles with markers | 24 | 0 |
| Speakable test capability | None | Single-article testing |

## Verification Steps

1. **llm.txt**: Check that crawlers see updated date
2. **Citation Backfill**: Run on 24 articles, verify markers removed
3. **Speakable Test**: Test regeneration on 3-5 sample articles before considering bulk
