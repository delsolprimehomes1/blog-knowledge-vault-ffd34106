
# Fix: Properties Not Showing Above €500,000

## Root Cause Identified

The `search-properties` edge function is looking for the wrong field name for max price:

| Edge Function | Field Used | Correct Field |
|---------------|------------|---------------|
| `get-property-details` | `prop.PriceTo` | Correct |
| `search-properties` | `raw.PriceMax` | Incorrect - field doesn't exist |

Since `priceMax` is always `undefined`, the frontend filter defaults to `property.price` (the starting price like €215,000), and since €215,000 < €500,000, ALL properties get filtered out.

---

## Solution

### 1. Fix Edge Function: Use `PriceTo` Instead of `PriceMax`

**File**: `supabase/functions/search-properties/index.ts`

Change line 38 from:
```typescript
priceMax: raw.PriceMax ? parseInt(raw.PriceMax) : undefined,
```

To:
```typescript
priceMax: raw.PriceTo ? parseInt(raw.PriceTo) : undefined,
```

This matches how `get-property-details` extracts the max price.

---

## Summary

| File | Change |
|------|--------|
| `search-properties/index.ts` | Change `raw.PriceMax` to `raw.PriceTo` |

---

## Expected Result After Fix

1. Properties will correctly include `priceMax` values (e.g., €558,000 for R5074729)
2. Frontend filter will work correctly:
   - Property R5074729: `priceMax` = €558,000 >= €500,000 = **shows**
   - Property with range €215k-€400k: `priceMax` = €400,000 < €500,000 = **hidden**
3. New Development properties with units above €500k will appear in results
