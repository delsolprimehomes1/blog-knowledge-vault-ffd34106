
# Fix Desktop Homepage CTAs and Functionality

## Current State Analysis

After reviewing the homepage components, I've identified the current CTA implementations:

| Section | Current CTA | Current Behavior | Status |
|---------|------------|------------------|--------|
| **Hero** | "Start Your Property Search" | ✅ Navigates to `/[lang]/properties` | Working |
| **Hero** | "Chat with Emma" | ✅ Opens Emma chatbot via `openEmmaChat` event | Working |
| **Mini About** | "Meet the Team" | ⚠️ Button exists but has no `onClick` or `href` | **BROKEN** |
| **Featured Areas** | Each card | ✅ Links to `/{lang}/brochure/{city}` | Working |
| **Featured Areas** | "Explore All Areas" | ✅ Links to `/{lang}/properties` | Working |
| **Process** | "View the Buyers Guide" | ⚠️ Links to `/buyers-guide` (no language prefix) | **NEEDS FIX** |
| **Reviews** | Reviews widget + "Read All Reviews" | ⚠️ Links to `/blog` (wrong page) | **NEEDS FIX** |
| **Blog Teaser** | "Visit the Blog" | ✅ Links to `/blog` | Working |
| **Glossary Teaser** | "Explore Full Glossary" | ✅ Links to `/glossary` | Working |
| **Final CTA** | "Chat with Emma" | ✅ Opens Emma chatbot | Working |
| **Final CTA** | "Tell Us What You're Looking For" | ⚠️ Opens Emma chatbot (same as primary) | **NEEDS DIFFERENTIATION** |

## Issues to Fix

### 1. Mini About - "Meet the Team" Button (Line 24-27 in ContentBlocks.tsx)
**Problem**: Button has no navigation - it just renders a button with no action
**Fix**: Add `Link` wrapper to navigate to `/{lang}/about`

### 2. Process Section - "View the Buyers Guide" (Line 51-54 in Process.tsx)
**Problem**: Links to `/buyers-guide` without language prefix
**Fix**: Change to `/${currentLanguage}/buyers-guide`

### 3. Reviews Section - "Read All Reviews" CTA (Line 36-39 in ReviewsAndBlog.tsx)
**Problem**: Links to `/blog` which is incorrect for reviews
**Fix**: Link to Google My Business reviews page or create dedicated reviews page

### 4. Final CTA Section - Secondary Button Differentiation (Line 113-120 in Home.tsx)
**Problem**: Both buttons open Emma chat - no differentiation
**Fix**: Secondary button should open WhatsApp for direct expert contact

## Implementation Plan

### Files to Modify

| File | Change |
|------|--------|
| `src/components/home/sections/ContentBlocks.tsx` | Wrap "Meet the Team" button with Link to about page |
| `src/components/home/sections/Process.tsx` | Fix buyers-guide link to include language prefix |
| `src/components/home/sections/ReviewsAndBlog.tsx` | Fix reviews CTA to link to Google reviews or dedicated page |
| `src/pages/Home.tsx` | Differentiate secondary CTA to use WhatsApp |
| `src/i18n/translations/en.ts` | Update CTA label to "Contact via WhatsApp" |
| `src/i18n/translations/[nl,de,fr,sv,no,da,fi,pl,hu].ts` | Add translated WhatsApp CTA labels |

---

## Detailed Changes

### 1. Fix "Meet the Team" Button (ContentBlocks.tsx)

```typescript
// Before (line 23-27):
<div>
  <Button variant="outline" className="group">
    {t.miniAbout.cta} <ArrowRight size={18} className="ml-2 ..." />
  </Button>
</div>

// After:
<div>
  <Link to={`/${currentLanguage}/about`}>
    <Button variant="outline" className="group">
      {t.miniAbout.cta} <ArrowRight size={18} className="ml-2 ..." />
    </Button>
  </Link>
</div>
```

### 2. Fix Buyers Guide Link (Process.tsx)

```typescript
// Before (line 52):
<Link to="/buyers-guide">

// After:
<Link to={`/${currentLanguage}/buyers-guide`}>
```

### 3. Fix Reviews CTA (ReviewsAndBlog.tsx)

```typescript
// Before (line 37-38):
<Link to="/blog">
  <Button variant="outline">{t.reviews.cta}</Button>
</Link>

// After - Link to Google My Business:
<a 
  href="https://www.google.com/maps/place/Del+Sol+Prime+Homes"
  target="_blank" 
  rel="noopener noreferrer"
>
  <Button variant="outline">{t.reviews.cta}</Button>
</a>
```

### 4. Differentiate Final CTA Buttons (Home.tsx)

```typescript
// Before (line 113-120):
<Button 
  variant="outline" 
  onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat'))}
>
  {t.finalCta.ctaSecondary}
</Button>

// After - WhatsApp link with tracking:
<a 
  href="https://wa.me/34630039090?text=Hi,%20I'm%20interested%20in%20Costa%20del%20Sol%20properties"
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => {
    // Track WhatsApp click
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'whatsapp_click', { 
        category: 'Contact', 
        location: 'homepage_final_cta' 
      });
    }
  }}
>
  <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-prime-900">
    {t.finalCta.ctaSecondary}
  </Button>
</a>
```

### 5. Update Translation Labels

Update `ctaSecondary` in `finalCta` for all 10 languages:

| Language | Current | Updated |
|----------|---------|---------|
| EN | "Tell Us What You're Looking For" | "Contact via WhatsApp" |
| NL | varies | "Contact via WhatsApp" |
| DE | varies | "Kontakt über WhatsApp" |
| FR | varies | "Contact via WhatsApp" |
| SV | varies | "Kontakta via WhatsApp" |
| NO | varies | "Kontakt via WhatsApp" |
| DA | varies | "Kontakt via WhatsApp" |
| FI | varies | "Ota yhteyttä WhatsAppilla" |
| PL | varies | "Kontakt przez WhatsApp" |
| HU | varies | "Kapcsolat WhatsApp-on" |

---

## Additional Improvements

### Add Analytics Tracking

Create a utility function for consistent event tracking:

```typescript
// src/utils/analytics.ts
export const trackCTAClick = (ctaName: string, location: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', `${ctaName}_click`, {
      category: 'CTA',
      location: location,
    });
  }
};
```

### WhatsApp Constants

Add company WhatsApp number to constants:

```typescript
// Add to src/constants/company.ts
export const COMPANY_CONTACT = {
  phone: '+34 630 03 90 90',
  phoneClean: '34630039090',
  email: 'info@delsolprimehomes.com',
  whatsappBase: 'https://wa.me/34630039090',
  whatsappWithMessage: (msg: string) => 
    `https://wa.me/34630039090?text=${encodeURIComponent(msg)}`,
} as const;
```

---

## Summary of Changes

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | "Meet the Team" has no link | Add Link to `/{lang}/about` | `ContentBlocks.tsx` |
| 2 | Buyers Guide missing lang prefix | Add `currentLanguage` to path | `Process.tsx` |
| 3 | Reviews links to wrong page | Link to Google reviews | `ReviewsAndBlog.tsx` |
| 4 | Both final CTAs identical | Secondary → WhatsApp | `Home.tsx` |
| 5 | CTA label unclear | "Contact via WhatsApp" | 10 translation files |
| 6 | WhatsApp number hardcoded | Add to constants | `company.ts` |

---

## Testing Checklist

After implementation, verify:
- [ ] "Meet the Team" navigates to `/en/about` (or current language)
- [ ] "View the Buyers Guide" navigates to `/{lang}/buyers-guide`
- [ ] "Read All Reviews" opens Google reviews in new tab
- [ ] Secondary final CTA opens WhatsApp with pre-filled message
- [ ] All CTAs work in all 10 languages
- [ ] All links have proper hover states
- [ ] Mobile tap targets are at least 44px
