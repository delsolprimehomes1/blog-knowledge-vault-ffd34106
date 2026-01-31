

# Fix Default Property Filter: New Developments First

## Problem Summary

Currently, the Property Finder page loads with a default "Sales" filter showing all resales + new developments mixed together. The requirement is:

1. **Default to "New Developments Only"** when the page loads
2. **Add "All Properties" option** so users can switch between:
   - New Developments (default)
   - Resales
   - All Properties
3. **Show cheapest new developments first** (~€180k-€200k) when no filters applied

## Current Flow Analysis

| Component | Current Behavior | Required Behavior |
|-----------|------------------|-------------------|
| `PropertyFinder.tsx` | `newDevs: undefined` by default | `newDevs: "only"` by default |
| `PropertyFilters.tsx` | Status defaults to "sales" | Status defaults to "new-developments" |
| `QuickSearch.tsx` | Status defaults to "sales" | Status defaults to "new-developments" |
| Status Options | Only "Sales" and "New Developments" | Add "All Properties" option |

## Changes Required

### 1. PropertyFinder.tsx - Set Default newDevs Parameter

**File**: `src/pages/PropertyFinder.tsx`

Update `getInitialParams()` to default to new developments when no URL parameter exists:

```typescript
const getInitialParams = (): PropertySearchParams => ({
  // ... existing params
  newDevs: searchParams.get("newDevs") === "only" ? "only" 
         : searchParams.get("newDevs") === "" ? undefined  // User explicitly chose "All"
         : "only", // Default to new developments
});
```

Also update the URL parameter handling to include newDevs in the default search.

### 2. PropertyFilters.tsx - Update Status Options and Default

**File**: `src/components/property/PropertyFilters.tsx`

Add "All Properties" option and change default:

```typescript
// Add third status option
const STATUS_OPTIONS = [
  { label: t.filters.newDevelopments, value: "new-developments" },
  { label: t.filters.resales, value: "resales" },
  { label: t.filters.allProperties, value: "all" },
];

// Default to new-developments
const [status, setStatus] = useState(
  initialParams.newDevs === "only" ? "new-developments" 
  : initialParams.newDevs === "" ? "all"
  : "new-developments" // Default
);

// Update handleSearch to handle all three cases
if (status === "new-developments") params.newDevs = "only";
else if (status === "resales") params.newDevs = ""; // Explicitly no new devs
else params.newDevs = undefined; // All properties
```

### 3. QuickSearch.tsx - Update Status Default

**File**: `src/components/home/sections/QuickSearch.tsx`

Update the home page quick search to match:

```typescript
const STATUS_OPTIONS = [
  { label: "New Developments", value: "new-developments" },
  { label: "Resales", value: "resales" },
  { label: "All Properties", value: "all" },
];

// Change default from "sales" to "new-developments"
const [status, setStatus] = useState("new-developments");

// Update handleSearch for three cases
if (status === "new-developments") params.append("newDevs", "only");
else if (status === "resales") params.append("newDevs", "");
// "all" - don't append anything
```

### 4. Add Translations for New Options

**Files**: All translation files in `src/i18n/translations/propertyFinder/`

Add new translation keys:

```typescript
filters: {
  // ... existing
  sales: "Sales",           // Keep for backward compatibility
  resales: "Resales",       // NEW
  newDevelopments: "New Developments",
  allProperties: "All Properties",  // NEW
}
```

### 5. Edge Function - Handle Resales-Only Filter

**File**: `supabase/functions/search-properties/index.ts`

Currently the backend only handles `newDevs === 'only'`. For "Resales Only", we may need to explicitly exclude new developments:

```typescript
// Handle different newDevs modes
if (filters.newDevs === 'only') {
  proxyParams.newDevelopment = 'true';
} else if (filters.newDevs === '') {
  // Resales only - exclude new developments
  proxyParams.newDevelopment = 'false';
}
// else: all properties (don't pass newDevelopment param)
```

Note: This depends on how the proxy server/API handles the parameter. If the API doesn't support excluding new developments, the "Resales" option would show the same as "All Properties".

## Implementation Summary

| File | Change |
|------|--------|
| `PropertyFinder.tsx` | Default `newDevs` to `"only"` in `getInitialParams()` |
| `PropertyFilters.tsx` | Add "All Properties" option, default to "new-developments" |
| `QuickSearch.tsx` | Add "All Properties" option, default to "new-developments" |
| Translation files (10) | Add `resales` and `allProperties` keys |
| `search-properties/index.ts` | Handle resales-only filter if API supports it |

## Expected Behavior After Changes

| Scenario | Before | After |
|----------|--------|-------|
| Page load (no params) | Shows all sales mixed | Shows only new developments |
| User selects "Resales" | N/A | Shows only resale properties |
| User selects "All Properties" | N/A | Shows both resales and new developments |
| URL: `?newDevs=only` | New developments | New developments |
| URL: no newDevs param | All sales | New developments (default) |

## Price Ordering

The backend already returns properties sorted by price ascending when no specific sort is requested, so the cheapest new developments (~€180k-€200k) will appear first automatically with the default €180k minimum price filter.

