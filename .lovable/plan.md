
## Fix: Villas Language Selector Not Navigating

### Root Cause

The `LanguageSelector` component (`src/components/landing/LanguageSelector.tsx`) has two problems that together break language switching on the Villas (and Apartments) page:

1. **CSS-only hover dropdown** — the dropdown uses `group-hover:opacity-100 group-hover:visible` (pure CSS). When a user moves their mouse from the trigger button to a dropdown item, the hover state can be interrupted, especially on precise cursor movements. On some browsers and screen sizes, clicking an item may not register because the dropdown closes before the click event fires.

2. **No visual feedback that the click worked** — the `window.location.href` assignment triggers a full-page reload, but if the dropdown closes before the click lands, nothing happens and the user sees no response.

3. **The replacement pattern is fragile** — `replace("/${currentLang}/", "/${newLang}/")` requires a trailing slash. For `/en/villas` → the pattern `/en/` does match, but if the URL ever ends in the language code without a slash (e.g. `/en`), it fails silently and navigates nowhere.

### The Fix

Update `LanguageSelector` to use a **click-triggered state** (`useState` + `useRef`) instead of pure CSS hover, so:
- Clicking the flag/language button **toggles** the dropdown open/closed
- Clicking outside closes it (via a `useEffect` + `document.addEventListener`)
- Clicking a language item navigates reliably

Additionally, update `VillasLanding.tsx` (and confirm `ApartmentsLanding.tsx` has the same) to pass a **page-aware navigation callback** to the language selector, so instead of a generic `replace("/{lang}/", "/{newLang}/")` string operation, it uses the exact pattern `/{newLang}/villas` — making the navigation 100% reliable regardless of URL structure.

### Files to Change

#### 1. `src/components/landing/LanguageSelector.tsx`
- Replace `group-hover` CSS hover with `useState(false)` open/close toggle
- Add `useRef` + `useEffect` to close dropdown on outside click
- Accept an optional `onLanguageChange?: (lang: LanguageCode) => void` prop — if provided, use it; otherwise fall back to the current `window.location.href` logic
- Show a chevron indicator that animates when open

#### 2. `src/pages/villas/VillasLanding.tsx`
- Import `useNavigate` from `react-router-dom`
- Add `handleLanguageChange` function: `(lang) => navigate("/${lang}/villas")`
- Pass it as `onLanguageChange={handleLanguageChange}` to `<LanguageSelector>`

#### 3. `src/pages/apartments/ApartmentsLanding.tsx`
- Same change as VillasLanding — pass `onLanguageChange={(lang) => navigate("/${lang}/apartments")}` so the apartments page also benefits from the fix

### Technical Detail: Why Click-State vs CSS Hover

CSS `group-hover` depends on the mouse cursor continuously hovering over the parent element. Because the dropdown is a child of the group container positioned absolutely (moves below the button), there's a gap in the hover chain during mouse movement. Some browsers also have sub-pixel timing issues that cause the hover state to drop. A React `useState` toggle is immune to this — the dropdown stays open until explicitly closed by another click or an outside click.

### No Database Changes Needed

All translation data (all 10 languages) is already published in the database. The fix is purely frontend — making the navigation trigger reliable and the dropdown usable.
