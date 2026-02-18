
## Add "Auto-Translate from English" Button to Apartments Page Content

### What This Adds

A single **"Translate from English"** button on the Apartments Page Content admin page that:
1. Reads the currently saved English (EN) content from the database
2. Sends the translatable text fields to the AI translation service
3. Automatically saves translated content for all 9 other languages (NL, FR, DE, FI, PL, DA, HU, SV, NO)
4. Non-translatable fields (image URLs, video URLs, embed codes, switches) are copied as-is from English

### Fields That Will Be Auto-Translated
- Headline
- Subheadline
- CTA Text
- Hero Image Alt
- Meta Title
- Meta Description

### Fields Copied As-Is (Not Translated)
- Hero Image URL
- Video URL / Thumbnail URL
- Elfsight Embed Code
- Video Enabled / Reviews Enabled / Is Published switches

### How It Works

The existing `translate-property-description` edge function already handles multi-language translation using the AI gateway. I will create a **new edge function** (`translate-apartments-page-content`) specifically for translating all 6 text fields at once, then saving all 9 language rows to the database in a single operation.

### Files to Change

**1. `supabase/functions/translate-apartments-page-content/index.ts`** (new file)
- Accepts the English content payload
- Sends all 6 text fields to `google/gemini-2.5-flash` in a single prompt
- Returns translations for all 9 target languages
- Upserts each language row into `apartments_page_content`, preserving image URLs and switches from the existing English row

**2. `src/pages/admin/ApartmentsPageContent.tsx`** (modified)
- Add a `Sparkles` icon "Translate from English" button next to the Save button
- Button is only active when viewing the EN tab (or always active — it always reads from EN)
- Shows a loading spinner while translating
- After completion, toasts success and refreshes the current language tab view
- The button text changes to "Translating... (9 languages)" while running

### User Experience Flow

```text
Admin opens Apartments Page Content
   ↓
Types content in EN tab and saves
   ↓
Clicks "Translate from English" button
   ↓
Button shows spinner: "Translating 9 languages..."
   ↓
Edge function reads EN row, translates all fields
   ↓
All 9 language rows saved to database
   ↓
Toast: "All 9 languages translated and saved!"
   ↓
Admin can switch tabs to verify translations
```

### Technical Details

- The edge function will batch all 6 fields into a single AI call per language to minimize API calls (9 total calls, one per language)
- Uses the existing `LOVABLE_API_KEY` secret that is already configured for the `translate-property-description` function
- Upserts via `language` column — if a language row already exists it will be updated, otherwise inserted
- Non-text fields are copied directly from the English database row to preserve settings across all languages
