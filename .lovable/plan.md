

# Update Property Guides from 2024 → 2026

## Problem Identified

Multiple references to **"2024"** appear in Property Guides, Buyers Guides, and Investment Highlights across all 10 languages. These need to be updated to **"2026"** to reflect current market content.

---

## Files Requiring Updates

### 1. Main Translation Files (10 files × 2 strings each = 20 changes)

Each language file has `valueGrowth` and `propertyGuide` strings with "2024":

| File | valueGrowth | propertyGuide |
|------|-------------|---------------|
| `src/i18n/translations/en.ts` | Line 265: `"Value Growth 2024"` | Line 275: `"{city} Property Guide 2024"` |
| `src/i18n/translations/de.ts` | Line 261: `"Wertzuwachs 2024"` | Line 269: `"{city} Immobilienführer 2024"` |
| `src/i18n/translations/nl.ts` | Line 261: `"Waardestijging 2024"` | Line 269: `"{city} Vastgoedgids 2024"` |
| `src/i18n/translations/fr.ts` | Line 261 | Line 269 |
| `src/i18n/translations/pl.ts` | Line 261: `"Wzrost Wartości 2024"` | Line 269: `"Przewodnik po Nieruchomościach {city} 2024"` |
| `src/i18n/translations/sv.ts` | Line 261: `"Värdetillväxt 2024"` | Line 269: `"{city} Fastighetsguide 2024"` |
| `src/i18n/translations/da.ts` | Line 261: `"Værditilvækst 2024"` | Line 269: `"{city} Ejendomsguide 2024"` |
| `src/i18n/translations/hu.ts` | Line 261: `"Értéknövekedés 2024"` | Line 269: `"{city} Ingatlan Útmutató 2024"` |
| `src/i18n/translations/fi.ts` | Line 261: `"Arvonnousu 2024"` | Line 269: `"{city} Kiinteistöopas 2024"` |
| `src/i18n/translations/no.ts` | Line 261: `"Verdiøkning 2024"` | Line 269: `"{city} Eiendomsguide 2024"` |

### 2. Buyers Guide Badge (10 files × 1 string = 10 changes)

Each Buyers Guide has a hero badge at Line 7:

| File | Current Badge |
|------|---------------|
| `src/i18n/translations/buyersGuide/en.ts` | `"Complete 2024 Guide"` |
| `src/i18n/translations/buyersGuide/de.ts` | `"Kompletter Leitfaden 2024"` |
| `src/i18n/translations/buyersGuide/nl.ts` | `"Complete Gids 2024"` |
| `src/i18n/translations/buyersGuide/fr.ts` | `"Guide Complet 2024"` |
| `src/i18n/translations/buyersGuide/pl.ts` | `"Kompletny Przewodnik 2024"` |
| `src/i18n/translations/buyersGuide/sv.ts` | `"Komplett Guide 2024"` |
| `src/i18n/translations/buyersGuide/da.ts` | `"Komplet Guide 2024"` |
| `src/i18n/translations/buyersGuide/hu.ts` | `"Teljes Útmutató 2024"` |
| `src/i18n/translations/buyersGuide/fi.ts` | `"Täydellinen Opas 2024"` |
| `src/i18n/translations/buyersGuide/no.ts` | `"Komplett Guide 2024"` |

### 3. Component Files (2 files × 1 change each = 2 changes)

| File | Line | Current Value |
|------|------|---------------|
| `src/components/brochures/BrochureOptInForm.tsx` | 219 | Hardcoded: `{cityName} Property Guide 2024` |
| `src/components/brochures/InvestmentHighlights.tsx` | 79 | Fallback: `"Value Growth 2024"` |

---

## Summary

| Category | Files | Changes |
|----------|-------|---------|
| Main translations (10 langs × 2 strings) | 10 | 20 |
| Buyers Guide badges (10 langs) | 10 | 10 |
| BrochureOptInForm.tsx | 1 | 1 |
| InvestmentHighlights.tsx | 1 | 1 |
| **Total** | **22 files** | **32 changes** |

---

## Implementation Steps

1. **Main Translation Files** - Update all 10 language files:
   - Change `valueGrowth: "... 2024"` → `"... 2026"`
   - Change `propertyGuide: "... 2024"` → `"... 2026"`

2. **Buyers Guide Files** - Update all 10 language files:
   - Change `badge: "... 2024"` → `"... 2026"`

3. **BrochureOptInForm.tsx** - Replace hardcoded English string with localized translation key to ensure proper localization

4. **InvestmentHighlights.tsx** - Update fallback text from `"Value Growth 2024"` → `"Value Growth 2026"`

---

## Technical Notes

- All changes are simple string replacements: `2024` → `2026`
- The BrochureOptInForm fix also improves localization by using the translation key instead of hardcoded English
- No database or API changes required - purely frontend translation updates

