

## Redesign Apartments Property Cards

### What Changes

**Remove from cards:**
- Property type badge (APARTMENT, VILLA, PENTHOUSE, TOWNHOUSE) on images
- Status badge (FOR SALE, NEW DEVELOPMENT) on images

**New card design (matching reference):**

The cards will follow the clean style from the reference screenshot:

1. **Image area** with rounded top corners
   - Bedroom count badge (top-left, small dark pill with bed icon + count/range)
   - Price overlay (bottom-left, "From" label + price in white text on dark gradient)
   - No property type or status tags anywhere

2. **Content area** below image
   - Property title (bold, dark)
   - Location with map pin icon
   - Short description as a brief text snippet (1-2 lines)
   - Bottom row: bed count, bath count, sqm -- and a "Find Out More" / "View" gold button on the right

### File Changed

**`src/components/apartments/ApartmentsPropertiesSection.tsx`** -- PropertyCard component redesign:

- Remove the `property_type` badge (lines 53-57)
- Remove the `status` badge (lines 58-62)
- Move the bedroom count into a small badge on the top-left of the image (dark rounded pill with bed icon)
- Move the price from the bottom-right to the bottom-left with a gradient overlay, showing "From" label above the price in white text
- Keep the content section (title, location, description, stats, View button) largely the same but adjust spacing to match the cleaner reference style
- The overall card keeps its rounded corners, white background, and border styling

### No other files affected
This is a single-component change within the PropertyCard sub-component of ApartmentsPropertiesSection.

