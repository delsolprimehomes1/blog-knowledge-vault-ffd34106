
# Logo Enhancement: Bigger Logos + Add to Landing & Retargeting Pages

## Overview

This plan increases logo sizes across the entire site and adds the official image logo to the Landing Page and Retargeting Page headers (which currently only use text-based logos).

---

## Current State Analysis

| Location | Current Logo Type | Current Size | Needs Logo Added? |
|----------|------------------|--------------|-------------------|
| **Main Header** (`Header.tsx`) | Image | `h-10 md:h-12` | No |
| **Main Footer** (`home/Footer.tsx`) | Image | `h-14 md:h-20` | No |
| **Landing Page Header** (`LandingLayout.tsx`) | Text only | N/A | **YES** |
| **Landing Page Footer** (`landing/Footer.tsx`) | Text only | N/A | **YES** |
| **Retargeting Header** (`RetargetingLanding.tsx`) | Text only | N/A | **YES** |
| **Retargeting Footer** (`RetargetingFooter.tsx`) | Text only | N/A | **YES** |
| **Admin Layout** (`AdminLayout.tsx`) | Image | `h-10` | No |
| **CRM Login** (`CrmLogin.tsx`) | Image | `h-16 md:h-20` | No |

---

## Changes Required

### 1. Make Existing Logos Bigger

#### Main Header (`src/components/home/Header.tsx`)
- **Line 204**: Change `h-10 md:h-12` → `h-12 md:h-14`
- Increases desktop logo height from 48px to 56px

#### Main Footer (`src/components/home/Footer.tsx`)
- **Line 21**: Change `h-14 md:h-20` → `h-16 md:h-24`
- Increases desktop logo height from 80px to 96px

#### Admin Layout (`src/components/AdminLayout.tsx`)
- **Lines 169, 189, 196**: Change `h-10` → `h-12`
- Increases all admin panel logos from 40px to 48px

#### CRM Login (`src/pages/crm/CrmLogin.tsx`)
- **Line 223**: Change `h-16 md:h-20` → `h-20 md:h-24`
- Increases login page logo from 80px to 96px on desktop

---

### 2. Add Image Logo to Landing Page

#### Landing Page Header (`src/components/landing/LandingLayout.tsx`)

Replace the text logo spans with the official image logo:

**Mobile Logo (Lines 196-203)**:
```tsx
// Before: Text span
<span className="text-landing-gold font-serif text-sm...">DELSOLPRIMEHOMES</span>

// After: Image logo
<img 
  src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
  alt="DelSolPrimeHomes"
  className="h-8 sm:h-10 w-auto object-contain"
/>
```

**Desktop Logo (Lines 206-213)**:
```tsx
// Before: Text span
<span className="text-landing-gold font-serif text-2xl...">DELSOLPRIMEHOMES</span>

// After: Image logo
<img 
  src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
  alt="DelSolPrimeHomes"
  className="h-12 md:h-14 w-auto object-contain"
/>
```

#### Landing Page Footer (`src/components/landing/Footer.tsx`)

**Line 18-20**: Replace text span with image logo:
```tsx
// Before
<span className="text-xs sm:text-sm font-serif font-bold text-landing-gold tracking-widest">
  DELSOLPRIMEHOMES
</span>

// After
<img 
  src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
  alt="DelSolPrimeHomes"
  className="h-10 sm:h-12 w-auto object-contain"
/>
```

---

### 3. Add Image Logo to Retargeting Page

#### Retargeting Header (`src/pages/RetargetingLanding.tsx`)

**Lines 111-117**: Replace text span logo with image:
```tsx
// Before
<Link to={`/${language}`} className="inline-block lg:absolute lg:left-1/2 lg:-translate-x-1/2">
  <span className="text-landing-navy text-lg md:text-xl tracking-widest font-light">
    DEL<span className="text-landing-gold">SOL</span>PRIMEHOMES
  </span>
</Link>

// After
<Link to={`/${language}`} className="inline-block lg:absolute lg:left-1/2 lg:-translate-x-1/2">
  <img 
    src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
    alt="DelSolPrimeHomes"
    className="h-10 md:h-12 w-auto object-contain"
  />
</Link>
```

#### Retargeting Footer (`src/components/retargeting/RetargetingFooter.tsx`)

**Lines 24-30**: Replace text span logo with image:
```tsx
// Before
<Link to={`/${language}`} className="inline-block">
  <span className="text-landing-navy text-lg md:text-xl tracking-widest font-light">
    DEL<span className="text-landing-gold">SOL</span>PRIMEHOMES
  </span>
</Link>

// After
<Link to={`/${language}`} className="inline-block">
  <img 
    src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
    alt="DelSolPrimeHomes"
    className="h-12 md:h-14 w-auto object-contain"
  />
</Link>
```

---

## Summary of Size Changes

| Location | Before | After |
|----------|--------|-------|
| Main Header | `h-10 md:h-12` | `h-12 md:h-14` |
| Main Footer | `h-14 md:h-20` | `h-16 md:h-24` |
| Admin Layout | `h-10` | `h-12` |
| CRM Login | `h-16 md:h-20` | `h-20 md:h-24` |
| Landing Header (new) | N/A → Image | `h-8/h-10` mobile, `h-12/h-14` desktop |
| Landing Footer (new) | N/A → Image | `h-10 sm:h-12` |
| Retargeting Header (new) | N/A → Image | `h-10 md:h-12` |
| Retargeting Footer (new) | N/A → Image | `h-12 md:h-14` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home/Header.tsx` | Increase logo size |
| `src/components/home/Footer.tsx` | Increase logo size |
| `src/components/AdminLayout.tsx` | Increase logo size (3 places) |
| `src/pages/crm/CrmLogin.tsx` | Increase logo size |
| `src/components/landing/LandingLayout.tsx` | Replace text with image logo (2 places) |
| `src/components/landing/Footer.tsx` | Replace text with image logo |
| `src/pages/RetargetingLanding.tsx` | Replace text with image logo |
| `src/components/retargeting/RetargetingFooter.tsx` | Replace text with image logo |

---

## Logo Image URL

All locations will use the official logo:
```
https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png
```
