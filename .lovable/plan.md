
## Root Cause Found: Missing Blank Lines in `_headers` Villas/Apartments Blocks

### The Exact Problem

Looking at `public/_headers` lines 51–130, every single villas/apartments path block is stacked directly on top of the next one — **zero blank lines** between them. This violates the Cloudflare parser standard documented in project memory:

> "Every path block must be separated by a blank line."

The Cloudflare `_headers` parser silently stops reading after it hits ambiguous block boundaries. The `/listings` blocks (lines 132–180) DO have blank lines and are parsed correctly, but the parser may have already stopped or partially failed by then because of the corrupted villas/apartments section above.

Additionally, there is no blank line between the `/index.html` block (lines 6–9) and the `# Sitemap XML files` comment (line 10). This may corrupt the very first block.

Critically: the `/en/apartments` page has the same problem — and has been broken for the same reason since the last deploy.

---

### Why Preview Works But Live Does Not

Cloudflare Pages Functions (middleware) **do not run on preview domains** (`*.lovable.app`). In preview, React Router handles everything client-side and the route works fine. On live (`www.delsolprimehomes.com`), the Cloudflare edge serves a stale cached `index.html` (because the no-store headers were never applied due to parser failure) → the stale HTML references old JS bundle hashes that no longer exist → React fails silently → falls back to `/`.

---

### The Fix: Add Blank Lines Between Every Block in `_headers`

Two specific areas need fixing:

**Area 1 — After `/index.html` block (line 9):** Add a blank line before the `# Sitemap` comment.

**Area 2 — Villas/Apartments blocks (lines 51–130):** Add a blank line after every CDN-Cache-Control line, before the next path. That means 19 blank lines inserted across the 20 stacked blocks.

The listings blocks (lines 132–180) already have blank lines and do NOT need changes.

**Also bump the timestamp** on line 1 from `2026-02-19T18:00:00Z` to a new value (e.g. `2026-02-19T20:00:00Z`) to change the file hash and force Cloudflare to re-parse the entire file.

---

### Files Changed

| File | Change |
|------|--------|
| `public/_headers` | Add blank lines between all villas/apartments path blocks (lines 51–130). Add blank line after `/index.html` block. Bump timestamp. |

No other files need changing — `_redirects`, `App.tsx`, and `_middleware.js` are all correctly configured.

---

### After Deploying

Once the fix is merged and deployed to Cloudflare:
1. Visit `www.delsolprimehomes.com/en/listings` in a private/incognito browser window
2. Open DevTools → Network tab → click the `/en/listings` request → check Response Headers for `Cache-Control: no-store` and `CDN-Cache-Control: no-store`
3. The page should load the apartments listing page with no redirect
