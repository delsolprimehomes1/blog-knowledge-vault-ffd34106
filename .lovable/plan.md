

# Revert Image Transformer to Original State

## Problem

The high-resolution image transformation broke all property images. The transformation logic assumes URLs contain `/w400/` path segments, but the actual URLs from the proxy may have a different format.

## Solution

Revert `src/lib/imageUrlTransformer.ts` to its original pass-through implementation that returns URLs unchanged.

## File Change

### `src/lib/imageUrlTransformer.ts`

```typescript
/**
 * Image URL utility for Resales Online CDN
 * 
 * Note: Currently passes through URLs unchanged while we investigate
 * the proper CDN URL structure for resolution upgrades.
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  return url;  // Return original URL unchanged
}
```

## Next Steps After Revert

To properly implement high-resolution images, we need to:

1. Check the actual image URLs being returned from the proxy server
2. Identify the correct URL pattern (the `/w400/` assumption may be wrong)
3. Verify what resolutions the CDN actually supports

## Investigation Plan

After reverting, I can:
- Check the `search-properties` Edge Function logs to see actual API responses
- Look at browser Network tab for actual image URLs being loaded
- Examine the proxy server's response format for the `images` array

This will help us understand the exact URL structure before implementing the transformation correctly.

