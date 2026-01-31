
# Match Retargeting Hero Typography to Landing Page

## Overview

Update the retargeting hero section (`RetargetingHero.tsx`) to match the landing page hero's typography, font sizes, and positioning for visual consistency across both page types.

## Visual Reference Analysis

From the landing page screenshot:
- **H1 Headline**: Large serif font, bold, left-aligned on desktop, centered on mobile
- **Font sizes**: Responsive sizing from mobile (`text-2xl`) up to desktop (`lg:text-[64px]`)
- **Subheadline**: Lighter weight, smaller text, same alignment pattern
- **Layout**: Content aligned left on large screens, centered on mobile/tablet

## Technical Changes

### File: `src/components/retargeting/RetargetingHero.tsx`

**Change 1: Update H1 headline classes (Line 67-68)**

| Property | Current (Retargeting) | Target (Landing) |
|----------|----------------------|------------------|
| Font sizes | `text-[32px] md:text-[48px] lg:text-[56px]` | `text-2xl sm:text-3xl md:text-5xl lg:text-[64px]` |
| Font weight | Not specified (default) | `font-bold` |
| Text shadow | Complex inline style | `drop-shadow-xl` |
| Alignment | Centered | `text-center lg:text-left` |

**Change 2: Update subheadline classes (Line 82-83)**

| Property | Current (Retargeting) | Target (Landing) |
|----------|----------------------|------------------|
| Font sizes | `text-lg md:text-xl` | `text-base sm:text-lg md:text-xl lg:text-2xl` |
| Max width | `max-w-[700px]` | `max-w-2xl` |
| Color | `text-white/90` | `text-white/95` |
| Text shadow | Complex inline style | `drop-shadow-md` |
| Alignment | Centered (mx-auto) | `text-center lg:text-left mx-auto lg:mx-0` |

**Change 3: Update content container positioning (Line 61)**

| Current | Target |
|---------|--------|
| `max-w-[900px] mx-auto px-6 text-center` | `container mx-auto px-5 sm:px-6 text-white` |

Add inner wrapper matching landing:
```text
<div className="max-w-4xl mx-auto lg:mx-0">
```

**Change 4: Update CTA alignment (Line 96)**

| Current | Target |
|---------|--------|
| `flex-col items-center gap-4` | `flex-col items-center lg:items-start gap-3 sm:gap-6` |

## Summary of Class Changes

```text
H1 headline:
- FROM: font-serif text-[32px] md:text-[48px] lg:text-[56px] leading-tight text-white mb-6
- TO:   font-serif text-2xl sm:text-3xl md:text-5xl lg:text-[64px] font-bold leading-tight text-white mb-4 sm:mb-6 drop-shadow-xl text-center lg:text-left

Subheadline:
- FROM: text-lg md:text-xl text-white/90 font-light mb-10 max-w-[700px] mx-auto leading-relaxed
- TO:   text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 font-light mb-8 sm:mb-10 leading-relaxed max-w-2xl text-center lg:text-left drop-shadow-md mx-auto lg:mx-0
```

## Files Modified

| File | Changes |
|------|---------|
| `src/components/retargeting/RetargetingHero.tsx` | Update typography, sizing, alignment to match landing page |

## Expected Result

After the changes:
- Retargeting hero headline will be larger and bolder (matching 64px on desktop)
- Text will align left on desktop screens (like the landing page)
- Text will remain centered on mobile/tablet for better readability
- Subheadline will have consistent sizing across breakpoints
- Both page types will have a unified visual appearance
