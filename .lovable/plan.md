
# Fix: Property Detail Page Crash - Handle EnergyCertificate Object

## Problem

The property detail page crashes with "Objects are not valid as a React child" because the API returns `energyRating` as a nested object instead of a string:

```json
"energyRating": {
  "CO2Rated": "",
  "EnergyRated": "",
  "CO2Value": "",
  "EnergyValue": "",
  "Image": ""
}
```

The current edge function fix checks `prop.EnergyCertificate`, but the API appears to also return `prop.EnergyRating` as an object, which bypasses the fix.

## Root Cause

In `supabase/functions/get-property-details/index.ts`, line 399-403:

```typescript
energyRating: prop.EnergyRating ||   // ← If THIS is an object, it passes through
              (typeof prop.EnergyCertificate === 'object' ? prop.EnergyCertificate?.EnergyRated : prop.EnergyCertificate) || '',
```

The fix only handles `EnergyCertificate` as an object, but `EnergyRating` can ALSO be an object.

## Solution

Update the edge function to robustly extract string values from both `EnergyRating` and `EnergyCertificate`, regardless of which one is an object.

### File to Change

**`supabase/functions/get-property-details/index.ts`**

Replace lines 398-403:

```typescript
// Energy certificates - handle nested EnergyCertificate object
energyRating: prop.EnergyRating || 
              (typeof prop.EnergyCertificate === 'object' ? prop.EnergyCertificate?.EnergyRated : prop.EnergyCertificate) || '',
co2Rating: prop.CO2Rating || 
           (typeof prop.EnergyCertificate === 'object' ? prop.EnergyCertificate?.CO2Rated : null) ||
           prop.CO2Emissions || '',
```

With:

```typescript
// Energy certificates - robustly extract string values
// Handle BOTH EnergyRating and EnergyCertificate potentially being objects
energyRating: (() => {
  // Check EnergyRating first
  if (typeof prop.EnergyRating === 'string' && prop.EnergyRating) {
    return prop.EnergyRating;
  }
  if (typeof prop.EnergyRating === 'object' && prop.EnergyRating?.EnergyRated) {
    return prop.EnergyRating.EnergyRated;
  }
  // Fallback to EnergyCertificate
  if (typeof prop.EnergyCertificate === 'string' && prop.EnergyCertificate) {
    return prop.EnergyCertificate;
  }
  if (typeof prop.EnergyCertificate === 'object' && prop.EnergyCertificate?.EnergyRated) {
    return prop.EnergyCertificate.EnergyRated;
  }
  return '';
})(),
co2Rating: (() => {
  // Check CO2Rating first
  if (typeof prop.CO2Rating === 'string' && prop.CO2Rating) {
    return prop.CO2Rating;
  }
  // Check EnergyRating object
  if (typeof prop.EnergyRating === 'object' && prop.EnergyRating?.CO2Rated) {
    return prop.EnergyRating.CO2Rated;
  }
  // Check EnergyCertificate object
  if (typeof prop.EnergyCertificate === 'object' && prop.EnergyCertificate?.CO2Rated) {
    return prop.EnergyCertificate.CO2Rated;
  }
  // Fallback to CO2Emissions
  if (prop.CO2Emissions) {
    return String(prop.CO2Emissions);
  }
  return '';
})(),
```

## Why This Works

| Before | After |
|--------|-------|
| Only checks if `EnergyCertificate` is object | Checks if BOTH `EnergyRating` and `EnergyCertificate` are objects |
| `prop.EnergyRating` object passes through unchanged | Extracts `.EnergyRated` from object if present |
| Truthy check allows objects | Type check ensures only strings are returned |

## Files Affected

| File | Change |
|------|--------|
| `supabase/functions/get-property-details/index.ts` | Robust energy rating extraction |

## Verification

After deployment:
1. Navigate to `/en/property/R5074729`
2. Confirm page loads without crash
3. Check that "Costs & Details" section displays correctly (or is hidden if energy ratings are empty strings)

## Rollback

If issues occur, revert to returning empty strings:
```typescript
energyRating: '',
co2Rating: '',
```

This will simply hide the Energy Certificates section rather than crash.
