
## Replace Logo with "DELSOLPRIMEHOMES" Text in Headers

Replace the logo image in the top-left of the header on all three landing pages with styled text reading "DELSOLPRIMEHOMES" in gold, matching the reference screenshot.

---

### Changes (3 files)

**1. `src/pages/apartments/ApartmentsLanding.tsx`** (lines 101-105)

Replace the `<img>` tag with:
```tsx
<span className="text-lg sm:text-xl font-serif font-bold tracking-widest text-landing-gold">
  DELSOLPRIMEHOMES
</span>
```

**2. `src/pages/villas/VillasLanding.tsx`** (lines 85-89)

Same replacement -- remove the `<img>` tag and use the gold text span.

**3. `src/pages/listings/ListingsLanding.tsx`** (lines 85-89)

Same replacement -- remove the `<img>` tag and use the gold text span.

---

### Styling Details

- Font: `font-serif` (matches the brand's serif typography used in hero headings)
- Color: `text-landing-gold` (the existing project gold color)
- Weight: `font-bold`
- Letter spacing: `tracking-widest` (matches the wide-spaced look in the screenshot)
- Responsive sizing: `text-lg` on mobile, `sm:text-xl` on larger screens
- All caps text: hardcoded as "DELSOLPRIMEHOMES"

No new files, no new dependencies. The logo image URL is simply removed and replaced with text across all three pages.
