

# Fix Mobile Navigation Menu z-index on Location Hub Page

## Problem Identified

The mobile navigation menu on the Location Guides page (`/en/locations`) has a **z-index conflict** that causes it to render behind page content in certain scenarios.

Looking at the user's screenshot:
- The X (close) button is visible at the top-right (indicating the menu is "open")
- But the actual menu content (Explore, Learn, Compare, About sections) is NOT visible
- The hero content is showing through instead

---

## Root Cause

In `src/components/home/Header.tsx`:

**Current Code (lines 245-250):**
```jsx
<div 
  className={`fixed inset-0 bg-card z-40 flex flex-col ...`}
>
```

**The Issue:**
- The header itself has `z-50`
- The mobile toggle button has `z-50` (correct - stays visible)
- But the mobile menu overlay only has `z-40`

This means the mobile menu content can be rendered **behind** elements with z-index between 40-50.

---

## Solution

Update the mobile menu overlay from `z-40` to `z-50` (or higher like `z-[45]`) to ensure it renders above all page content but at the same level as the header controls.

**File:** `src/components/home/Header.tsx`  
**Line:** 246

**Change:**
```diff
- className={`fixed inset-0 bg-card z-40 flex flex-col pt-24 px-6 gap-2 lg:hidden overflow-y-auto transition-all duration-300 ${
+ className={`fixed inset-0 bg-card z-[45] flex flex-col pt-24 px-6 gap-2 lg:hidden overflow-y-auto transition-all duration-300 ${
```

Using `z-[45]` ensures the mobile menu:
- Appears above page content (hero sections, etc.)
- Stays below the header bar and toggle button (`z-50`) so the X button and logo remain clickable

---

## Summary

| Item | Details |
|------|---------|
| File | `src/components/home/Header.tsx` |
| Line | 246 |
| Change | `z-40` → `z-[45]` |
| Impact | Fixes mobile menu visibility on all pages |

This is a one-line change that fixes the mobile navigation menu stacking issue across all pages that use the Header component.

