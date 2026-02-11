

# Apartments Editor: Separate Login and Role-Based Access

## Overview

Create a completely separate login flow for "apartments editors" -- users who can ONLY access `/admin/apartments-content` and `/admin/apartments-properties`, with no visibility into any other admin pages or navigation.

Admins will be able to grant this role to users from the existing admin dashboard.

---

## Database Changes

### 1. Add new role to the `app_role` enum

Add `'apartments_editor'` to the existing enum so it can be stored in `user_roles`.

### 2. Update RLS policies on apartments tables

Add policies so users with `apartments_editor` role can also perform full CRUD on `apartments_page_content` and `apartments_properties` (currently only `admin` role can).

### 3. Create `has_apartments_access()` helper function

A `SECURITY DEFINER` function that returns `true` if the user has either `admin` or `apartments_editor` role. Used in the updated RLS policies.

---

## New Files

### 1. `src/pages/ApartmentsAuth.tsx` -- Separate Login Page

- Route: `/apartments/login`
- Sign-in only (no sign-up -- admins create accounts and assign the role)
- Branded with "Del Sol Prime Homes - Apartments Editor" title
- On successful login:
  - Checks if user has `apartments_editor` or `admin` role in `user_roles`
  - If yes: redirects to `/apartments/dashboard`
  - If no: shows error "You don't have access to the apartments editor" and signs them out

### 2. `src/components/ApartmentsEditorRoute.tsx` -- Route Guard

- Checks auth session exists
- Checks user has `apartments_editor` or `admin` role via `user_roles` query
- If not authenticated: redirects to `/apartments/login`
- If authenticated but wrong role: redirects to `/apartments/login` with error

### 3. `src/components/ApartmentsEditorLayout.tsx` -- Minimal Layout

- Simple sidebar with ONLY two navigation links:
  - "Page Content" -> `/apartments/dashboard/content`
  - "Properties" -> `/apartments/dashboard/properties`
- Logo, sign-out button, and user email display
- No access to any other admin pages

### 4. `src/pages/admin/ApartmentsEditorManager.tsx` -- Admin Tool to Grant Access

- Route: `/admin/apartments-editors` (accessible only to admins)
- Lists all users with the `apartments_editor` role
- "Add Editor" form: enter an email address
  - Looks up the user in `auth.users` (via an edge function)
  - If found: inserts `apartments_editor` role into `user_roles`
  - If not found: creates the user account (via edge function) and assigns the role
- "Remove" button: deletes the `apartments_editor` role from `user_roles`

### 5. `supabase/functions/manage-apartments-editors/index.ts` -- Edge Function

- Handles admin-only operations that require the service role:
  - `POST /add`: Look up user by email, create if needed, assign `apartments_editor` role
  - `POST /remove`: Remove `apartments_editor` role from a user
  - `GET /list`: List all users with `apartments_editor` role (joins with `auth.users` for email)
- Validates caller is an admin via `is_admin()` check

---

## Modified Files

### 6. `src/App.tsx` -- Add New Routes

```text
/apartments/login          -> ApartmentsAuth (public)
/apartments/dashboard      -> ApartmentsEditorRoute + ApartmentsEditorLayout
  /content                 -> ApartmentsPageContent (reuse existing, but with ApartmentsEditorLayout)
  /properties              -> ApartmentsProperties (reuse existing, but with ApartmentsEditorLayout)
/admin/apartments-editors  -> ProtectedRoute + ApartmentsEditorManager
```

### 7. `src/pages/admin/ApartmentsPageContent.tsx`

- Accept an optional `layout` prop or detect context to render with either `AdminLayout` (for admins) or `ApartmentsEditorLayout` (for apartments editors)
- Simplest approach: extract the content into a shared component, wrap it in the appropriate layout at the route level

### 8. `src/pages/admin/ApartmentsProperties.tsx`

- Same approach as above -- extract content, wrap at route level

### 9. `src/components/AdminLayout.tsx`

- Add "Apartments Editors" link under the existing "Apartments" nav group (for admin management)

---

## Technical Details

- The `app_role` enum currently has: `admin`, `editor`, `viewer`. We add `apartments_editor`.
- RLS policies on `apartments_page_content` and `apartments_properties` will be updated from checking `role = 'admin'` to using `has_apartments_access(auth.uid())` which checks for either role.
- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` (already configured) to create users and manage roles.
- No changes to the existing admin flow -- admins continue to access apartments pages via `/admin/apartments-content` as before.
- Apartments editors are completely isolated: they cannot navigate to or access any `/admin/*` routes.

---

## User Flow

```text
Admin grants access:
  /admin/apartments-editors -> Enter email -> Edge function creates user + role

Apartments editor logs in:
  /apartments/login -> Sign in -> Role check -> /apartments/dashboard/content

Apartments editor works:
  Sees only 2 nav items: Page Content, Properties
  Can edit apartments data in both tables
  Cannot see any other admin content
```

