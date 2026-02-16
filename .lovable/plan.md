
## Duplicate Apartments Page as Villas Landing Page

### Overview
Create a complete Villas landing page at `/:lang/villas` by duplicating the entire Apartments infrastructure -- database tables, frontend components, admin management pages, and auto-translation edge function. The Villas page will have its own independent content and properties, fully translated across all 10 languages.

### Database Changes (2 new tables)

**Table 1: `villas_page_content`**
- Identical schema to `apartments_page_content`
- Columns: id, language (unique), headline, subheadline, cta_text, hero_image_url, hero_image_alt, video_enabled, video_url, video_thumbnail_url, reviews_enabled, elfsight_embed_code, meta_title, meta_description, is_published, created_at, updated_at, updated_by
- RLS: public SELECT for published content, admin/apartments_editor INSERT/UPDATE/DELETE

**Table 2: `villas_properties`**
- Identical schema to `apartments_properties`
- Columns: id, language, title, slug, location, price, currency, bedrooms, bedrooms_max, bathrooms, sqm, property_type, status, description, short_description, featured_image_url, featured_image_alt, gallery_images, images, features, display_order, visible, featured, views, inquiries, property_group_id, partner_source, partner_logo, created_at, updated_at, created_by, updated_by
- RLS: public SELECT for visible properties, admin/apartments_editor full CRUD

### New Frontend Components (5 files)

**1. `src/components/villas/VillasHero.tsx`**
- Duplicate of ApartmentsHero, reads from `villas_page_content` table
- Same full-screen hero with headline, subheadline, CTA button

**2. `src/components/villas/VillasPropertiesSection.tsx`**
- Duplicate of ApartmentsPropertiesSection, reads from `villas_properties` table
- Same card design with bedroom badge, price overlay, localized labels
- All 10 language translations for "Featured Villas", subtitle, "View", "From"

**3. `src/components/villas/VillasLeadFormModal.tsx`**
- Duplicate of ApartmentsLeadFormModal, tracks inquiries on `villas_properties`
- CRM lead source set to `villas_landing_{language}`
- All 10 language translations for form fields

**4. `src/pages/villas/VillasLanding.tsx`**
- Duplicate of ApartmentsLanding at `/:lang/villas`
- Reads meta from `villas_page_content`, canonical/hreflang for `/villas`
- Same header with localized "View Properties" button

### New Admin Pages (2 files)

**5. `src/pages/admin/VillasPageContent.tsx`**
- Duplicate of ApartmentsPageContent, manages `villas_page_content`
- Per-language tabs, same hero/video/reviews/SEO sections

**6. `src/pages/admin/VillasProperties.tsx`**
- Duplicate of ApartmentsProperties, manages `villas_properties`
- Same property editor with image upload, stats dashboard
- Property type defaults to "villa" instead of "apartment"

### Auto-Translation Edge Function

**7. `supabase/functions/translate-villas/index.ts`**
- Duplicate of `translate-apartments`, reads from `villas_page_content` and `villas_properties`
- Translates English content to 9 languages using Gemini 2.5 Flash
- Same property_group_id linking logic

### Routing and Navigation Updates

**8. `src/App.tsx`**
- Add routes: `/:lang/villas` and `/villas` (redirect to `/en/villas`)
- Add admin routes: `/admin/villas-content` and `/admin/villas-properties`

**9. `src/components/AdminLayout.tsx`**
- Add "Villas" section to admin sidebar with links to Page Content and Properties

### File Summary

| Action | File |
|--------|------|
| New | `src/components/villas/VillasHero.tsx` |
| New | `src/components/villas/VillasPropertiesSection.tsx` |
| New | `src/components/villas/VillasLeadFormModal.tsx` |
| New | `src/pages/villas/VillasLanding.tsx` |
| New | `src/pages/admin/VillasPageContent.tsx` |
| New | `src/pages/admin/VillasProperties.tsx` |
| New | `supabase/functions/translate-villas/index.ts` |
| Edit | `src/App.tsx` (add villas routes) |
| Edit | `src/components/AdminLayout.tsx` (add villas to sidebar) |
| Migration | Create `villas_page_content` and `villas_properties` tables with RLS |

### How It Works
1. Admin adds English villas page content and properties via `/admin/villas-content` and `/admin/villas-properties`
2. Admin calls the `translate-villas` edge function to auto-translate to all 9 languages
3. Users visit `/:lang/villas` and see fully localized content with correct hreflang/canonical tags
4. Clicking a property opens the localized lead form modal, which registers the lead in CRM
