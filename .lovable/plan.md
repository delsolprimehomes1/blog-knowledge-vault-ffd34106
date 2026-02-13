

# Redesign Apartments Page to Google Images-Style Visual Search

## Overview
Transform the /[lang]/apartments property listings from a traditional card grid into a Google Images-style masonry layout with a hero featured property, hoverable image tiles, and a full-screen lightbox viewer. All existing sections (AutoplayVideo, EmmaSection, Reviews) are preserved.

## Database Changes

### Migration: Add new columns to `apartments_properties`
- `partner_source` (TEXT) -- e.g. "Marbella For Sale"
- `partner_logo` (TEXT) -- URL to partner logo image
- `gallery_images` (TEXT[]) -- array of real image URLs for the lightbox carousel (separate from the existing `images` JSONB which has placeholder data)

### Seed Data: Insert 8-10 sample properties
Insert sample English properties with real Unsplash image URLs covering different property types (villa, penthouse, townhouse, apartment). Each will have 4-6 gallery images, a partner source, and partner logo placeholder. This ensures the masonry grid has enough visual content to demonstrate the design.

## Page Structure (Revised Flow)

```text
Header (fixed, unchanged)
  |
Hero Featured Property (first property, full-width image)
  |
AutoplayVideo (kept as-is)
  |
EmmaSection (kept as-is)
  |
Masonry Image Grid (all properties except hero)
  |
"See More" / Load More button
  |
Elfsight Reviews (kept as-is)
  |
Footer (kept as-is)
  |
PropertyLightbox (overlay, opens on tile click)
  |
EmmaChat (overlay, unchanged)
```

## New Components

### 1. `src/components/apartments/ApartmentsHeroProperty.tsx`
Replaces the current CMS-driven `ApartmentsHero`. Displays the first (featured) property as a full-width hero:
- Full-width image (h-[500px] mobile, h-[700px] desktop)
- Gradient overlay at bottom
- Property title + location + status overlaid bottom-left
- "Visit" button top-right (branded gold instead of blue to match site theme)
- Price badge bottom-right
- Share + Save action buttons below

### 2. `src/components/apartments/ApartmentsMasonryGrid.tsx`
CSS columns-based masonry layout:
- `columns-1 md:columns-2 lg:columns-3` with `gap-3`
- `break-inside-avoid` on each tile
- Variable height tiles based on natural image aspect ratio
- Pagination: loads 20 properties initially, "See More" button loads next batch

### 3. `src/components/apartments/ApartmentsPropertyTile.tsx`
Individual tile in the masonry grid:
- Property image fills tile with `rounded-lg`
- Partner logo badge (top-left, small white pill)
- Hover overlay: darkened image with partner name + property title (bottom gradient)
- Price badge (bottom-right, visible always)
- Click triggers lightbox open

### 4. `src/components/apartments/ApartmentsPropertyLightbox.tsx`
Full-screen property viewer using Radix Dialog:
- Large image with object-contain
- Left/right navigation arrows
- Close (X) button top-right
- Info bar below image: property title, location, price
- "Visit" button (opens lead form modal, same as current click behavior)
- Share + Save action buttons
- Thumbnail strip at bottom for gallery navigation
- Keyboard navigation (arrow keys, Escape)

### 5. `src/hooks/usePropertyGallery.ts`
Lightbox state management hook:
- Current property index
- Current image index within gallery
- Navigation helpers (next/prev image, next/prev property)
- Open/close state

## Modified Components

### `ApartmentsLanding.tsx`
- Replace `<ApartmentsHero>` with `<ApartmentsHeroProperty>` (uses first fetched property)
- Replace `<ApartmentsPropertiesSection>` with `<ApartmentsMasonryGrid>`
- Add `<ApartmentsPropertyLightbox>` overlay
- Property data fetched once at page level and passed down
- Keep AutoplayVideo, EmmaSection, Reviews, Footer, EmmaChat exactly as-is

### `ApartmentsPropertiesSection.tsx`
Kept for reference but no longer imported. The masonry grid replaces it.

## Data Fetching

Single query at page level fetches all visible properties for the language:

```text
SELECT id, title, location, bedrooms, bathrooms, sqm, price, 
       property_type, status, featured_image_url, short_description,
       gallery_images, partner_source, partner_logo, images
FROM apartments_properties
WHERE language = [lang] AND visible = true
ORDER BY display_order ASC
```

First property becomes the hero. Remaining properties populate the masonry grid. Pagination is client-side initially (show 20, load more on click).

## Translations

Add to all 10 language files under a new `apartments.gallery` namespace:
- `visit` -- "Visit"
- `share` -- "Share"
- `save` -- "Save"
- `seeMore` -- "See more"
- `close` -- "Close"
- `imagesCopyright` -- "Images may be subject to copyright"
- `previousImage` -- "Previous image"
- `nextImage` -- "Next image"

## Image Handling

- Gallery images from `gallery_images` TEXT[] column (real URLs)
- Fallback: if `gallery_images` is empty, use `featured_image_url` as single-image gallery
- Lazy loading via native `loading="lazy"` on all masonry tiles
- Hero image loaded eagerly (`loading="eager"`)

## Responsive Behavior

| Breakpoint | Masonry Columns | Hero Height | Tile Gap |
|------------|----------------|-------------|----------|
| Mobile (<768px) | 1 column | 400px | 8px |
| Tablet (768-1024px) | 2 columns | 550px | 12px |
| Desktop (>1024px) | 3 columns | 700px | 12px |

## SEO Preserved

- All existing Helmet meta tags, hreflang, and schema.org markup unchanged
- Semantic HTML: h1 on hero property title, h2 on section headers
- Alt text on all property images from title + location
- Canonical URLs unchanged

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/apartments/ApartmentsHeroProperty.tsx` | Create |
| `src/components/apartments/ApartmentsMasonryGrid.tsx` | Create |
| `src/components/apartments/ApartmentsPropertyTile.tsx` | Create |
| `src/components/apartments/ApartmentsPropertyLightbox.tsx` | Create |
| `src/hooks/usePropertyGallery.ts` | Create |
| `src/pages/apartments/ApartmentsLanding.tsx` | Modify |
| 10 translation files (en.ts through no.ts) | Modify |
| Database migration (add columns) | Execute |
| Database seed (sample properties) | Execute |

