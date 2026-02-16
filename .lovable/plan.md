

## Enhance Apartments Properties Editor

### What Changes

**1. Add bedroom range support (e.g., "2-4")**
- Add a `bedrooms_max` column to the `apartments_properties` table (nullable integer, defaults to null)
- When `bedrooms_max` is set and greater than `bedrooms`, display as a range (e.g., "2 - 4") in the table
- In the form, show two side-by-side inputs: "Bedrooms Min" and "Bedrooms Max"

**2. Add image upload**
- Replace the "Featured Image URL" text input with a file upload field
- Upload images to the existing `property-images` storage bucket
- Show a thumbnail preview of the current image in the form
- Keep the URL field as a fallback (hidden/secondary) for externally hosted images

**3. Improve description fields in the form**
- The form already has description and short description fields -- make them more prominent
- Short description: keep as a single-line `Input` with a character hint (e.g., "Brief summary for cards")
- Description: keep as a multi-row `Textarea` with more rows for comfortable editing

**4. Show short description in the table**
- Add a "Description" column to the properties table showing a truncated short_description

### Technical Details

**Database migration:**
```sql
ALTER TABLE apartments_properties 
ADD COLUMN bedrooms_max integer DEFAULT NULL;
```

**Form changes in `ApartmentsProperties.tsx`:**
- Add `bedrooms_max` to the `Property` interface and `emptyProperty` defaults
- Split bedrooms row into "Bedrooms Min" / "Bedrooms Max" inputs
- Add image file upload with preview using the `property-images` bucket
- Table "Beds" column: show `bedrooms` or `bedrooms - bedrooms_max` when max exists

**Image upload flow:**
- User selects a file via `<input type="file">`
- File uploads to `property-images` bucket with a unique path
- Public URL is stored in `featured_image_url`
- A thumbnail preview appears in the form after upload

**Property type dropdown update:**
- Add missing types: `villa`, `townhouse` to match existing data in the database
