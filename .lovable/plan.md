

## Simplify Apartments Landing Page

Strip the page down to just three elements: header, hero section, and properties grid.

### What gets removed
- AutoplayVideo component
- EmmaSection component
- EmmaChat component (floating chat)
- "Speak with Emma" button from the header
- Emma-related state and event listeners (`isEmmaOpen`, `openEmmaChat` listener)
- Google Reviews / Elfsight widget section
- Elfsight script loading logic
- `widgetId` state and fetch logic

### What stays
- Fixed header with logo, language selector, and "View Properties" button
- ApartmentsHero (the existing full-screen hero with headline, subheadline, and CTA from the database)
- ApartmentsPropertiesSection (the property cards grid with bedroom/bathroom/sqm details)
- ApartmentsLeadFormModal (so users can still inquire about a property)
- Footer
- Helmet / SEO meta tags

### What changes in `ApartmentsLanding.tsx`
- Replace `ApartmentsHeroProperty` + masonry grid approach with the simpler `ApartmentsHero` component (full-screen hero image with CTA)
- Below the hero, render `ApartmentsPropertiesSection` which fetches and displays all properties as cards
- Remove all Emma/video/reviews imports and code
- Remove the `ApartmentsPropertyLightbox` (was tied to masonry grid) -- clicking a property opens the lead form modal directly
- Remove unused imports (`MessageCircle`, `AutoplayVideo`, `EmmaSection`, `EmmaChat`, `ApartmentsHeroProperty`, `ApartmentsMasonryGrid`, `ApartmentsPropertyLightbox`, `usePropertyGallery`)
- Simplify state: only need `selectedProperty`, `modalOpen`, `metaTitle`, `metaDescription`
- Simplify the page content fetch to only grab meta fields (no reviews/elfsight)
- Remove the properties fetch from the landing page (handled internally by `ApartmentsPropertiesSection`)

### Resulting page structure

```text
+---------------------------+
|  Header (logo + lang)     |
+---------------------------+
|                           |
|   Full-screen Hero        |
|   (image + headline +     |
|    CTA button)            |
|                           |
+---------------------------+
|                           |
|   Properties Grid         |
|   (cards with details)    |
|                           |
+---------------------------+
|  Footer                   |
+---------------------------+
```

### Technical Details

**File: `src/pages/apartments/ApartmentsLanding.tsx`**
- Remove imports: `ApartmentsHeroProperty`, `ApartmentsMasonryGrid`, `ApartmentsPropertyLightbox`, `AutoplayVideo`, `EmmaSection`, `EmmaChat`, `usePropertyGallery`, `MessageCircle`
- Add imports: `ApartmentsHero`, `ApartmentsPropertiesSection`
- Remove state: `isEmmaOpen`, `widgetId`, `properties`
- Remove effects: properties fetch, Elfsight script loader, Emma event listener
- Simplify page content fetch (only meta_title, meta_description)
- Header: remove "Speak with Emma" button, keep logo + language selector + "View Properties"
- Main content: `<ApartmentsHero language={language} />` then `<ApartmentsPropertiesSection language={language} onPropertyClick={handlePropertyClick} />`
- Keep `ApartmentsLeadFormModal` for property inquiries
- Keep `Footer`

No database changes needed. This is a UI-only simplification.
