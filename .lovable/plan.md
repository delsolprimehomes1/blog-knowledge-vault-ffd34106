

# Fix GTM Test Page (404 Issue)

## Problem
The GTM test page route was added to `San Diego Testing/src/routes/AppRoutes.tsx`, but the live application uses `src/App.tsx` as its main router. The route and component need to be in the correct location.

## Changes

### 1. Add GTMTest route to `src/App.tsx`
Add the `/gtm-test` route alongside other public routes (near the `/thank-you` route, before the admin section). Import the existing `GTMTest` component.

### 2. Ensure the component file exists at the correct path
The `GTMTest.tsx` page component already exists but may be in the wrong directory. It needs to be importable from `src/pages/GTMTest` (without the `San Diego Testing/` prefix).

## Technical Detail
- Add `const GTMTest = lazy(() => import("./pages/GTMTest"));` with other lazy imports in `src/App.tsx`
- Add `<Route path="/gtm-test" element={<GTMTest />} />` after the `/thank-you` route
- No other files need to change

