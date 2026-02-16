

## Fix 404 on /admin/villas-content and /admin/villas-properties

The pages show 404 because three things are missing: database tables, page components, and route registrations. Here is exactly what will be created.

---

### Step 1: Database Migration -- Create two tables

**Table: `villas_page_content`**
Identical schema to `apartments_page_content` (id, language, headline, subheadline, cta_text, hero_image_url/alt, video fields, reviews fields, SEO fields, is_published, timestamps, updated_by). CTA default changed to `'View Villas'`.

**Table: `villas_properties`**
Identical schema to `apartments_properties` (id, language, title, slug, location, price, currency, bedrooms, bedrooms_max, bathrooms, sqm, property_type, description, short_description, features, images, featured_image_url/alt, display_order, visible, status, featured, views, inquiries, timestamps, created_by, updated_by, partner fields, gallery_images). Default `property_type` changed to `'villa'`.

**RLS on both tables:**
- Public SELECT for published/visible rows
- Full CRUD for users passing `has_apartments_access(auth.uid())`

**Triggers:** `update_updated_at_column()` on both tables.

---

### Step 2: Create two admin page components

**`src/pages/admin/VillasPageContent.tsx`**
- Copy of `ApartmentsPageContent.tsx`
- All `apartments_page_content` references changed to `villas_page_content`
- Title changed to "Villas Page Content"
- Exports `VillasPageContentInner` (named) and default with `AdminLayout` wrapper

**`src/pages/admin/VillasProperties.tsx`**
- Copy of `ApartmentsProperties.tsx`
- All `apartments_properties` references changed to `villas_properties`
- Title changed to "Villas Properties"
- Default `property_type` set to `"villa"`
- Image upload path changed from `apartments/` to `villas/`
- Exports `VillasPropertiesInner` (named) and default with `AdminLayout` wrapper

---

### Step 3: Register routes in App.tsx

Add after the existing apartments imports (line ~127):
```
const VillasPageContent = lazy(() => import("./pages/admin/VillasPageContent"));
const VillasProperties = lazy(() => import("./pages/admin/VillasProperties"));
```

Add after the apartments routes (line ~277):
```
<Route path="/admin/villas-content" element={<ProtectedRoute><VillasPageContent /></ProtectedRoute>} />
<Route path="/admin/villas-properties" element={<ProtectedRoute><VillasProperties /></ProtectedRoute>} />
```

---

### Files affected

| Action | File |
|--------|------|
| DB Migration | Create `villas_page_content` + `villas_properties` tables with RLS |
| New file | `src/pages/admin/VillasPageContent.tsx` |
| New file | `src/pages/admin/VillasProperties.tsx` |
| Edit | `src/App.tsx` (2 imports + 2 routes) |

