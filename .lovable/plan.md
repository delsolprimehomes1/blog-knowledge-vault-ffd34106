
# Display All Properties with Localized Content on Retargeting Pages

## Current State

The `RetargetingProjects` component currently:
1. **Limits to 4 properties** via `.limit(4)` in the query
2. **Displays `internal_name`** instead of localized descriptions
3. **Shows a 4-column grid** that would be cramped with more properties

The `properties` table already has **multilingual content** stored in a `descriptions` JSONB column with keys for all 10 languages: `en`, `nl`, `de`, `fr`, `es`, `pl`, `sv`, `da`, `hu`, `fi`, `no`.

**Total active properties**: 12

---

## Solution

### 1. Remove the 4-property limit and fetch all active properties

Modify the Supabase query to remove `.limit(4)` and select the `descriptions` JSONB field along with other fields.

### 2. Display localized descriptions

Extract the property description based on the current page language from the `descriptions` object. For example:
- On `/en/welcome-back`: Show `property.descriptions.en`
- On `/nl/welkom-terug`: Show `property.descriptions.nl`
- On `/fi/tervetuloa-takaisin`: Show `property.descriptions.fi`

### 3. Improve grid layout for more properties

Change from a fixed 4-column grid to a responsive layout that accommodates 12+ properties elegantly:
- Mobile: 1 column
- Tablet: 2 columns  
- Desktop: 3 columns

This provides more space for each card while keeping all properties visible.

### 4. Add localized description to property cards

Display a 2-line truncated description below the property stats, pulled from the correct language key in the `descriptions` JSONB.

---

## Implementation Details

### File: `src/components/retargeting/RetargetingProjects.tsx`

**Changes:**

1. **Update Property interface** to include the typed descriptions object:
```typescript
interface Property {
  id: string;
  internal_name: string;
  location: string;
  beds_min: number | null;
  beds_max: number | null;
  baths: number | null;
  size_sqm: number | null;
  price_eur: number | null;
  images: unknown;
  descriptions: Record<string, string> | null;
}
```

2. **Remove `.limit(4)`** from the Supabase query

3. **Add helper function to get localized description**:
```typescript
const getLocalizedDescription = (
  descriptions: Record<string, string> | null, 
  language: string
): string => {
  if (!descriptions) return "";
  return descriptions[language] || descriptions["en"] || "";
};
```

4. **Update grid classes** for better layout:
```typescript
// From: "grid md:grid-cols-2 lg:grid-cols-4 gap-6"
// To:   "grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
```

5. **Add description display** in each property card:
```tsx
{/* Localized Description */}
<p className="text-sm text-landing-navy/60 mb-4 line-clamp-2">
  {getLocalizedDescription(property.descriptions as Record<string, string> | null, language)}
</p>
```

6. **Update loading skeleton** to match new 3-column layout:
```typescript
// Show 6 skeleton items instead of 4
{[1, 2, 3, 4, 5, 6].map((i) => (...))}
```

---

## Technical Notes

### Language Mapping
The `descriptions` JSONB in the database uses these exact keys:
- `en` - English
- `nl` - Dutch
- `de` - German
- `fr` - French
- `es` - Spanish (used for context)
- `pl` - Polish
- `sv` - Swedish
- `da` - Danish
- `hu` - Hungarian
- `fi` - Finnish
- `no` - Norwegian

These match the language codes passed to `RetargetingProjects` via the `language` prop.

### Fallback Strategy
If a description doesn't exist for the current language, fall back to English (`en`), then to an empty string.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/retargeting/RetargetingProjects.tsx` | Remove limit, add localized descriptions, update grid layout |

---

## Expected Result

After implementation:
- **All 12 properties** will display on retargeting pages
- **Finnish page** (`/fi/tervetuloa-takaisin`) will show Finnish descriptions
- **Dutch page** (`/nl/welkom-terug`) will show Dutch descriptions
- **All 10 language pages** will show their respective translations
- Property cards will be larger and more readable in a 3-column layout
- Each card will include a 2-line localized description

