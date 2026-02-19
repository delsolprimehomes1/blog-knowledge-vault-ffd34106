
## Change: Relax the Villas/Apartments Regex in `functions/_middleware.js`

### What the Current Pattern Does

Line 95 currently reads:

```
/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/(villas\/properties|apartments)\/?$/
```

- `\/?` — optionally matches a trailing slash
- `$` — anchors the match to the **end of the string**

Because of the `$` anchor, this regex only matches the path when nothing follows after the optional trailing slash. If the URL has a query string (e.g. `?ref=google`) or any additional path segment, `url.pathname` itself won't include query strings (those live in `url.search`), but the strict `$` anchor can still cause subtle mismatches when path normalization appends extra characters.

More importantly, removing `/?$` and using a plain prefix match makes the rule **forward-compatible**: any future sub-paths under `/en/villas/properties/...` or `/en/apartments/...` will also be caught and get the correct `Cache-Control: no-store` passthrough.

### The Single Change

**File:** `functions/_middleware.js` — line 95

| | Pattern |
|---|---|
| **Before** | `/^\/(en\|nl\|fr\|de\|fi\|pl\|da\|hu\|sv\|no)\/(villas\/properties\|apartments)\/?$/` |
| **After** | `/^\/(en\|nl\|fr\|de\|fi\|pl\|da\|hu\|sv\|no)\/(villas\/properties\|apartments)/` |

Removed: `\/?$` (the optional trailing slash and end-of-string anchor).

### What Changes in Behaviour

- `/en/villas/properties` — still matches (as before)
- `/en/villas/properties/` — still matches (as before, via optional slash — now even simpler)
- `/en/apartments` — still matches
- `/en/villas/properties?foo=bar` — now matches (query string is in `url.search`, but the pathname is still the right shape)
- `/en/villas/properties/some-sub-page` — now matches (forward-compatible)
- `/en/villas` — does NOT match (correct: bare `/villas` is handled by the `_redirects` 301 rule, not the middleware)
- `/en/blog/something` — does NOT match (correct: different path segment)

### No Other Files Changed

Only the one regex on line 95 of `functions/_middleware.js` is modified. All other rules, headers, and logic remain identical.
