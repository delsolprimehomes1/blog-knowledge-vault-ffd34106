

# Fix: "Fixed Images" Count Showing 100 Instead of Actual Total (600)

## Problem Identified

The "Fixed Images" card shows **100** but the actual count is **600**. This happens because:

1. Line 337 has `.limit(100)` on the resolved issues query (for performance)
2. Line 353 uses `resolvedIssuesData.length` for the count instead of querying the actual total

The system IS continuing to fix images - this is only a display bug.

## Current Database State

| Status | Count |
|--------|-------|
| Fixed (resolved) | **600** |
| Pending (unresolved) | **250** |

## Solution

Add a separate `{ count: "exact", head: true }` query to get the actual total of fixed images, while keeping the `.limit(100)` on the data query (for the Fixed tab display).

## Technical Changes

### File: `src/pages/admin/ImageHealthDashboard.tsx`

1. **Add a count-only query for resolved issues** (around line 319)

```typescript
// Get accurate count of resolved issues (separate from limited data query)
const { count: resolvedCount } = await supabase
  .from('article_image_issues')
  .select('*', { count: 'exact', head: true })
  .not('resolved_at', 'is', null);

// Fetch resolved issues for display (limited to 100 for performance)
const { data: resolvedData, error: resolvedError } = await supabase
  .from('article_image_issues')
  .select(`...`)
  .not('resolved_at', 'is', null)
  .order('resolved_at', { ascending: false })
  .limit(100);
```

2. **Update the counts calculation** (around line 353)

```typescript
const newCounts = {
  duplicates: issuesData.filter(i => i.issue_type === 'duplicate').length,
  textIssues: issuesData.filter(i => i.issue_type === 'text_detected').length,
  expiredUrls: issuesData.filter(i => i.issue_type === 'expired_url').length,
  total: issuesData.length,
  fixed: resolvedCount || 0  // Use the count query, not the limited array length
};
```

3. **Update the Fixed tab to show "100 of 600"** (around line 670)

Show users that they're viewing a subset of all fixed images.

## Expected Result

After the fix:
- **Fixed Images card**: Shows **600** (actual total)
- **Fixed tab**: Shows "Showing 100 of 600" with the most recent 100 fixes
- **Pending issues**: 250 can still be fixed via Regenerate buttons

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/ImageHealthDashboard.tsx` | Add count query, update counts calculation |

