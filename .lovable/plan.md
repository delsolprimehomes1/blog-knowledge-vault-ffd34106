
## Remove Duplicate Redirect Rules from `public/_redirects`

### What's Wrong

Cloudflare Pages uses **first-match wins** routing — when a path appears more than once in `_redirects`, Cloudflare honours only the first occurrence and silently ignores all later ones. Two sets of duplicates exist:

**Duplicate Set 1 — Lines 77–86** (10 rules): Plain `/lang/villas` → `/lang/villas/properties` 301 redirects.
- `/en/villas`, `/nl/villas`, `/fr/villas`, `/de/villas`, `/fi/villas`, `/pl/villas`, `/da/villas`, `/hu/villas`, `/sv/villas`, `/no/villas`
- These paths already appear on lines 66–75 as query-param variants (`/en/villas?*` etc.), and Cloudflare's wildcard `?*` also matches bare paths with no query string, making the plain duplicates redundant and conflicting.

**Duplicate Set 2 — Line 111**: `/en /en/index.html 200`
- `/en` already appears on line 2 as `/en / 301`. Having `/en` a second time on line 111 means Cloudflare locks onto the first rule (line 2) and ignores line 111 entirely — but it also signals to Cloudflare's parser that the file may contain further inconsistencies, risking broader rule suppression.

### What Will Be Removed

| Lines | Rule | Reason Removed |
|-------|------|----------------|
| 77–86 | 10 × `/lang/villas → /lang/villas/properties 301` | Duplicate of lines 66–75 |
| 111 | `/en /en/index.html 200` | Duplicate of line 2 (`/en / 301`) |

### What Stays (unchanged)

- Lines 66–75: The `?*` query-param villas redirects — these are kept as the **canonical** set, and in Cloudflare they match both bare paths and query-string paths, so no redirect coverage is lost.
- Line 2: `/en / 301` — the correct and only `/en` rule.
- All other rules remain exactly as-is.

### File Change Summary

- **`public/_redirects`**: Remove lines 77–86 (10 rules) and line 111 (1 rule). Net result: 11 fewer lines, zero duplicate paths.
