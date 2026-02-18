
## Fix: Create the `/en/villas` Landing Page (404 Fix)

### Root Cause
The `/en/villas` URL returns a 404 because:
1. There is no `VillasLanding` React page component (no `src/pages/villas/VillasLanding.tsx`)
2. The `/:lang/villas` route is absent from `src/App.tsx`
3. The `public/_redirects` file has no explicit SPA rule for `/:lang/villas` (though the catch-all `/* /index.html 200` would normally handle it — the missing route in React Router is the real problem)

The admin side (`/admin/villas-content`, `/admin/villas-properties`) exists. The public-facing landing page was never created.

### What Will Be Built

This mirrors the existing Apartments infrastructure exactly, per the project's Villas Infrastructure Standard.

#### 1. New Components (mirroring Apartments)

| New File | Mirrors |
|---|---|
| `src/pages/villas/VillasLanding.tsx` | `src/pages/apartments/ApartmentsLanding.tsx` |
| `src/components/villas/VillasHero.tsx` | `src/components/apartments/ApartmentsHero.tsx` |
| `src/components/villas/VillasPropertiesSection.tsx` | `src/components/apartments/ApartmentsPropertiesSection.tsx` |
| `src/components/villas/VillasLeadFormModal.tsx` | `src/components/apartments/ApartmentsLeadFormModal.tsx` |

#### 2. `VillasLanding.tsx` — Main Page

- Reads the `lang` URL param (defaults to `en`)
- Fetches `villas_page_content` for meta title/description
- Renders the fixed header with logo + language selector + "View Properties" CTA
- Includes `<Helmet>` with canonical, 10-language hreflang tags, and JSON-LD schema
- Manages lead form modal state (opens when a property card is clicked)

#### 3. `VillasHero.tsx`

- Fetches `villas_page_content` (headline, subheadline, cta_text, hero_image_url, hero_image_alt)
- Full-width hero image with text overlay and a CTA button that scrolls to the properties section
- Identical layout to `ApartmentsHero`

#### 4. `VillasPropertiesSection.tsx`

- Fetches from `villas_properties` table, filtered by `language` and `is_active = true`
- Renders property cards in a responsive grid
- Each card fires `onPropertyClick` to open the lead modal

#### 5. `VillasLeadFormModal.tsx`

- Lead capture modal identical to the apartments version
- On submit, calls `register-crm-lead` edge function with source `villas_landing_{language}`

#### 6. Register the Route in `src/App.tsx`

Add two entries alongside the existing apartments routes:

```
<Route path="/villas" element={<Navigate to="/en/villas" replace />} />
<Route path="/:lang/villas" element={<VillasLanding />} />
```

#### 7. `public/_redirects` — Add Explicit SPA Rule

Add before the final catch-all:
```
/:lang/villas  /index.html  200
```

This ensures Cloudflare Pages routes `/en/villas` correctly to the React SPA without relying solely on the catch-all (which can conflict with static file serving rules).

### Technical Notes

- All data comes from the existing `villas_page_content` and `villas_properties` tables (already managed via the admin panel)
- Lead source will be `villas_landing_{language}` to match the documented standard
- The 10 supported languages are: `en, nl, fr, de, fi, pl, da, hu, sv, no`
- Canonical URL: `https://www.delsolprimehomes.com/{lang}/villas`
- No new database tables or edge functions are needed
