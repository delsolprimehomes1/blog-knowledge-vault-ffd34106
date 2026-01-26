

# Fix Resales Online V6 API Integration

## Root Cause

The Edge Functions are sending **legacy V5 parameters** that cause V6 to reject requests with 400 errors:

| Parameter | Status | Action |
|-----------|--------|--------|
| `p2` | Not used in V6 | Remove completely |
| `P_sandbox` | Not used in V6 | Remove completely |
| RESA_P2 validation | Incorrect | Remove check |

## V6 Authentication Model

Authentication in V6 works via:
- `p1` = API Key (the hash you have)
- IP whitelist (configured in Resales dashboard)
- Valid parameters only

**No password, no sandbox mode.**

## Changes Required

### File 1: `supabase/functions/search-properties/index.ts`

**Remove RESA_P2 references:**
```diff
- const RESA_P2 = Deno.env.get('RESA_P2') || '';
```

**Remove RESA_P2 validation (lines 121-123):**
```diff
async function callResalesAPI(filters: any, langNum: number, limit: number, page: number): Promise<any> {
-   if (!RESA_P2) {
-     throw new Error('Missing Resales credential: RESA_P2');
-   }
```

**Remove sandbox retry loop (lines 131-132, 137):**
```diff
-   const sandboxValues: Array<'false' | 'true'> = ['false', 'true'];
    // Single pass per p1 candidate, no sandbox variations
-   for (const sandbox of sandboxValues) {
```

**Clean API params (lines 139-147):**
```diff
  const apiParams: Record<string, string> = {
    p1: p1Candidate.value,
-   p2: RESA_P2,
    P_Agency_FilterId: '1',
    P_Lang: String(langNum),
    P_PageSize: String(limit),
    P_PageNo: String(page),
-   P_sandbox: sandbox,
  };
```

### File 2: `supabase/functions/get-property-details/index.ts`

**Same changes:**
1. Remove `RESA_P2` constant
2. Remove RESA_P2 validation check (lines 30-32)
3. Remove `sandboxValues` array and nested loop (lines 39, 43)
4. Remove `p2` and `P_sandbox` from `apiParams` (lines 47, 50)

## Final V6-Compliant Request Format

```javascript
const apiParams: Record<string, string> = {
  p1: p1Candidate.value,
  P_Agency_FilterId: '1',
  P_Lang: String(langNum),
  P_PageSize: String(limit),
  P_PageNo: String(page),
};

// Add optional filters only if present
if (filters.location) apiParams.P_Location = filters.location;
if (filters.priceMin) apiParams.P_PriceMin = String(filters.priceMin);
// ... etc
```

## Expected Successful Response

After fix, API should return:
```json
{
  "transaction": {
    "status": "success",
    "version": "6.0",
    "service": "Search Properties"
  },
  "QueryInfo": {
    "PropertyCount": 42,
    "CurrentPage": 1
  },
  "Property": [...]
}
```

## Verification Steps

1. Deploy updated Edge Functions
2. Test search on `/en/properties`
3. Check logs for `status: success` in transaction
4. Verify properties display in UI

