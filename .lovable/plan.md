
# Duplicate Content Detection and Resolution Toolkit

## Overview

This plan creates three integrated tools to resolve the duplicate content and canonical URL issues causing **884 GSC "Duplicate without user-selected canonical"** errors and contributing to the **3,096 "Not found (404)"** issues.

---

## Tool 1: Duplicate Content Detection Dashboard

**Location:** `/admin/duplicate-detector`  
**Navigation:** SEO & Health section

### Purpose
Identify and display all content pairs with similar slugs or identical headlines for manual review.

### Features

1. **Duplicate Detection Queries**
   - Near-duplicate slugs (e.g., `mortgage-rates` vs `mortgage-rates-1`)
   - Identical headlines across different articles
   - Same `cluster_theme` with overlapping content

2. **Dashboard Display**
   - Summary cards showing:
     - Total duplicate pairs found
     - Duplicates by content type (Blog, Q&A, Comparison)
     - Potential indexing impact score
   - Table listing all duplicate pairs with:
     - Both article headlines/slugs
     - Languages
     - Publication status
     - Content length comparison
     - Action buttons (View, Keep A, Keep B)

3. **Side-by-Side Comparison**
   - Modal showing both articles' content
   - Word count, publish date, citations count
   - Recommendation based on content quality signals

### Technical Implementation

```text
src/
  pages/admin/
    DuplicateDetector.tsx         # Main page component
  components/admin/
    duplicate-detector/
      DuplicateSummaryCards.tsx    # Stats overview
      DuplicatePairsTable.tsx      # List of all pairs
      ComparisonModal.tsx          # Side-by-side view
      MergeActions.tsx             # Keep/Delete actions
  hooks/
    useDuplicateDetection.ts       # Detection logic
```

### Detection Algorithm

```text
Step 1: Find Near-Duplicate Slugs
  - Query all published blog_articles
  - Group by base slug (strip -1, -2, etc. suffixes)
  - Flag groups with 2+ articles

Step 2: Find Identical Headlines
  - Query articles grouped by exact headline match
  - Cross-reference with different IDs

Step 3: Score Duplicates
  - Content length (longer = better)
  - External citations count
  - Publication date (older = canonical preference)
  - Has hreflang_group_id (linked = keep)
```

---

## Tool 2: Automated Canonical URL Backfill

**Location:** `/admin/canonical-backfill`  
**Navigation:** SEO & Health section

### Purpose
Fix the **60+ blog articles** and **3+ comparison pages** missing `canonical_url` values.

### Features

1. **Scan & Preview**
   - Fetch all published content with missing/incorrect canonical URLs
   - Show count by content type
   - Preview what canonical URLs will be set

2. **Canonical Format**
   ```
   Blog: https://www.delsolprimehomes.com/{language}/blog/{slug}
   Q&A: https://www.delsolprimehomes.com/{language}/qa/{slug}
   Compare: https://www.delsolprimehomes.com/{language}/compare/{slug}
   Location: https://www.delsolprimehomes.com/{language}/locations/{city}/{topic}
   ```

3. **Batch Processing**
   - Process in batches of 50 to avoid timeouts
   - Progress bar with success/error counts
   - Rollback capability if issues detected

### Technical Implementation

```text
src/
  pages/admin/
    CanonicalBackfill.tsx           # Main page
  components/admin/
    canonical-backfill/
      MissingCanonicalTable.tsx     # Preview missing items
      BackfillProgress.tsx          # Progress indicator
      BackfillResults.tsx           # Success/error summary
```

### Database Updates

For each content type, update records where:
```sql
-- Blog articles
WHERE canonical_url IS NULL 
   OR canonical_url = '' 
   OR canonical_url NOT LIKE 'https://www.delsolprimehomes.com/%'

-- Set to:
canonical_url = 'https://www.delsolprimehomes.com/' || language || '/blog/' || slug
```

---

## Tool 3: Duplicate Merger Tool

**Location:** Integrated into Duplicate Detector (Tool 1)  
**Also accessible from:** Article Editor action menu

### Purpose
Allow selecting which article to keep and automatically:
1. Mark the duplicate as 410 (Gone)
2. Update any internal links pointing to the duplicate
3. Transfer any unique external citations to the kept article

### Features

1. **Merge Wizard**
   - Select primary (keep) article
   - Select duplicate (remove) article
   - Preview changes before execution

2. **Merge Actions**
   - Add duplicate URL to `gone_urls` table (410 response)
   - Update `internal_links` JSONB in articles linking to duplicate
   - Optionally merge unique citations from duplicate to primary
   - Log merge action for audit trail

3. **Safety Checks**
   - Prevent merging if duplicate has more backlinks
   - Warn if duplicate has better content signals
   - Confirm before execution

### Technical Implementation

```text
src/
  components/admin/
    duplicate-detector/
      MergeWizard.tsx               # Step-by-step merge flow
      MergePreview.tsx              # Show what will change
      MergeConfirmDialog.tsx        # Final confirmation
  hooks/
    useDuplicateMerge.ts            # Merge logic
```

### Edge Function

**Name:** `merge-duplicate-articles`

**Actions:**
1. Add duplicate slug to `gone_urls` with reason `duplicate_content`
2. Find all articles with `internal_links` containing duplicate URL
3. Replace duplicate URL with primary URL in those links
4. Optionally copy unique citations from duplicate to primary
5. Return summary of changes made

---

## Admin Navigation Update

Add to the "SEO & Health" section in `AdminLayout.tsx`:

```typescript
{
  label: "SEO & Health",
  items: [
    // ... existing items ...
    { name: "Duplicate Detector", href: "/admin/duplicate-detector", icon: Copy },
    { name: "Canonical Backfill", href: "/admin/canonical-backfill", icon: Link2 },
  ],
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/DuplicateDetector.tsx` | Create | Main duplicate detection page |
| `src/pages/admin/CanonicalBackfill.tsx` | Create | Canonical URL repair page |
| `src/components/admin/duplicate-detector/DuplicateSummaryCards.tsx` | Create | Stats cards |
| `src/components/admin/duplicate-detector/DuplicatePairsTable.tsx` | Create | Pairs listing |
| `src/components/admin/duplicate-detector/ComparisonModal.tsx` | Create | Side-by-side comparison |
| `src/components/admin/duplicate-detector/MergeWizard.tsx` | Create | Merge workflow |
| `src/components/admin/canonical-backfill/MissingCanonicalTable.tsx` | Create | Preview table |
| `src/components/admin/canonical-backfill/BackfillProgress.tsx` | Create | Progress UI |
| `src/hooks/useDuplicateDetection.ts` | Create | Detection queries |
| `src/hooks/useDuplicateMerge.ts` | Create | Merge mutations |
| `src/hooks/useCanonicalBackfill.ts` | Create | Backfill logic |
| `supabase/functions/merge-duplicate-articles/index.ts` | Create | Merge edge function |
| `src/components/AdminLayout.tsx` | Modify | Add navigation items |
| `src/App.tsx` | Modify | Add routes |

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Duplicate without canonical | 884 | ~0 (after merge + backfill) |
| Missing canonical_url | 60+ articles | 0 |
| Near-duplicate slugs | 21 pairs (42 articles) | Resolved via merge |
| Internal links to duplicates | Unknown | Auto-fixed during merge |

---

## Workflow Summary

```text
1. Run Duplicate Detector
   ↓
2. Review duplicate pairs (21 found)
   ↓
3. For each pair: Use Merge Wizard
   - Select primary article
   - Confirm merge
   - Duplicate → 410 Gone
   ↓
4. Run Canonical Backfill
   - Preview 60+ missing
   - Execute batch update
   ↓
5. Regenerate sitemaps
6. Ping IndexNow
7. Wait for GSC re-crawl
```

---

## UI Design Notes

- Follow existing admin patterns from `GoneURLsManager.tsx` and `GSCImportWizard.tsx`
- Use Card-based layout with summary stats at top
- Table views with search/filter capabilities
- Progress indicators for batch operations
- Toast notifications for success/error states
- Confirmation dialogs for destructive actions
