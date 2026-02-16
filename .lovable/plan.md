

## Fix 404 on /admin/villas-content and /admin/villas-properties

The sidebar links already exist but three things are missing: database tables, page components, and route registrations.

---

### Step 1: Database Migration -- Create two tables

**Table: `villas_page_content`**
Identical columns to `apartments_page_content` (id, language, headline, subheadline, cta_text defaulting to 'View Villas', hero_image_url/alt, video fields, reviews fields, SEO fields, is_published, timestamps, updated_by).

**Table: `villas_properties`**
Identical columns to `apartments_properties` (id, language, title, slug, location, price, currency, bedrooms, bedrooms_max, bathrooms, sqm, property_type defaulting to 'villa', description, short_description, features, images, featured_image_url/alt, display_order, visible, status, featured, views, inquiries, timestamps, created_by, updated_by, partner fields, gallery_images).

**RLS policies on both tables** (mirroring apartments exactly):
- Public SELECT for published/visible rows
- Full CRUD for editors via `has_apartments_access(auth.uid())`
- Admin ALL via `user_roles` check

**Triggers:** `update_updated_at_column()` on both tables.

---

### Step 2: Create two admin page components

**`src/pages/admin/VillasPageContent.tsx`**
- Copy of `ApartmentsPageContent.tsx` (174 lines)
- Table reference: `villas_page_content`
- Title: "Villas Page Content"
- Exports `VillasPageContentInner` (named) and default with `AdminLayout` wrapper

**`src/pages/admin/VillasProperties.tsx`**
- Copy of `ApartmentsProperties.tsx` (428 lines)
- Table reference: `villas_properties`
- Title: "Villas Properties"
- Default `property_type`: `"villa"` instead of `"apartment"`
- Image upload path: `villas/` instead of `apartments/`
- Exports `VillasPropertiesInner` (named) and default with `AdminLayout` wrapper

---

### Step 3: Register routes in App.tsx

Add two lazy imports after line 126:
```text
const VillasPageContent = lazy(() => import("./pages/admin/VillasPageContent"));
const VillasProperties = lazy(() => import("./pages/admin/VillasProperties"));
```

Add inner component imports after line 131:
```text
import { VillasPageContentInner } from "./pages/admin/VillasPageContent";
import { VillasPropertiesInner } from "./pages/admin/VillasProperties";
```

Add two protected routes after line 277:
```text
<Route path="/admin/villas-content" element={<ProtectedRoute><VillasPageContent /></ProtectedRoute>} />
<Route path="/admin/villas-properties" element={<ProtectedRoute><VillasProperties /></ProtectedRoute>} />
```

---

### Files affected

| Action | File |
|--------|------|
| DB Migration | Create `villas_page_content` + `villas_properties` tables with RLS + triggers |
| New file | `src/pages/admin/VillasPageContent.tsx` |
| New file | `src/pages/admin/VillasProperties.tsx` |
| Edit | `src/App.tsx` (4 imports + 2 routes) |

