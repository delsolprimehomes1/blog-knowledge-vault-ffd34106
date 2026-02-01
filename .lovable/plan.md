
# Add Flags to All Language Selectors

## Overview
Three language selector components have inconsistent styling. Two lack flag emojis entirely, and one has potential contrast issues on dark backgrounds where the select trigger shows a white background.

## Issues Identified

| Component | Location | Current State | Issue |
|-----------|----------|---------------|-------|
| `LanguageSelector` | Landing pages (`/en/landing`) | Globe icon + text | No flag emojis |
| `RetargetingLanguageSelector` | Retargeting pages | Globe icon + code | No flag emojis |
| `LanguageSwitcher` | Main header | Has flags | White `bg-background` on dark headers |

## Files to Modify

### 1. `src/components/landing/LanguageSelector.tsx`

**Current trigger:**
```tsx
<Globe size={18} />
<span className="uppercase">{currentLang}</span>
```

**Updated trigger:**
```tsx
<span>{LANGUAGE_FLAGS[currentLang]}</span>
<span className="uppercase">{currentLang}</span>
```

**Add flag mapping:**
```typescript
const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  en: '🇬🇧', nl: '🇳🇱', fr: '🇫🇷', de: '🇩🇪', 
  fi: '🇫🇮', pl: '🇵🇱', da: '🇩🇰', hu: '🇭🇺', 
  sv: '🇸🇪', no: '🇳🇴'
};
```

**Update dropdown items to show flag + name**

---

### 2. `src/components/retargeting/RetargetingLanguageSelector.tsx`

**Current trigger:**
```tsx
<Globe size={16} />
<span className="uppercase">{currentLang}</span>
```

**Updated trigger:**
```tsx
<span className="text-base">{languageFlags[currentLang]}</span>
<span className="uppercase">{currentLang}</span>
```

**Add flag mapping (includes Spanish for retargeting):**
```typescript
const languageFlags: Record<string, string> = {
  en: '🇬🇧', nl: '🇳🇱', de: '🇩🇪', fr: '🇫🇷', 
  es: '🇪🇸', pl: '🇵🇱', sv: '🇸🇪', da: '🇩🇰', 
  hu: '🇭🇺', fi: '🇫🇮', no: '🇳🇴'
};
```

**Update dropdown items to show flag + name**

---

### 3. `src/components/LanguageSwitcher.tsx`

**Issue:** The `SelectTrigger` uses default `bg-background` which is white, causing visibility issues on dark/transparent headers.

**Fix:** Add `bg-transparent` to the className for all three variants:
```tsx
<SelectTrigger className={`w-[70px] bg-transparent ${className}`}>
```

This ensures when Header passes `border-white/30 text-white`, the trigger doesn't have a solid white background.

---

### 4. `src/components/ui/select.tsx` (Optional Enhancement)

No changes required - the `className` prop already merges correctly with defaults.

## Visual Result

**Before:**
- Landing: 🌐 EN (Globe icon)
- Retargeting: 🌐 EN (Globe icon)
- Header on dark: White box with flag

**After:**
- Landing: 🇬🇧 EN (Flag emoji)
- Retargeting: 🇬🇧 EN (Flag emoji)
- Header on dark: Transparent background with visible flag

## Summary

| File | Change |
|------|--------|
| `src/components/landing/LanguageSelector.tsx` | Add `LANGUAGE_FLAGS`, replace Globe with flag, show flags in dropdown |
| `src/components/retargeting/RetargetingLanguageSelector.tsx` | Add `languageFlags`, replace Globe with flag, show flags in dropdown |
| `src/components/LanguageSwitcher.tsx` | Add `bg-transparent` to all `SelectTrigger` className props |
