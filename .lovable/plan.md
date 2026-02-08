
# Add Del Sol Navy Blue Glow Behind Logos

## Overview

Add a subtle navy blue glow effect behind the logos on all Landing pages and Retargeting pages to enhance brand visibility and create a premium visual effect.

---

## Color Reference

The "Del Sol" navy blue color from the design system:
- **Color**: `#1A2332` (`landing-navy`)
- **Glow Effect**: Semi-transparent version for the glow: `rgba(26, 35, 50, 0.4)`

---

## Technical Approach

Wrap each logo in a container with a radial gradient or box-shadow glow effect. This creates a soft blue halo behind the logo that enhances visibility on both light and dark backgrounds.

**CSS Effect to Apply:**
```tsx
// Wrapper div with blue glow
<div className="relative p-2 rounded-full bg-gradient-to-br from-landing-navy/10 via-transparent to-transparent shadow-[0_0_30px_rgba(26,35,50,0.3)]">
  <img ... />
</div>
```

---

## Files to Update

| File | Logo Location | Lines |
|------|---------------|-------|
| `src/components/landing/LandingLayout.tsx` | Mobile Header Logo | ~197-201 |
| `src/components/landing/LandingLayout.tsx` | Desktop Header Logo | ~209-213 |
| `src/components/landing/Footer.tsx` | Footer Logo | ~18-22 |
| `src/pages/RetargetingLanding.tsx` | Header Logo | ~111-117 |
| `src/components/retargeting/RetargetingFooter.tsx` | Footer Logo | ~24-30 |

---

## Detailed Changes

### 1. Landing Page Header - Mobile (`src/components/landing/LandingLayout.tsx`)

**Lines 197-201**: Wrap logo in glow container:
```tsx
// Before
<img 
  src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
  alt="DelSolPrimeHomes"
  className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
/>

// After
<div className="relative p-1.5 rounded-lg bg-gradient-radial from-landing-navy/15 to-transparent shadow-[0_0_20px_rgba(26,35,50,0.25)]">
  <img 
    src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
    alt="DelSolPrimeHomes"
    className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
  />
</div>
```

### 2. Landing Page Header - Desktop (`src/components/landing/LandingLayout.tsx`)

**Lines 209-213**: Same glow container pattern:
```tsx
<div className="relative p-2 rounded-lg bg-gradient-radial from-landing-navy/15 to-transparent shadow-[0_0_25px_rgba(26,35,50,0.25)]">
  <img 
    src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
    alt="DelSolPrimeHomes"
    className="h-14 md:h-16 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
  />
</div>
```

### 3. Landing Page Footer (`src/components/landing/Footer.tsx`)

**Lines 18-22**: Add glow container:
```tsx
<div className="relative p-1.5 rounded-lg bg-gradient-radial from-landing-navy/15 to-transparent shadow-[0_0_20px_rgba(26,35,50,0.25)]">
  <img 
    src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
    alt="DelSolPrimeHomes"
    className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
  />
</div>
```

### 4. Retargeting Page Header (`src/pages/RetargetingLanding.tsx`)

**Lines 111-117**: Wrap logo in glow container:
```tsx
<Link to={`/${language}`} className="inline-block lg:absolute lg:left-1/2 lg:-translate-x-1/2">
  <div className="relative p-2 rounded-lg bg-gradient-radial from-landing-navy/15 to-transparent shadow-[0_0_25px_rgba(26,35,50,0.25)]">
    <img 
      src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
      alt="DelSolPrimeHomes"
      className="h-12 md:h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
    />
  </div>
</Link>
```

### 5. Retargeting Page Footer (`src/components/retargeting/RetargetingFooter.tsx`)

**Lines 24-30**: Add glow container:
```tsx
<Link to={`/${language}`} className="inline-block">
  <div className="relative p-2 rounded-lg bg-gradient-radial from-landing-navy/15 to-transparent shadow-[0_0_25px_rgba(26,35,50,0.25)]">
    <img 
      src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
      alt="DelSolPrimeHomes"
      className="h-14 md:h-16 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
    />
  </div>
</Link>
```

---

## Visual Effect

The navy blue glow will:
- Create a subtle halo effect around the logo using `shadow-[0_0_25px_rgba(26,35,50,0.25)]`
- Add a radial gradient background fade from navy to transparent
- Enhance logo visibility on white/light backgrounds
- Maintain the premium, elegant aesthetic of the site
- Apply consistently across all 10 language versions (since it's in the shared components)

---

## Summary

| Component | Changes |
|-----------|---------|
| Landing Header (Mobile) | Add glow wrapper div |
| Landing Header (Desktop) | Add glow wrapper div |
| Landing Footer | Add glow wrapper div |
| Retargeting Header | Add glow wrapper div inside Link |
| Retargeting Footer | Add glow wrapper div inside Link |

**Total: 5 logo instances across 4 files**
