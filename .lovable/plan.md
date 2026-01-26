
# Property Finder Multilingual Translation Implementation

## Problem Summary

The Property Finder page (`/{lang}/properties`) shows English text for all 9 non-English languages. While the URL includes the language code and the Header/Footer translate correctly, the page content itself contains 45+ hardcoded English strings across two files.

## Current vs Target State

| Element | Current | After Fix |
|---------|---------|-----------|
| Page title | "Find Your Dream Property" | Localized per language |
| Filter labels | English only | 10 languages |
| Placeholders | English only | 10 languages |
| Results text | English only | 10 languages |
| Empty state | English only | 10 languages |
| Pagination | English only | 10 languages |

---

## Implementation Plan

### Step 1: Create Translation Files

**New directory**: `src/i18n/translations/propertyFinder/`

Create 10 translation files following the Buyers Guide pattern:

```text
src/i18n/translations/propertyFinder/
├── index.ts        ← Export and type definitions
├── en.ts           ← English (base)
├── nl.ts           ← Dutch
├── de.ts           ← German
├── fr.ts           ← French
├── sv.ts           ← Swedish
├── no.ts           ← Norwegian
├── da.ts           ← Danish
├── fi.ts           ← Finnish
├── pl.ts           ← Polish
└── hu.ts           ← Hungarian
```

### Step 2: Define Translation Keys

Each file will include these translation sections:

```typescript
export const propertyFinderEn = {
  meta: {
    title: "Property Finder | Costa del Sol Real Estate",
    description: "Browse luxury properties on the Costa del Sol"
  },
  hero: {
    breadcrumbHome: "Home",
    breadcrumbProperties: "Properties",
    titlePrefix: "Find Your",
    titleHighlight: "Dream Property",
    titleLocationPrefix: "Properties in",
    subtitle: "Browse our curated collection of luxury properties on the stunning Costa del Sol",
    subtitleLocation: "Discover exclusive real estate opportunities in {location}, Costa del Sol"
  },
  stats: {
    properties: "Properties",
    locations: "Locations",
    experience: "Years Experience",
    trusted: "Trusted"
  },
  filters: {
    location: "Location",
    propertyType: "Property Type",
    priceRange: "Price Range",
    anyLocation: "Any Location",
    anyType: "Any Type",
    min: "Min",
    max: "Max",
    search: "Search",
    advancedFilters: "Advanced Filters",
    active: "active",
    reference: "Reference",
    sublocation: "Sublocation",
    anySublocation: "Any Sublocation",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    status: "Status",
    sales: "Sales",
    newDevelopments: "New Developments",
    reset: "Reset",
    any: "Any",
    loading: "Loading..."
  },
  results: {
    searching: "Searching...",
    properties: "properties",
    availableIn: "available in Costa del Sol",
    inLocation: "in {location}",
    sortBy: "Sort by",
    newestFirst: "Newest First",
    priceLowHigh: "Price: Low to High",
    priceHighLow: "Price: High to Low",
    mostBedrooms: "Most Bedrooms"
  },
  emptyState: {
    title: "No properties found",
    description: "We couldn't find any properties matching your criteria. Try adjusting your filters or explore a different location.",
    clearFilters: "Clear All Filters"
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of"
  }
};
```

### Step 3: Create Translation Hook

**New file**: `src/hooks/usePropertyFinderTranslation.ts`

```typescript
import { useContext } from 'react';
import { LanguageContext } from '@/i18n/LanguageContext';
import { getPropertyFinderTranslation, PropertyFinderTranslations } from '@/i18n/translations/propertyFinder';
import { Language } from '@/types/home';

export const usePropertyFinderTranslation = (): { 
  t: PropertyFinderTranslations; 
  currentLanguage: Language 
} => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    return { 
      t: getPropertyFinderTranslation(Language.EN), 
      currentLanguage: Language.EN 
    };
  }
  
  const { currentLanguage } = context;
  const t = getPropertyFinderTranslation(currentLanguage);
  
  return { t, currentLanguage };
};
```

### Step 4: Update PropertyFinder.tsx

Integrate the translation hook and replace all hardcoded strings:

**Before:**
```typescript
<span>Find Your </span>
<span>Dream Property</span>
```

**After:**
```typescript
const { t } = usePropertyFinderTranslation();
// ...
<span>{t.hero.titlePrefix} </span>
<span>{t.hero.titleHighlight}</span>
```

Key replacements in PropertyFinder.tsx:
- Lines 121-126: Stats labels
- Lines 151-153: Breadcrumbs
- Lines 172-194: Hero section
- Lines 253-261: Results summary
- Lines 273-276: Sort options
- Lines 359-369: Empty state
- Lines 415-454: Pagination buttons

### Step 5: Update PropertyFilters.tsx

Pass translations via props or use the hook directly:

**Before:**
```typescript
<label>Location</label>
<SelectValue placeholder="Any Location" />
```

**After:**
```typescript
const { t } = usePropertyFinderTranslation();
// ...
<label>{t.filters.location}</label>
<SelectValue placeholder={t.filters.anyLocation} />
```

Key replacements in PropertyFilters.tsx:
- Line 146: "Location" label
- Line 155, 159: "Any Location" placeholder
- Line 171: "Property Type" label
- Line 180, 184: "Any Type" placeholder
- Line 196: "Price Range" label
- Line 200, 212: "Min", "Max" placeholders
- Line 227: Search button invisible label
- Line 234: "Search" text
- Line 244: "Advanced Filters" text
- Line 258: "Reference" label
- Line 269: "Sublocation" label
- Line 275: "Any Sublocation"
- Line 282: "Bedrooms" label
- Line 299: "Bathrooms" label
- Line 316: "Status" label
- Lines 53-56: STATUS_OPTIONS array (Sales, New Developments)
- Line 340: "Reset" button text

---

## Translation Content for All 10 Languages

### Dutch (nl)
```typescript
hero: {
  titlePrefix: "Vind Uw",
  titleHighlight: "Droomwoning",
  // ...
},
filters: {
  location: "Locatie",
  propertyType: "Woningtype",
  bedrooms: "Slaapkamers",
  // ...
}
```

### German (de)
```typescript
hero: {
  titlePrefix: "Finden Sie Ihre",
  titleHighlight: "Traumimmobilie",
  // ...
},
filters: {
  location: "Standort",
  propertyType: "Immobilientyp",
  bedrooms: "Schlafzimmer",
  // ...
}
```

### French (fr)
```typescript
hero: {
  titlePrefix: "Trouvez Votre",
  titleHighlight: "Propriété de Rêve",
  // ...
}
```

### Swedish (sv)
```typescript
hero: {
  titlePrefix: "Hitta Din",
  titleHighlight: "Drömbostad",
  // ...
}
```

### Norwegian (no)
```typescript
hero: {
  titlePrefix: "Finn Din",
  titleHighlight: "Drømmebolig",
  // ...
}
```

### Danish (da)
```typescript
hero: {
  titlePrefix: "Find Din",
  titleHighlight: "Drømmebolig",
  // ...
}
```

### Finnish (fi)
```typescript
hero: {
  titlePrefix: "Löydä",
  titleHighlight: "Unelmiesi Asunto",
  // ...
}
```

### Polish (pl)
```typescript
hero: {
  titlePrefix: "Znajdź Swoją",
  titleHighlight: "Wymarzoną Nieruchomość",
  // ...
}
```

### Hungarian (hu)
```typescript
hero: {
  titlePrefix: "Találja Meg",
  titleHighlight: "Álmai Otthonát",
  // ...
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/i18n/translations/propertyFinder/index.ts` | Create |
| `src/i18n/translations/propertyFinder/en.ts` | Create |
| `src/i18n/translations/propertyFinder/nl.ts` | Create |
| `src/i18n/translations/propertyFinder/de.ts` | Create |
| `src/i18n/translations/propertyFinder/fr.ts` | Create |
| `src/i18n/translations/propertyFinder/sv.ts` | Create |
| `src/i18n/translations/propertyFinder/no.ts` | Create |
| `src/i18n/translations/propertyFinder/da.ts` | Create |
| `src/i18n/translations/propertyFinder/fi.ts` | Create |
| `src/i18n/translations/propertyFinder/pl.ts` | Create |
| `src/i18n/translations/propertyFinder/hu.ts` | Create |
| `src/hooks/usePropertyFinderTranslation.ts` | Create |
| `src/pages/PropertyFinder.tsx` | Modify |
| `src/components/property/PropertyFilters.tsx` | Modify |

---

## Validation

After implementation, test all 10 language versions:

| URL | Expected Result |
|-----|-----------------|
| `/en/properties` | English UI |
| `/nl/properties` | Dutch UI |
| `/de/properties` | German UI |
| `/fr/properties` | French UI |
| `/sv/properties` | Swedish UI |
| `/no/properties` | Norwegian UI |
| `/da/properties` | Danish UI |
| `/fi/properties` | Finnish UI |
| `/pl/properties` | Polish UI |
| `/hu/properties` | Hungarian UI |

Check these elements per language:
- Hero title and subtitle
- All filter labels and placeholders
- Sort dropdown options
- Results summary text
- Empty state messages
- Pagination buttons
