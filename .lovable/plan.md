

# Fix Elfsight Widget Not Displaying

## Problem

DOMPurify strips the `src` attribute from `<script>` tags even when scripts are allowed via `ADD_TAGS`. This means the Elfsight platform script (`https://elfsightcdn.com/platform.js`) never actually loads, so the widget div remains empty.

## Solution

Instead of injecting raw HTML with `dangerouslySetInnerHTML`, extract the widget ID from the embed code and render it properly using the same pattern as the existing `ElfsightGoogleReviews` component:

1. Load the Elfsight platform script programmatically (if not already loaded)
2. Render just the widget `<div>` with the correct CSS class

## Changes

### `src/pages/apartments/ApartmentsLanding.tsx`

- Remove the `DOMPurify` import and the `reviewsRef`-based innerHTML injection logic
- Add a helper function to extract the widget ID from the embed code using a regex (e.g., match `elfsight-app-([a-f0-9-]+)` from the class attribute)
- In the `useEffect` that runs when `embedCode` changes, load the Elfsight platform script (`https://elfsightcdn.com/platform.js`) if it hasn't been loaded yet
- In the JSX, render a simple `<div className="elfsight-app-{widgetId}" data-elfsight-app-lazy />` instead of injecting raw HTML

### What stays the same

- The database column (`elfsight_embed_code`) and admin textarea remain unchanged -- editors still paste the full embed code
- The fetch logic and `reviews_enabled` check remain the same
- The "What Our Clients Say" section layout stays identical

### Technical Detail

The regex `elfsight-app-([a-f0-9-]+)` reliably extracts the widget ID from any standard Elfsight embed snippet like:
```
<div class="elfsight-app-4e9c9e21-aeb3-4a2d-97ac-014bfffab99b" data-elfsight-app-lazy></div>
```

This is the same approach already proven to work in `src/components/reviews/ElfsightGoogleReviews.tsx`.

