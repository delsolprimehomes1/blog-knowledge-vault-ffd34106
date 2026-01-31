
# Language-Specific Elfsight Google Reviews Widget Implementation

## Overview

This plan replaces all static testimonials/reviews across three page types with language-specific Elfsight Google Reviews widgets. Each supported language will load its dedicated widget, providing localized UI labels for reviews.

## Widget ID Mapping

Based on the provided IDs and site language support:

| Language | Code | Elfsight Widget ID |
|----------|------|-------------------|
| English | en | `4e9c9e21-aeb3-4a2d-97ac-014bfffab99b` |
| French | fr | `8898acc6-d2d5-4b1d-96e4-5a3c29b317da` |
| German | de | `aa95873f-40c9-4b8a-a930-c887d6afb4c4` |
| Dutch | nl | `aa95873f-40c9-4b8a-a930-c887d6afb4c4` (same as German) |
| Hungarian | hu | `b2db4ca0-4bf1-43d3-a6d3-f6dc172297d3` |
| Norwegian | no | `f9ccdb6e-80ea-465f-a496-8335a44ce8a0` |
| Polish | pl | `83033982-0c67-4e1c-999f-ea74de7798fe` |
| Swedish | sv | `4246a651-3c46-4ecd-852a-2de035a6073a` |
| Danish | da | `f10a202e-43af-46b9-9ab3-cd2eeb91aedb` |
| Finnish | fi | `4e9c9e21-aeb3-4a2d-97ac-014bfffab99b` (uses English widget) |

---

## Implementation Steps

### Step 1: Create Shared Elfsight Widget Component

**New File:** `src/components/reviews/ElfsightGoogleReviews.tsx`

This reusable component:
- Accepts `language` prop to select the correct widget
- Loads the Elfsight script only once per page (using `useEffect` to avoid duplicates)
- Renders the language-specific widget div
- Uses React key to force re-render when language changes

```text
+---------------------------------------+
|     ElfsightGoogleReviews             |
+---------------------------------------+
| Props:                                |
|   - language: string                  |
|   - className?: string                |
+---------------------------------------+
| Logic:                                |
|   1. Map language to widget ID        |
|   2. Load Elfsight platform.js once   |
|   3. Render widget div with ID        |
+---------------------------------------+
```

### Step 2: Update Homepage Reviews Section

**File:** `src/components/home/sections/ReviewsAndBlog.tsx`

Changes:
1. Import the new `ElfsightGoogleReviews` component
2. Import `useTranslation` hook to get `currentLanguage`
3. Replace the placeholder div (lines 25-34) with the Elfsight widget
4. Keep the section header, 5-star icons, and "Read All Reviews" CTA

Before:
```
<div className="bg-white rounded-2xl ... placeholder">
  <p>Google Reviews Widget Integration</p>
  <p>Client-side Script Placeholder</p>
</div>
```

After:
```
<ElfsightGoogleReviews 
  language={currentLanguage} 
  className="max-w-4xl mx-auto reveal-on-scroll"
/>
```

### Step 3: Update Landing Page Testimonials

**File:** `src/components/landing/TestimonialsSection.tsx`

Changes:
1. Import the new `ElfsightGoogleReviews` component
2. Remove static testimonial imports (lines 14-27) - no longer needed
3. Remove `useMemo` hook and `reviews` array logic
4. Remove the `TestimonialCard` component
5. Keep section header (heading + subheading from translations)
6. Replace mobile Swiper carousel and desktop grid with single Elfsight widget

The component will shrink from 175 lines to approximately 40 lines.

### Step 4: Update Retargeting Page Testimonials

**File:** `src/components/retargeting/RetargetingTestimonials.tsx`

Changes:
1. Import the new `ElfsightGoogleReviews` component
2. Remove `TestimonialCard` component
3. Remove `flagMap` object (no longer needed)
4. Keep decorative blur circles and section header
5. Replace mobile Swiper and desktop grid with Elfsight widget

The component will shrink from 141 lines to approximately 50 lines.

---

## Technical Details

### Elfsight Script Loading Strategy

The Elfsight platform script (`https://elfsightcdn.com/platform.js`) will be loaded:
1. **Once per page** - Using a check for existing script tag
2. **Lazily** - Script is added dynamically when component mounts
3. **Async** - Using `async` attribute to not block rendering

```text
useEffect(() => {
  // Check if script already exists
  if (!document.querySelector('script[src*="elfsightcdn"]')) {
    const script = document.createElement('script');
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    document.body.appendChild(script);
  }
}, []);
```

### Widget Re-initialization on Language Change

When users switch languages:
1. React key prop forces component remount
2. New widget div with different class is rendered
3. Elfsight script automatically initializes the new widget

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/reviews/ElfsightGoogleReviews.tsx` | Shared Elfsight widget component |

## Files Modified

| File | Changes |
|------|---------|
| `src/components/home/sections/ReviewsAndBlog.tsx` | Replace placeholder with Elfsight widget |
| `src/components/landing/TestimonialsSection.tsx` | Replace static testimonials with Elfsight widget |
| `src/components/retargeting/RetargetingTestimonials.tsx` | Replace static testimonials with Elfsight widget |

## Files NOT Modified (as requested)

- Dashboard pages
- CRM pages
- Admin/internal pages
- Any translation JSON files (no longer needed for testimonials)

---

## Expected Result

After implementation:
- **Homepage** (`/en/`, `/nl/`, etc.): Google Reviews widget in Reviews section
- **Landing Pages** (via `LandingLayout`): Google Reviews widget replacing static testimonials
- **Retargeting Pages** (`/en/retarget/`, etc.): Google Reviews widget replacing static testimonials
- Each language displays its configured Elfsight widget with localized UI
- Real Google reviews visible to visitors (pulled from the business profile)
