
# Default Property Search to €400,000 + New Developments

## Current Issue

When the page loads at `/:lang/properties`, the current defaults are:
- **New Developments**: ✅ Already defaults to `only` 
- **Price Minimum**: ❌ Not set in frontend (backend defaults to €180,000)

Your screenshot shows the desired state: **€400,000 minimum + New Developments = 5,403 properties**

---

## Changes Required

### 1. Frontend - Set Default priceMin to 400,000

**File**: `src/pages/PropertyFinder.tsx` (Lines 51-62)

Update `getInitialParams()` to default `priceMin` to 400000:

```typescript
// Before
priceMin: searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : undefined,

// After  
priceMin: searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : 400000,
```

### 2. Frontend - Update Filter Component Default

**File**: `src/components/property/PropertyFilters.tsx` (Lines 70, 97)

Update initial state and effect to reflect the €400,000 default:

```typescript
// Line 70: Initial state
const [priceMin, setPriceMin] = useState(initialParams.priceMin?.toString() || "400000");

// Line 97: Effect sync
setPriceMin(initialParams.priceMin?.toString() || "400000");
```

### 3. Backend - Update Edge Function Default

**File**: `supabase/functions/search-properties/index.ts` (Line 145)

Change default minimum price from €180,000 to €400,000:

```typescript
// Before
proxyParams.minPrice = filters.priceMin ? String(filters.priceMin) : '180000';

// After
proxyParams.minPrice = filters.priceMin ? String(filters.priceMin) : '400000';
```

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| `PropertyFinder.tsx` | Line 56 | Default `priceMin` to `400000` |
| `PropertyFilters.tsx` | Lines 70, 97 | Default state to `"400000"` |
| `search-properties/index.ts` | Line 145 | Default `minPrice` to `'400000'` |

---

## Result

When users first visit `/:lang/properties`:
- **Price Minimum**: €400,000 ✅
- **Status**: New Developments Only ✅
- **Expected Results**: ~5,403 properties (matching your screenshot)

The price filter dropdown will show "€400,000" pre-selected, and users can change it to any other value if desired.
