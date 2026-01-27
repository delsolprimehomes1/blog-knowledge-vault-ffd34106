
# Enable High-Resolution Image Transformer

## Overview

Update the `getHighResImageUrl` function to transform w400 CDN URLs to appropriate resolutions based on display context. This will improve image quality on property detail pages, galleries, and lightbox views without requiring any proxy server changes.

## Current State

The function in `src/lib/imageUrlTransformer.ts` is a pass-through that returns URLs unchanged:

```typescript
export function getHighResImageUrl(url, size = 'hero'): string {
  if (!url) return '/placeholder.svg';
  return url; // Always returns w400
}
```

## Resolution Mapping

| Size | Resolution | Width | Use Case |
|------|-----------|-------|----------|
| `thumbnail` | w400 | 400px | Navigation previews, small thumbnails |
| `card` | w800 | 800px | Property cards on listings page |
| `hero` | w1200 | 1200px | Hero images, main gallery display |
| `lightbox` | w1200 | 1200px | Full-screen gallery modal |

## Implementation

### File: `src/lib/imageUrlTransformer.ts`

Replace the current pass-through with URL transformation logic:

```typescript
/**
 * Image URL utility for Resales Online CDN
 * 
 * Transforms w400 URLs to higher resolutions based on display context.
 * CDN supports: w400, w800, w1200
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  
  // Define resolution mapping
  const resolutionMap: Record<typeof size, string> = {
    thumbnail: 'w400',
    card: 'w800',
    hero: 'w1200',
    lightbox: 'w1200',
  };
  
  const targetResolution = resolutionMap[size];
  
  // Transform w400 to target resolution in URL path
  // Pattern: .../w400/... → .../w800/... or .../w1200/...
  if (url.includes('/w400/')) {
    return url.replace('/w400/', `/${targetResolution}/`);
  }
  
  // Also handle w800 if upgrading to w1200
  if (url.includes('/w800/') && (size === 'hero' || size === 'lightbox')) {
    return url.replace('/w800/', '/w1200/');
  }
  
  // Return original URL if no transformation needed
  return url;
}
```

## Affected Components (No Changes Needed)

These components already pass the correct size parameter:

| Component | Size Used | Result |
|-----------|-----------|--------|
| `PropertyCard.tsx` | `card` | → w800 |
| `PropertyGalleryGrid.tsx` main | `hero` | → w1200 |
| `PropertyGalleryGrid.tsx` grid | `card` | → w800 |
| `PropertyGalleryGrid.tsx` lightbox | `lightbox` | → w1200 |
| `PropertyGalleryGrid.tsx` thumbnails | `thumbnail` | → w400 |
| `PropertyHero.tsx` main | `hero` | → w1200 |
| `PropertyHero.tsx` carousel | `thumbnail` | → w400 |
| `PropertyHero.tsx` lightbox | `lightbox` | → w1200 |
| `PropertyGallery.tsx` main | `hero` | → w1200 |
| `PropertyGallery.tsx` lightbox | `lightbox` | → w1200 |
| `PropertyImageCarousel.tsx` | `card` | → w800 |
| `BrochureGallery.tsx` | imported | depends on usage |

## Example Transformations

**Input (from proxy):**
```
https://cdn.resales-online.com/images/property/12345/w400/1-living-room.jpg
```

**Output by size:**
```
thumbnail: https://cdn.resales-online.com/images/property/12345/w400/1-living-room.jpg
card:      https://cdn.resales-online.com/images/property/12345/w800/1-living-room.jpg
hero:      https://cdn.resales-online.com/images/property/12345/w1200/1-living-room.jpg
lightbox:  https://cdn.resales-online.com/images/property/12345/w1200/1-living-room.jpg
```

## Technical Notes

- The transformation is client-side only, no backend changes needed
- Falls back to original URL if pattern not matched
- Handles edge cases (null, undefined, non-CDN URLs)
- CDN must support w800 and w1200 paths (confirmed by project memory)

## Testing

After implementation:
1. Visit `/en/properties` - cards should load w800 images
2. Click a property - hero section should load w1200
3. Open lightbox - full-screen view should be w1200
4. Check browser Network tab to verify correct URLs being requested
