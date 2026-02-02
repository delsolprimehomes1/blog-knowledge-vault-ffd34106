

# Fix Citation Backfill Edge Function

## Problem

The `/admin/citation-backfill` page shows "Backfill Failed - Failed to send a request to the Edge Function" because of two issues:

1. **`backfill-citations-bulk` not in config.toml** - Function exists but not registered for deployment
2. **Incomplete CORS headers** - Missing Supabase client headers causing preflight failures

## Solution

### 1. Add to config.toml

Add the missing function registration:

```toml
[functions.backfill-citations-bulk]
verify_jwt = false
```

### 2. Fix CORS Headers

Update `supabase/functions/backfill-citations-bulk/index.ts` to use complete CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.backfill-citations-bulk]` entry |
| `supabase/functions/backfill-citations-bulk/index.ts` | Update CORS headers to include Supabase client headers |

## Expected Outcome

After these changes:
- The edge function will be properly deployed
- CORS preflight requests will succeed
- Clicking "Fix" or "Backfill All 24 Articles" will work correctly
- [CITATION_NEEDED] markers will be replaced with real citations

