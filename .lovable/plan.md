
# Fix Image Transformer for High-Resolution Images

## Overview

Update `src/lib/imageUrlTransformer.ts` to transform Resales Online CDN URLs from `/w400/` to higher resolutions based on display context. This will make property images crisp on detail pages and galleries.

## URL Structure (Confirmed)

The API returns URLs in this format:
```
https://cdn.resales-online.com/public/{hash}/properties/{id}/w400/{filename}.jpg
```

## Resolution Mapping

| Size Parameter | Target Resolution | Use Case |
|----------------|-------------------|----------|
| `thumbnail` | `/w400/` | Small navigation thumbnails (keep as-is) |
| `card` | `/w800/` | Property cards on listings page |
| `hero` | `/w1200/` | Hero images on property detail |
| `lightbox` | `/w1200/` | Full-screen gallery modal |

## Implementation

Replace the current pass-through function with URL transformation logic:

```typescript
/**
 * Image URL utility for Resales Online CDN
 * 
 * Transforms w400 URLs to higher resolutions based on display context.
 * URL pattern: .../w400/filename.jpg → .../w1200/filename.jpg
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  
  // Define resolution mapping
  const resolutionMap: Record<typeof size, string> = {
    thumbnail: 'w400',   // 400px - small thumbnails
    card: 'w800',        // 800px - property cards
    hero: 'w1200',       // 1200px - hero images
    lightbox: 'w1200',   // 1200px - full-screen gallery
  };
  
  const targetResolution = resolutionMap[size];
  
  // Transform /w400/ to target resolution
  if (url.includes('/w400/')) {
    return url.replace('/w400/', `/${targetResolution}/`);
  }
  
  // Return original URL if pattern not found
  return url;
}
```

## Example Transformations

**Property Card (size='card'):**
```
Input:  https://cdn.resales-online.com/public/abc123/properties/12345/w400/living-room.jpg
Output: https://cdn.resales-online.com/public/abc123/properties/12345/w800/living-room.jpg
```

**Hero/Lightbox (size='hero' or 'lightbox'):**
```
Input:  https://cdn.resales-online.com/public/abc123/properties/12345/w400/living-room.jpg
Output: https://cdn.resales-online.com/public/abc123/properties/12345/w1200/living-room.jpg
```

## Components Using This Function

These components already pass the correct `size` parameter and will automatically benefit:

- `PropertyCard.tsx` → `card` → w800
- `PropertyGalleryGrid.tsx` → `hero`/`lightbox`/`card`/`thumbnail` → appropriate resolution
- `PropertyHero.tsx` → `hero`/`lightbox` → w1200
- `PropertyGallery.tsx` → `hero`/`lightbox` → w1200
- `PropertyImageCarousel.tsx` → `card` → w800

## Technical Notes

- Simple string replacement - no regex needed
- Falls back to original URL if `/w400/` pattern not found
- Handles null/undefined URLs with placeholder fallback
- Client-side only - no backend changes required
