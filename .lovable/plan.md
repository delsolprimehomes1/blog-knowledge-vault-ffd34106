
## Fix `/en/villas` — Publish Content & Generate All Language Translations

### What Is Already Working
- All React components are created and correct (`VillasLanding`, `VillasHero`, `VillasPropertiesSection`, `VillasLeadFormModal`)
- Routes are registered in `App.tsx` (`/:lang/villas` and `/villas` redirect)
- `_redirects` has the correct SPA rule
- 12 English villa properties exist in the database and are `visible = true`

### Root Cause of the Blank/404 Page
The English content row in `villas_page_content` has **`is_published = false`**. The `VillasHero` component queries `.eq('is_published', true)` — so it finds nothing and returns `null`, making the page render blank (header + footer only, no hero, no CTA, no visible content trigger).

Additionally, `meta_title` and `meta_description` are empty, so SEO tags would be blank.

### What Will Be Fixed

#### Step 1 — Publish the English Content Row (Database)
Run a direct SQL update:
```sql
UPDATE villas_page_content
SET
  is_published    = true,
  meta_title      = 'Luxury Villas on the Costa del Sol | Del Sol Prime Homes',
  meta_description = 'Discover handpicked luxury villas for sale on the Costa del Sol. New builds and resales in Marbella, Estepona, Benahavís and more.'
WHERE language = 'en';
```

#### Step 2 — Make VillasHero Resilient (Code)
Currently `VillasHero` returns `null` if no published content is found, which produces a completely invisible hero section. We will add a fallback so the page shows a default hero if the DB row is unpublished or missing — preventing a blank page in any future content gap.

#### Step 3 — Trigger Translation for All 9 Other Languages (Edge Function)
The project has a `translate-villas` edge function (mirroring `translate-apartments`) that auto-generates localized content for the other 9 languages (nl, fr, de, fi, pl, da, hu, sv, no) from the English source row, and sets `is_published = true` on each translated row.

We will call this edge function for each of the 9 languages to populate all language versions and set them published.

#### Step 4 — Populate Properties for Other Languages
Properties currently only exist for `en` (12 visible rows). The `translate-villas` edge function or a separate translation step will duplicate and translate the property listings into the other 9 languages so that `/:lang/villas` pages (e.g. `/nl/villas`) render properties rather than an empty grid.

### Files Changed

| Action | Target | Detail |
|--------|--------|--------|
| DB update | `villas_page_content` | Set `is_published = true`, add meta title/description for `en` |
| Code edit | `src/components/villas/VillasHero.tsx` | Add fallback content so hero never renders blank |
| Edge function call | `translate-villas` | Generate + publish content for nl, fr, de, fi, pl, da, hu, sv, no |

### Technical Notes
- The 12 English properties already visible will show immediately after step 1
- The language switcher in the header will work for all 10 languages once translations are generated
- Lead form modal, CRM registration (`villas_landing_{language}`), and inquiry counter increments are all wired correctly and will work as soon as the page renders
- The `LanguageSelector` in the header redirects to `/:lang/villas` — translation content must exist for each language or the properties grid will be empty (graceful empty state is already handled)
