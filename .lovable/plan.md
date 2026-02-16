

## Fix 404 on /admin/villas-content and /admin/villas-properties

The sidebar links were added but the database tables, page components, and routes were never created. Here's what needs to happen:

### 1. Database Migration -- Create two new tables

Create `villas_page_content` (identical schema to `apartments_page_content`) and `villas_properties` (identical schema to `apartments_properties`) with matching RLS policies that reuse the existing `has_apartments_access()` function for editor/admin CRUD and public SELECT for visible/published content.

### 2. New Admin Pages (2 files)

**`src/pages/admin/VillasPageContent.tsx`**
- Duplicate of `ApartmentsPageContent.tsx`, replacing all references from `apartments_page_content` to `villas_page_content`
- Title changed to "Villas Page Content"
- Exports both default (with AdminLayout) and `VillasPageContentInner` (without wrapper)

**`src/pages/admin/VillasProperties.tsx`**
- Duplicate of `ApartmentsProperties.tsx`, replacing all references from `apartments_properties` to `villas_properties`
- Title changed to "Villas Properties"
- Default property_type set to "villa" instead of "apartment"
- Image upload path changed to `villas/` instead of `apartments/`
- Exports both default and `VillasPropertiesInner`

### 3. Route Registration in App.tsx

- Add lazy imports for `VillasPageContent` and `VillasProperties`
- Add two admin routes right after the apartments routes:
  - `/admin/villas-content` pointing to `VillasPageContent`
  - `/admin/villas-properties` pointing to `VillasProperties`

### File Summary

| Action | File |
|--------|------|
| Migration | Create `villas_page_content` and `villas_properties` tables + RLS |
| New | `src/pages/admin/VillasPageContent.tsx` |
| New | `src/pages/admin/VillasProperties.tsx` |
| Edit | `src/App.tsx` (add imports + routes) |

