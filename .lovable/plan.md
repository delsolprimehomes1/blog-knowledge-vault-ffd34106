
# Add Flags to All Language Selectors

## Overview
Three language selector components currently have inconsistent styling - two lack flag emojis entirely, and one may have contrast issues on dark backgrounds.

## Issues to Fix

| Component | Current State | Fix Needed |
|-----------|--------------|------------|
| `LanguageSelector` (Landing) | Globe icon + text names only | Add flag emojis |
| `RetargetingLanguageSelector` | Globe icon + lang code, text names only | Add flag emojis |
| `LanguageSwitcher` (Header) | Flags show but potential white bg on dark header | Ensure transparent bg on dark headers |

## Files to Modify

### 1. `src/components/landing/LanguageSelector.tsx`
Add a `LANGUAGE_FLAGS` map and display flag emojis alongside language names in both the trigger button and dropdown.

**Changes:**
- Add flag emoji constant mapping
- Update button to show flag + code (matching other selectors)
- Update dropdown items to show flag + language name

### 2. `src/components/retargeting/RetargetingLanguageSelector.tsx`
Add flag emojis to match the visual consistency of main site selectors.

**Changes:**
- Add `languageFlags` record with emoji mappings
- Update button to show flag + code instead of Globe icon
- Update dropdown items to show flag + language name

### 3. `src/components/LanguageSwitcher.tsx`
Ensure the Select trigger uses transparent background when on dark headers.

**Changes:**
- Pass through className to SelectTrigger properly for `bg-transparent` override when needed
- Already receives `border-white/30 text-white` from Header.tsx but may need explicit `bg-transparent`

## Technical Details

### Flag Mapping (to be added to Landing & Retargeting selectors):
```typescript
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  nl: '🇳🇱',
  fr: '🇫🇷',
  de: '🇩🇪',
  fi: '🇫🇮',
  pl: '🇵🇱',
  da: '🇩🇰',
  hu: '🇭🇺',
  sv: '🇸🇪',
  no: '🇳🇴',
  es: '🇪🇸', // Retargeting also supports Spanish
};
```

### Updated Button Display:
```tsx
// Before (Landing):
<Globe size={18} />
<span className="uppercase">{currentLang}</span>

// After (Landing):
<span>{LANGUAGE_FLAGS[currentLang]}</span>
<span className="uppercase">{currentLang}</span>
```

### Updated Dropdown Items:
```tsx
// Before (Landing):
{LANGUAGE_NAMES[lang]}

// After (Landing):
<span className="flex items-center gap-2">
  <span>{LANGUAGE_FLAGS[lang]}</span>
  {LANGUAGE_NAMES[lang]}
</span>
```

## Result After Implementation
- All language selectors across the site will show flag emojis consistently
- Users can quickly identify languages visually
- The landing and retargeting pages will match the main site's visual language
- No "white button on dark background" visibility issues
