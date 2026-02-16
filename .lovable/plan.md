

## Translate Apartments Page to All 9 Languages

### Overview
Create an edge function that uses AI to translate the English apartments page content and all 11 properties into 9 languages (nl, fr, de, fi, pl, da, hu, sv, no), keeping the same images, prices, and numeric data. Also fix the canonical URLs to use the production domain and ensure perfect hreflang tags.

### What Gets Translated

**Page Content** (per language):
- headline, subheadline, cta_text
- meta_title, meta_description
- hero_image_alt

**Properties** (11 properties x 9 languages = 99 new rows):
- title, short_description, description
- featured_image_alt

**What stays the same across all languages:**
- Images (featured_image_url, gallery_images, hero_image_url)
- Prices, bedrooms, bathrooms, sqm
- Location names (Spanish place names stay as-is)
- property_type, display_order, visible, status

### Implementation

**1. Edge Function: `translate-apartments`**

- Accepts a POST request (admin-only)
- Reads all English page content and properties
- For each of the 9 target languages, calls the Lovable AI (Gemini 2.5 Flash) to translate the text fields
- Assigns a shared `property_group_id` UUID to each English property and its translations so they are linked across languages
- Upserts translated page content rows and sets `is_published = true`
- Inserts translated property rows with the same images/numeric data

**2. Fix Canonical URLs and Hreflang Tags**

Update `ApartmentsLanding.tsx`:
- Change base URL from `blog-knowledge-vault.lovable.app` to `www.delsolprimehomes.com`
- Hreflang tags and canonical already cover all 10 languages -- just the domain needs fixing

**3. Localize the "View Properties" Button**

The header button text "View Properties" is currently hardcoded in English. Add a small translation map so it displays in the correct language.

### Data Flow

```text
English page content (1 row)
  --> AI translates to 9 languages
  --> 9 rows upserted into apartments_page_content (is_published=true)

English properties (11 rows)
  --> AI translates text fields for 9 languages
  --> 99 rows inserted into apartments_properties
  --> Each group linked by property_group_id
```

### Technical Details

**Edge Function: `supabase/functions/translate-apartments/index.ts`**

- Uses Gemini 2.5 Flash via Lovable AI gateway for cost-efficient translation
- Sends a batch prompt per language with all text fields to translate at once (reduces API calls)
- Returns JSON with translated fields
- Handles errors gracefully per language (skips failed translations, logs errors)
- Sets `property_group_id` on English source properties that don't have one yet

**File Changes:**

1. **New**: `supabase/functions/translate-apartments/index.ts` -- the translation edge function
2. **Edit**: `src/pages/apartments/ApartmentsLanding.tsx`:
   - Fix canonical/hreflang base URL to `https://www.delsolprimehomes.com`
   - Add translation map for the "View Properties" button text
3. No database schema changes needed -- all columns already exist

### Execution Plan

After approval:
1. Create the edge function
2. Update the landing page URLs and button text
3. Deploy the edge function
4. Call it to populate all 9 languages
5. Verify the data was inserted correctly

