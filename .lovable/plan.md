
# Change "Book a Call" CTAs to "Chat with Emma" Across the Site

## Overview

This update replaces all "Book a Call" and similar call-scheduling CTAs with "Chat with Emma" across the entire site, aligning the user experience with the Emma AI chatbot flow.

## Files to Update

### 1. Main Translation Files (14 files)

Each of these files has **3 locations** with call-related CTAs:

| File | Line | Current Key/Text | New Text |
|------|------|-----------------|----------|
| `src/i18n/translations/en.ts` | 5 | `bookCall: "Book a Call"` | `chatWithEmma: "Chat with Emma"` |
| `src/i18n/translations/en.ts` | 55 | `ctaSecondary: "Book a Call With an Advisor"` | `ctaSecondary: "Chat with Emma"` |
| `src/i18n/translations/en.ts` | 196 | `ctaPrimary: "Book a 1:1 Call"` | `ctaPrimary: "Chat with Emma"` |

Similar changes for all other languages:
- `de.ts` - German
- `nl.ts` - Dutch
- `fr.ts` - French
- `sv.ts` - Swedish
- `no.ts` - Norwegian
- `da.ts` - Danish
- `fi.ts` - Finnish
- `pl.ts` - Polish
- `hu.ts` - Hungarian
- `es.ts` - Spanish
- `it.ts` - Italian
- `ru.ts` - Russian
- `tr.ts` - Turkish

### 2. Buyers Guide Translations (11 files)

Update the form section's schedule and title text:

| File | Current | New |
|------|---------|-----|
| `src/i18n/translations/buyersGuide/en.ts` | `title: "Book Your Free Consultation"`, `schedule: "Schedule a Call"` | `title: "Chat with Emma"`, `schedule: "Chat with Emma"` |

And all other language versions in `buyersGuide/`:
- `de.ts`, `nl.ts`, `fr.ts`, `sv.ts`, `no.ts`, `da.ts`, `fi.ts`, `pl.ts`, `hu.ts`

### 3. React Component with Hardcoded Text

| File | Line | Current | New |
|------|------|---------|-----|
| `src/components/about/AboutCTA.tsx` | 47 | `Schedule a Call` | `Chat with Emma` |

## Localized "Chat with Emma" Translations

For consistency across languages:

| Language | Translation |
|----------|-------------|
| English | Chat with Emma |
| German | Mit Emma chatten |
| Dutch | Chat met Emma |
| French | Discuter avec Emma |
| Swedish | Chatta med Emma |
| Norwegian | Chat med Emma |
| Danish | Chat med Emma |
| Finnish | Keskustele Emman kanssa |
| Polish | Czatuj z Emmą |
| Hungarian | Csevegj Emmával |
| Spanish | Chatea con Emma |
| Italian | Chatta con Emma |
| Russian | Чат с Эммой |
| Turkish | Emma ile Sohbet Et |

## Summary of Changes

| Category | Files | Changes per File |
|----------|-------|------------------|
| Main translations | 14 files | 3 strings each |
| Buyers Guide translations | 11 files | 2 strings each |
| React components | 1 file | 1 hardcoded string |
| **Total** | **26 files** | **~65 string changes** |

## Technical Details

### Key Rename
The `bookCall` key will be renamed to `chatWithEmma` in the `common` object across all translation files. This is a semantic change that better represents the action.

### Component Updates
The Header component (`src/components/home/Header.tsx`) uses `t.common.bookCall` at lines 226 and 332. After renaming the key, this needs to be updated to `t.common.chatWithEmma`.

### No Navigation Changes Needed
The button functionality doesn't need to change - it already links to Emma's chat interface.

## Implementation Order

1. Update all 14 main translation files (`src/i18n/translations/*.ts`)
2. Update all 11 buyers guide translation files (`src/i18n/translations/buyersGuide/*.ts`)
3. Update AboutCTA.tsx hardcoded string
4. Update Header.tsx to use new key name
