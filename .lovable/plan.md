

# Urgent Fix: Revert Image Transformer to Restore Images

## Problem

Property card images are showing placeholder icons instead of actual property photos. The current `imageUrlTransformer.ts` is replacing `/w400/` with `/w800/` and `/w1200/` in CDN URLs, but these higher resolution paths may not exist on the Resales Online CDN, causing 404 errors that trigger the `onError` fallback to `/placeholder.svg`.

## Root Cause

The CDN URL pattern `https://cdn.resales-online.com/public/{hash}/properties/{id}/w400/{filename}.jpg` works with `/w400/`, but the transformed paths (`/w800/`, `/w1200/`) may not be available for all properties.

## Solution

Revert the image transformer to a simple pass-through function that returns the original URL unchanged. This will restore visibility of all property images at their original w400 resolution.

## Implementation

### Single File Change

**File: `src/lib/imageUrlTransformer.ts`**

Replace the current implementation with:

```typescript
/**
 * Image URL utility for Resales Online CDN
 * 
 * Currently returns URLs unchanged. High-resolution upgrade 
 * should only be re-enabled after verifying CDN support.
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  return url; // Return original URL unchanged
}
```

## Why This Works

1. The original `/w400/` URLs from the API are known to work (verified in network requests showing successful property data with w400 image URLs)
2. The function signature remains the same, so all 8 files that import it will continue to work without modification
3. Images will display at 400px resolution (may appear blurry on larger displays, but visible)

## Files Affected

| File | Change |
|------|--------|
| `src/lib/imageUrlTransformer.ts` | Revert to pass-through mode |

## Verification Steps

After deployment:

1. Navigate to `/en/properties?transactionType=sale&newDevs=only`
2. Confirm property cards show actual property photos (not placeholder icons)
3. Click on a property to verify detail page images also work

## Next Steps (After Images Are Restored)

Once images are confirmed working:

1. Use browser Network tab to test if `/w800/` or `/w1200/` paths exist for a sample property
2. If high-res paths work, re-implement with proper error handling
3. Consider adding `onError` fallback to original URL before showing placeholder

