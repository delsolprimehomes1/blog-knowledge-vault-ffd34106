

## Fix 404 on /admin/villas-content and /admin/villas-properties

Both admin pages are returning 404 because the database tables, page components, and routes were never created -- only the sidebar links exist.

### What will be done

**1. Create two database tables**

- `villas_page_content` -- same schema as `apartments_page_content` (headline, subheadline, CTA, hero image, video, reviews, SEO fields, per-language rows)
- `villas_properties` -- same schema as `apartments_properties` but with `property_type` defaulting to `'villa'` instead of `'apartment'`
- RLS policies reusing the existing `has_apartments_access()` function for editor/admin CRUD, plus public SELECT for published/visible content
- `updated_at` triggers on both tables

**2. Create two new admin page files**

- `src/pages/admin/VillasPageContent.tsx` -- duplicate of ApartmentsPageContent, querying `villas_page_content` instead, title "Villas Page Content"
- `src/pages/admin/VillasProperties.tsx` -- duplicate of ApartmentsProperties, querying `villas_properties` instead, title "Villas Properties", default property_type `"villa"`, image upload path `villas/`

**3. Register routes in App.tsx**

- Add lazy imports for both new pages
- Add two protected admin routes: `/admin/villas-content` and `/admin/villas-properties`

### Technical Details

| Action | File / Resource |
|--------|-----------------|
| DB Migration | Create `villas_page_content` table with RLS |
| DB Migration | Create `villas_properties` table with RLS |
| New file | `src/pages/admin/VillasPageContent.tsx` |
| New file | `src/pages/admin/VillasProperties.tsx` |
| Edit | `src/App.tsx` -- add 2 lazy imports + 2 route entries after line 277 |

