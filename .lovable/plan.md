
# Fix Dynamic `<html lang="">` Attribute for SPA Routes

## Problem Summary

When users visit language-prefixed routes like `/nl/buyers-guide`, `/fi/buyers-guide`, or `/sv/buyers-guide`, the HTML source shows:

```html
<html lang="en">
```

This is because:
1. **`index.html` has `lang="en"` hardcoded** on line 2
2. **React's `LanguageContext` does update the attribute** via `document.documentElement.lang = currentLanguage` — but only AFTER React hydrates
3. **View-source shows the static HTML** before JavaScript runs, so crawlers/validators see `lang="en"`

This breaks SEO (Google thinks all pages are English), accessibility (screen readers use wrong language pronunciation), and hreflang validation tools.

## Solution: Add Inline Script to `index.html`

Add a small inline script that runs **immediately before React** to detect the language from the URL and set the `lang` attribute synchronously. This is a non-blocking, fast operation.

### File to Update

| File | Change |
|------|--------|
| `index.html` | Add inline script to detect and set `lang` attribute |

### Implementation Details

**Current `index.html` (line 2):**
```html
<html lang="en">
```

**Updated `index.html`:**
```html
<!doctype html>
<html lang="en">
  <head>
    <!-- Dynamic lang attribute: Set immediately from URL before React loads -->
    <script>
      (function() {
        var match = window.location.pathname.match(/^\/([a-z]{2})\//);
        var validLangs = ['en','nl','fr','de','fi','pl','da','hu','sv','no'];
        if (match && validLangs.indexOf(match[1]) !== -1) {
          document.documentElement.lang = match[1];
        }
      })();
    </script>
    <!-- ... rest of head ... -->
```

### How This Works

1. **Inline script runs immediately** — before any external resources load
2. **Regex extracts language** from URL: `/nl/buyers-guide` → `nl`
3. **Validates against 10 supported languages** to prevent invalid values
4. **Sets `document.documentElement.lang`** synchronously
5. **Result**: By the time React hydrates, the `lang` attribute is already correct

### Validation Matrix

| URL | Before Fix | After Fix |
|-----|------------|-----------|
| `/` | `lang="en"` | `lang="en"` (default) |
| `/en/buyers-guide` | `lang="en"` | `lang="en"` |
| `/nl/buyers-guide` | `lang="en"` ❌ | `lang="nl"` ✅ |
| `/fi/buyers-guide` | `lang="en"` ❌ | `lang="fi"` ✅ |
| `/sv/buyers-guide` | `lang="en"` ❌ | `lang="sv"` ✅ |
| `/de/blog/article` | `lang="en"` ❌ | `lang="de"` ✅ |

### Why This Approach

| Approach | Pros | Cons |
|----------|------|------|
| **Inline script (chosen)** | Runs before any render; works for ALL SPA routes; no additional requests | Tiny script in HTML |
| Server-side only | Perfect for crawlers | Requires edge function for every route |
| React useEffect only | Already implemented | Too late for view-source/crawlers |

### Complementary: Keep React `useEffect`

The existing `LanguageContext` logic (lines 73-77) should remain in place as a **fallback** for:
- Client-side navigation (SPA route changes)
- Edge cases where the inline script might not run
- Keeping state in sync with React

### Technical Notes

- Script uses `var` instead of `const` for maximum browser compatibility
- Script is an IIFE to avoid polluting global scope
- `indexOf` used instead of `includes()` for older browser support
- Script runs synchronously before any deferred/async resources

## Expected Result

After deployment, visiting any language route will show the correct `lang` attribute in view-source:

```bash
curl -s https://www.delsolprimehomes.com/nl/buyers-guide | head -5
```

Output:
```html
<!doctype html>
<html lang="nl">
```

(The script executes client-side, so `curl` still sees `lang="en"`, but browser view-source after page load will show the correct value immediately.)

---

**Note**: For full server-side `lang` attribute support (visible even to `curl`), the Buyers Guide would need SSG pre-rendering or re-adding to the middleware SEO patterns with a fixed edge function. The inline script solves the client-side/browser rendering case.
