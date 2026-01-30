

# Fix: Update "2024" to "2026" Across All Property Guides

## Problem Identified

The screenshot shows **"Fuengirola Property Guide 2024"** - this is outdated and needs to be **2026** across all 10 languages.

---

## Locations Requiring Updates

### 1. Translation Files - Brochure UI (10 files)

Each language file has two instances of "2024" in the `brochures.ui` section:

| File | Lines to Update |
|------|-----------------|
| `src/i18n/translations/en.ts` | `valueGrowth: "Value Growth 2024"` → `2026`<br>`propertyGuide: "{city} Property Guide 2024"` → `2026` |
| `src/i18n/translations/de.ts` | `valueGrowth: "Wertzuwachs 2024"` → `2026`<br>`propertyGuide: "{city} Immobilienführer 2024"` → `2026` |
| `src/i18n/translations/nl.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/fr.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/pl.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/sv.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/da.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/hu.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/fi.ts` | `valueGrowth` + `propertyGuide` |
| `src/i18n/translations/no.ts` | `valueGrowth` + `propertyGuide` |

### 2. Buyers Guide Badge (10 files)

Each language's Buyers Guide has a hero badge with "2024":

| File | Change |
|------|--------|
| `src/i18n/translations/buyersGuide/en.ts` | `badge: "Complete 2024 Guide"` → `2026` |
| `src/i18n/translations/buyersGuide/de.ts` | `badge: "Kompletter 2024 Guide"` → `2026` |
| `src/i18n/translations/buyersGuide/nl.ts` | `badge: "Complete Gids 2024"` → `2026` |
| `src/i18n/translations/buyersGuide/fr.ts` | `badge: "Guide Complet 2024"` → `2026` |
| `src/i18n/translations/buyersGuide/pl.ts` | `badge: "Kompletny Przewodnik 2024"` → `2026` |
| `src/i18n/translations/buyersGuide/sv.ts` | Badge line |
| `src/i18n/translations/buyersGuide/da.ts` | `badge: "Komplet Guide 2024"` → `2026` |
| `src/i18n/translations/buyersGuide/hu.ts` | Badge line |
| `src/i18n/translations/buyersGuide/fi.ts` | `badge: "Täydellinen Opas 2024"` → `2026` |
| `src/i18n/translations/buyersGuide/no.ts` | Badge line |

### 3. Hardcoded Component

| File | Change |
|------|--------|
| `src/components/brochures/BrochureOptInForm.tsx` | Line 219: `{cityName} Property Guide 2024` → Use localized `t('brochures.ui.propertyGuide')` instead |

### 4. Investment Highlights Component

| File | Change |
|------|--------|
| `src/components/brochures/InvestmentHighlights.tsx` | Line 79: fallback `"Value Growth 2024"` → `2026` |

---

## Summary

| Category | Files | Total Changes |
|----------|-------|---------------|
| Brochure translations (10 langs × 2 strings) | 10 | 20 |
| Buyers Guide badge (10 langs) | 10 | 10 |
| BrochureOptInForm hardcoded | 1 | 1 |
| InvestmentHighlights fallback | 1 | 1 |
| **Total** | **22 files** | **32 changes** |

---

## Implementation Steps

1. Update all 10 main translation files (`en.ts`, `de.ts`, etc.) - change `2024` → `2026` in `valueGrowth` and `propertyGuide`
2. Update all 10 Buyers Guide translation files - change badge year
3. Fix `BrochureOptInForm.tsx` to use the localized translation key instead of hardcoded English
4. Update `InvestmentHighlights.tsx` fallback text

This ensures consistent "2026" branding across all city brochures, buyers guides, and all 10 supported languages.

