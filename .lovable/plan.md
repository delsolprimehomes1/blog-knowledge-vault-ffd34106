
## Add Villas Section to the Apartments Landing Page

### What the User Wants

The public apartments page (`/:lang/apartments`) currently shows only apartments. The user wants to add a **Villas section** below the apartments so that:

1. The page navbar has two buttons — "View Apartments" and "View Villas" — each scrolling to their respective section.
2. The Villas section on the public page pulls data from the existing `villas_properties` table (already in the database).
3. The **admin `Apartments Properties` page** (`/admin/apartments-properties`) gets a **tab or toggle** so admins can switch between managing Apartments and Villas properties — without needing to navigate away.

---

### How the Page Currently Works

```text
ApartmentsLanding (/:lang/apartments)
  ├── Header (logo + language selector + "View Properties" button)
  ├── ApartmentsHero  (hero image, headline from apartments_page_content)
  ├── ApartmentsPropertiesSection  (grid of property cards from apartments_properties)
  └── Footer
```

The goal is to extend it to:

```text
ApartmentsLanding (/:lang/apartments)
  ├── Header (logo + language selector + "View Apartments" + "View Villas" buttons)
  ├── ApartmentsHero
  ├── ApartmentsPropertiesSection  [id="apartments-section"]
  ├── VillasPropertiesSection      [id="villas-section"]  ← NEW
  └── Footer
```

---

### Changes Required

#### 1. `src/pages/apartments/ApartmentsLanding.tsx`

- Add a second `SelectedProperty` state for villas modal (or reuse the same modal pattern).
- Add `VillasPropertiesSection` import and render it below `ApartmentsPropertiesSection`.
- Add `VillasLeadFormModal` import and render it (reusing the existing villas lead form modal that already exists in `src/components/villas/VillasLeadFormModal.tsx`).
- Update the header to have two nav buttons: "View Apartments" and "View Villas", each scrolling to `apartments-section` and `villas-section` respectively.

#### 2. `src/components/apartments/ApartmentsPropertiesSection.tsx`

- Change the `<section>` id from `"properties-section"` to `"apartments-section"` so that the scroll targets are distinct.

#### 3. `src/pages/admin/ApartmentsProperties.tsx`

- Add a **Tabs** component at the top with two tabs: **"Apartments"** and **"Villas"**.
- The "Apartments" tab shows the existing apartments property management UI (unchanged).
- The "Villas" tab shows a copy of the same UI but reads/writes to `villas_properties` instead of `apartments_properties`, defaulting `property_type` to `"villa"`.
- The page title updates to reflect the active tab ("Apartments Properties" / "Villas Properties").
- The image upload path prefix changes to `villas/` when the Villas tab is active.

No database migrations needed — `villas_properties` table already exists (it's what `VillasPropertiesSection` already reads from). No new routes or sidebar entries needed since this is embedded in the existing admin page.

---

### Technical Details

**Section scroll targets:**
- Apartments section: `id="apartments-section"`
- Villas section: `id="villas-section"`

**Villas section on public page:**
- Reuses the existing `VillasPropertiesSection` component (`src/components/villas/VillasPropertiesSection.tsx`) which already queries `villas_properties` with `language` and `visible=true` filters.
- Lead form reuses `VillasLeadFormModal` from `src/components/villas/VillasLeadFormModal.tsx`.

**Admin tabs:**
- Wraps the existing `ApartmentsPropertiesInner` logic in a `Tabs` container.
- The Villas tab duplicates the form/table logic but points to `villas_properties` — keeping property type default as `"villa"` and upload path as `villas/`.

**Files to change:**
1. `src/pages/apartments/ApartmentsLanding.tsx`
2. `src/components/apartments/ApartmentsPropertiesSection.tsx`
3. `src/pages/admin/ApartmentsProperties.tsx`
