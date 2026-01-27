

# Fix Property Detail Page Images

## Problem Summary

The property detail page at `/property/[reference]` shows no images because the `get-property-details` edge function is returning empty image data. The proxy server returns data correctly, but the edge function fails to extract and normalize it properly.

## Root Cause

The `get-property-details` edge function has two issues:

1. **Response extraction mismatch** (line 37): The code tries `data.Property?.[0] || data.property || data` but the proxy may return a different structure
2. **Different normalization logic** than `search-properties` which works correctly

## Solution

Update `supabase/functions/get-property-details/index.ts` to:

1. Add detailed logging of the raw proxy response to understand the actual data structure
2. Align the response extraction logic with how `search-properties` handles it
3. Use the same proven image extraction logic from `search-properties`

## Implementation

### Step 1: Add Debug Logging

Add console logging of the raw proxy response to understand the actual data structure:

```typescript
const data = await response.json();
console.log('✅ Proxy response received');
console.log('📦 Raw response keys:', Object.keys(data));
console.log('📦 Property array?:', data.Property?.length);
console.log('📦 Has property?:', !!data.property);
```

### Step 2: Fix Response Extraction

Update the response extraction to handle all possible proxy response formats:

```typescript
// Handle proxy response formats - check all possible structures
const rawProp = data.Property?.[0] || 
                data.property?.[0] ||
                data.property || 
                (data.Reference ? data : null);
```

### Step 3: Align Image Extraction with Working Code

Replace the complex `extractMainImage` and `extractImages` functions with the simpler, proven logic from `search-properties`:

```typescript
function extractMainImage(raw: any): string {
  return raw.Pictures?.Picture?.[0]?.PictureURL ||
         raw.MainImage ||
         raw.Pictures?.[0]?.PictureURL ||
         raw.Pictures?.[0] ||
         '';
}

function extractImages(raw: any): string[] {
  let images: string[] = [];
  if (raw.Pictures?.Picture && Array.isArray(raw.Pictures.Picture)) {
    images = raw.Pictures.Picture.map((p: any) => p.PictureURL || p).filter(Boolean);
  } else if (Array.isArray(raw.Pictures)) {
    images = raw.Pictures.map((p: any) => typeof p === 'string' ? p : p.PictureURL || p).filter(Boolean);
  }
  return images;
}
```

### Step 4: Add Fallback Logging

Add logging when image extraction returns empty to help debug future issues:

```typescript
const mainImage = extractMainImage(rawProp);
const images = extractImages(rawProp);

if (!mainImage && images.length === 0) {
  console.warn('⚠️ No images extracted. Raw Pictures data:', JSON.stringify(rawProp.Pictures || rawProp.pictures || 'none'));
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-property-details/index.ts` | Fix response extraction, align image extraction logic, add debug logging |

## Technical Details

The edge function needs these specific updates:

1. Lines 33-37: Fix response extraction to handle all proxy formats
2. Lines 89-102: Replace `extractMainImage` with simpler working logic
3. Lines 107-121: Replace `extractImages` with simpler working logic
4. Add console logging for debugging

## Testing

After implementation:
1. Deploy the edge function
2. Check edge function logs for the raw response structure
3. Navigate to a property detail page (e.g., `/en/property/R5212369`)
4. Verify images now load correctly
5. Confirm the image transformer still works (images should display at w400 resolution with pass-through mode)

## Expected Outcome

Property detail pages will display:
- Main hero image in the gallery
- All property images in the gallery grid
- Thumbnail navigation in lightbox
- Images loading at w400 resolution (current pass-through mode)

