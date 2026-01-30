

# Fix: Supabase 1000-Row Limit Bug in 404 Resolver

## Problem Identified

The 404 Resolution Dashboard shows incorrect counts due to **Supabase's default 1000-row limit**:

| What You See | Actual Data |
|--------------|-------------|
| Summary: 997 malformed | **4,159 malformed** |
| Table: 2 URLs | **4,159 URLs** |

### Why This Happens

When fetching data from Supabase without an explicit limit, it returns a maximum of 1000 rows. The malformed URLs happen to be mostly in rows 1001+ (ordered by date), so they're never fetched.

Database breakdown:
- First 1000 rows: Only 2 malformed URLs
- Rows 1001-5209: 4,157 malformed URLs

---

## Solution

Update `useNotFoundAnalysis.ts` to fetch **all rows** using pagination (batch fetching).

### Technical Approach

Create a helper function that fetches data in batches of 1000 until all rows are retrieved:

```typescript
async function fetchAllGoneUrls() {
  const allData = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data } = await supabase
      .from("gone_urls")
      .select("id, url_path, reason, created_at")
      .range(offset, offset + batchSize - 1)
      .order("created_at", { ascending: false });
    
    if (!data || data.length === 0) break;
    allData.push(...data);
    
    if (data.length < batchSize) break;
    offset += batchSize;
  }
  
  return allData;
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useNotFoundAnalysis.ts` | Add batch fetching to all query functions |

### Functions Affected

1. `useNotFoundSummary()` - Uses `allUrls` which is limited to 1000
2. `useMalformedUrls()` - Fetches without limit
3. `useLanguageMismatches()` - Fetches without limit  
4. `useConfirmedGoneUrls()` - Fetches without limit
5. `countLanguageMismatches()` - Fetches without limit

---

## Expected Results After Fix

| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| Malformed URLs shown | 2 | 4,159 |
| Summary card accuracy | Wrong | Correct |
| Language mismatches | Incomplete | Complete |
| Confirmed 410s | Incomplete | Complete |

---

## Implementation Steps

1. Create `fetchAllGoneUrls()` helper function for batch fetching
2. Update `useNotFoundSummary()` to use the helper
3. Update `useMalformedUrls()` to use the helper
4. Update `useLanguageMismatches()` to use the helper
5. Update `useConfirmedGoneUrls()` to use the helper
6. Update `countLanguageMismatches()` to use the helper

This ensures all 5,209 URLs are analyzed, not just the first 1000.

