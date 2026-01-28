
# Property Type Labels and Navigation Enhancement

## Current State

The retargeting page header has navigation links for "Apartments", "Penthouses", "Townhouses", and "Villas" that currently redirect to the external Property Finder page (`/{lang}/property-finder?type=X`).

The properties displayed on the retargeting page:
- Come from the Supabase `properties` table
- Have a `category` column with values: `apartment` or `villa`
- Do NOT display any property type badge/label on the cards

**Active Properties in Database:**
| Property Name | Category |
|---------------|----------|
| MORASOL | apartment |
| 360 | apartment |
| ALURA LIVING | apartment |
| EVOQUE | apartment |
| ONE ESTEPONA | apartment |
| Casatalaya Residences | apartment |
| SAVIA | villa |
| BENJAMINS DERAM | villa |
| TERRA NOVA HILLS | villa |
| THE KOS | villa |
| VILLAS AZAHAR SOLEA | villa |
| Villa Serenity | villa |

---

## Solution

### 1. Add Property Type Badges to Cards

Display a colored badge on each property card showing its category (Apartment or Villa). The badge will use the `category` field from the database.

**Visual Design:**
- Position: Top-right corner of the image (opposite the price badge)
- Style: Glassmorphism with color coding
  - Apartments: Blue tint (`bg-blue-500/90`)
  - Villas: Green tint (`bg-emerald-500/90`)
- Text: Localized property type name

### 2. Add Localized Property Type Labels

Add translation keys for property type labels in all 10 languages:

| Language | Apartment | Villa |
|----------|-----------|-------|
| English | Apartment | Villa |
| Dutch | Appartement | Villa |
| German | Apartment | Villa |
| French | Appartement | Villa |
| Finnish | Huoneisto | Huvila |
| Polish | Apartament | Willa |
| Swedish | Lägenhet | Villa |
| Danish | Lejlighed | Villa |
| Hungarian | Apartman | Villa |
| Norwegian | Leilighet | Villa |

### 3. Update Header Navigation

Change the navbar links to scroll to the properties section on the same page (with category anchors) instead of redirecting to the external Property Finder.

**New Behavior:**
- Clicking "Apartments" scrolls to the properties section and optionally highlights apartment properties
- Clicking "Villas" scrolls to the properties section and optionally highlights villa properties
- "Penthouses" and "Townhouses" can either be removed (since no properties exist with those categories) OR redirect to the external Property Finder for those types

**Recommended Approach:** Keep external links for Penthouses/Townhouses (they go to the broader Property Finder), but add smooth-scroll anchor links for Apartments/Villas to the on-page properties section.

---

## Implementation Details

### File: `src/lib/retargetingTranslations.ts`

Add new translation keys for each language:
```typescript
// Property type labels
propertyTypeApartment: "Apartment",
propertyTypeVilla: "Villa",
```

### File: `src/components/retargeting/RetargetingProjects.tsx`

1. **Add Property interface update:**
```typescript
interface Property {
  // ... existing fields
  category: string | null; // Add category field
}
```

2. **Update Supabase query to select category:**
```typescript
.select("id, internal_name, location, beds_min, beds_max, baths, size_sqm, price_eur, images, descriptions, category")
```

3. **Add helper function for localized property type:**
```typescript
const getPropertyTypeLabel = (category: string | null, t: any): string => {
  if (!category) return "";
  if (category === "apartment") return t.propertyTypeApartment;
  if (category === "villa") return t.propertyTypeVilla;
  return category;
};
```

4. **Add badge in property card (after price badge):**
```tsx
{/* Property Type Badge */}
{property.category && (
  <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-md ${
    property.category === 'apartment' 
      ? 'bg-blue-500/90 text-white' 
      : 'bg-emerald-500/90 text-white'
  }`}>
    <span className="text-xs font-medium uppercase tracking-wide">
      {getPropertyTypeLabel(property.category, t)}
    </span>
  </div>
)}
```

5. **Add section ID for anchor navigation:**
```tsx
<section id="properties" className="relative bg-gradient-to-br ...">
```

### File: `src/pages/RetargetingLanding.tsx`

Update header links for Apartments and Villas to use anchor navigation:
```tsx
<a
  href="#properties"
  onClick={(e) => {
    e.preventDefault();
    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
  }}
  className="text-landing-navy/70 hover:text-landing-navy transition-colors"
>
  {t.headerApartments}
</a>
```

Keep external links for Penthouses and Townhouses:
```tsx
<Link
  to={`/${language}/property-finder?type=penthouse`}
  className="text-landing-navy/70 hover:text-landing-navy transition-colors"
>
  {t.headerPenthouses}
</Link>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/retargetingTranslations.ts` | Add `propertyTypeApartment` and `propertyTypeVilla` translation keys for all 10 languages |
| `src/components/retargeting/RetargetingProjects.tsx` | Add category to interface, update query, add type badge to cards, add section ID |
| `src/pages/RetargetingLanding.tsx` | Update Apartments/Villas links to scroll to properties section |

---

## Expected Result

After implementation:
1. Each property card displays a colored badge showing "Apartment" or "Villa" (in the page's language)
2. Clicking "Apartments" or "Villas" in the navbar smoothly scrolls to the properties section
3. Clicking "Penthouses" or "Townhouses" goes to the Property Finder (since no retargeting properties have those categories)
4. Users can easily distinguish between property types at a glance
