
## Add "Translate to All Languages" Button to Apartments & Villas Admin

### What's Needed

The backend translation infrastructure is already fully built:
- `supabase/functions/translate-apartments` — reads all 12 English apartment properties and translates title, short description, full description, and image alt text into 9 languages (NL, FR, DE, FI, PL, DA, HU, SV, NO), copying price, beds, baths, sqm, images, status, and display order exactly as-is.
- `supabase/functions/translate-villas` — same for villas.

**The only missing piece is a button in the UI** to trigger these functions. There is currently no button on the `ApartmentsProperties` admin page to call them.

### What Gets Translated vs. Copied

| Field | Action |
|---|---|
| Title | AI translated |
| Short Description | AI translated |
| Full Description | AI translated |
| Image Alt Text | AI translated |
| Price | Copied exactly |
| Bedrooms / Bathrooms / SQM | Copied exactly |
| Featured Image URL | Copied exactly |
| Location (Spanish place names) | Kept as-is (Marbella, Estepona, etc.) |
| Status | Copied exactly |
| Display Order / Visible / Featured | Copied exactly |

### What Will Change

**`src/pages/admin/ApartmentsProperties.tsx`** — Only file to edit.

Add to the `PropertiesManager` component:

1. A `translating` state (`useState(false)`)
2. A `handleTranslateAll` async function that:
   - Calls `supabase.functions.invoke('translate-apartments')` or `'translate-villas'` based on the `tableName` prop
   - Shows a loading spinner during translation (takes ~60-90 seconds for 9 languages with delays)
   - Shows a success toast: "All 12 properties translated to 9 languages!"
   - Refreshes the current language view after completion
   - Handles errors with a destructive toast
3. A **"Translate to All Languages"** button with a `Languages` icon (from lucide-react) in the header area next to the existing "Add Property" button
   - Disabled when `translating` is true or when `lang !== "en"` (since it always reads from EN)
   - Shows spinner + "Translating..." text while running

### User Experience

```text
Admin is on Apartments tab, EN selected
  ↓
Sees 12 properties listed
  ↓
Clicks "Translate to All Languages" button
  ↓
Button shows spinner: "Translating... (~90s)"
  ↓
Edge function: reads 12 EN properties → translates to NL, FR, DE, FI, PL, DA, HU, SV, NO
  ↓
Toast: "All 12 properties translated to 9 languages!"
  ↓
Admin switches to FR tab — sees all 12 properties in French
  (same price, same beds, same images — only text fields translated)
```

### Technical Details

- The function call will use `supabase.functions.invoke('translate-apartments')` for apartments and `supabase.functions.invoke('translate-villas')` for villas — the correct function is selected automatically based on the `tableName` prop already passed to `PropertiesManager`.
- The edge function already has a 2-second delay between each language to avoid AI rate limits, meaning the full translation takes about 90 seconds for all 9 languages.
- The button will show a note: "(Only runs from EN — reads English properties)" so the admin understands it always sources from English.
- The button is disabled when viewing a non-EN language tab to prevent confusion.

### No Database Changes Needed

The `apartments_properties` and `villas_properties` tables already have all required columns (`property_group_id`, `gallery_images`, `features`, etc.) and the edge functions already handle the delete-then-insert pattern for clean language updates.
