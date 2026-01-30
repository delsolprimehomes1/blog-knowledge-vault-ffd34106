
# Update Property Search Price Defaults

## Current Issue
The URL shows `priceMin=500000&newDevs=only` from a previous session. These URL parameters override any defaults since `getInitialParams()` reads from URL search params.

## Required Changes

### 1. Update PRICE_OPTIONS in PropertyFilters.tsx (lines 19-33)

**Current:**
```javascript
const PRICE_OPTIONS = [
  { label: "Any", value: "" },
  { label: "€50,000", value: "50000" },
  { label: "€100,000", value: "100000" },
  { label: "€150,000", value: "150000" },
  { label: "€200,000", value: "200000" },
  { label: "€250,000", value: "250000" },
  { label: "€300,000", value: "300000" },
  { label: "€400,000", value: "400000" },
  { label: "€500,000", value: "500000" },
  { label: "€750,000", value: "750000" },
  { label: "€1,000,000", value: "1000000" },
  { label: "€2,000,000", value: "2000000" },
  { label: "€5,000,000", value: "5000000" },
];
```

**Updated:**
```javascript
const PRICE_OPTIONS = [
  { label: "Any", value: "" },
  { label: "€100,000", value: "100000" },
  { label: "€180,000", value: "180000" },
  { label: "€250,000", value: "250000" },
  { label: "€300,000", value: "300000" },
  { label: "€400,000", value: "400000" },
  { label: "€500,000", value: "500000" },
  { label: "€750,000", value: "750000" },
  { label: "€1,000,000", value: "1000000" },
  { label: "€2,000,000", value: "2000000" },
  { label: "€3,000,000", value: "3000000" },
  { label: "€5,000,000", value: "5000000" },
  { label: "€10,000,000", value: "10000000" },
];
```

---

### 2. Update PRICE_OPTIONS in QuickSearch.tsx (lines 10-24)

Same changes as above - add €180,000 and €10,000,000 options, update the range.

---

### 3. Edge Function: Apply Default Price Range (search-properties/index.ts)

Add default prices at the API level when not specified by user:

**Current (lines 116-119):**
```javascript
if (filters.location) proxyParams.location = filters.location;
if (filters.sublocation) proxyParams.sublocation = filters.sublocation;
if (filters.priceMin) proxyParams.minPrice = String(filters.priceMin);
if (filters.priceMax) proxyParams.maxPrice = String(filters.priceMax);
```

**Updated:**
```javascript
if (filters.location) proxyParams.location = filters.location;
if (filters.sublocation) proxyParams.sublocation = filters.sublocation;
// Default price range: €180,000 - €10,000,000
proxyParams.minPrice = filters.priceMin ? String(filters.priceMin) : '180000';
proxyParams.maxPrice = filters.priceMax ? String(filters.priceMax) : '10000000';
```

---

### 4. Clear Cached URL State

The user must navigate to a clean URL to clear the old parameters:
- Navigate to `/en/properties` (without query params)
- Or click "Clear All" / "Reset" button in filters

---

## Summary of Changes

| File | Change |
|------|--------|
| `PropertyFilters.tsx` | Add €180K and €10M options; remove €50K, €150K, €200K |
| `QuickSearch.tsx` | Same PRICE_OPTIONS update |
| `search-properties/index.ts` | Default minPrice=180000, maxPrice=10000000 |

## Expected Behavior After Changes

1. **Default search** (no filters): €180,000 - €10,000,000
2. **Price dropdown**: Shows €180K as a key option, goes up to €10M
3. **API request**: Always includes `minPrice=180000&maxPrice=10000000` unless user specifies different values
4. **Property count**: Should increase to match API's full residential inventory within price range
