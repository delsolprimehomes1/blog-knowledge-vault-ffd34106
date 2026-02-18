
## Root Cause: Stale 404 Cached by Cloudflare for /fr/villas/properties

### What's Happening

The routing configuration in `public/_redirects` is correct (line 90):
```
/fr/villas/properties  /index.html  200
```

The middleware on line 95 of `functions/_middleware.js` also correctly matches this path:
```js
/^\/(en|nl|fr|de|fi|pl|da|hu|sv|no)\/(villas\/properties|apartments)\/?$/
```

And `public/_headers` has the correct no-cache directives for `/fr/villas/properties` (lines 50-53).

**The problem is Cloudflare has a cached 404 response for `/fr/villas/properties`** from before these redirect rules were added or published. This is the exact same pattern that caused the villas path to be restructured to `/villas/properties` in the first place (as noted in the project memory: *"Cache Busting: Changing path segments is the preferred method for bypassing environmental CDN caching"*).

This is a **Cloudflare edge cache issue** — the CDN is serving a cached 404 for the French (and possibly other language) villas URLs and ignoring the updated `_redirects` rules.

### Why Only French (/fr)?

It's likely that `/fr/villas/properties` was never visited before the routes were configured, so Cloudflare cached the initial 404 response. Other language variants like `/en/villas/properties` may have been visited and cached a 200 response. The cache TTL for 404 responses can be very long on Cloudflare.

### Two-Part Fix

**Part 1 — Immediate: Purge Cloudflare Cache for Villas URLs**

Log in to Cloudflare dashboard → Caching → Cache Purge → Custom Purge, and purge these specific URLs:
- `https://www.delsolprimehomes.com/fr/villas/properties`
- `https://www.delsolprimehomes.com/nl/villas/properties`
- `https://www.delsolprimehomes.com/de/villas/properties`
- `https://www.delsolprimehomes.com/fi/villas/properties`
- `https://www.delsolprimehomes.com/pl/villas/properties`
- `https://www.delsolprimehomes.com/da/villas/properties`
- `https://www.delsolprimehomes.com/hu/villas/properties`
- `https://www.delsolprimehomes.com/sv/villas/properties`
- `https://www.delsolprimehomes.com/no/villas/properties`

Or use "Purge Everything" for simplicity.

**Part 2 — Code Fix: Add `Surrogate-Control` and `CDN-Cache-Control` to all villas/properties routes**

Looking at the current `public/_headers`, the villas routes (lines 42-81) already have `CDN-Cache-Control: no-store` — so this is already done correctly. However, Cloudflare may have cached the 404 **before** these headers were deployed.

Additionally, there is a secondary defensive fix we can apply: add a `query-param cache-bust` redirect for the French and other non-English villas paths, similar to the existing `?*` redirect rules already in `_redirects` (lines 66-75). These query-param rules force Cloudflare to bypass its route cache because the URL shape is different.

But the most reliable fix is the **Cloudflare cache purge** combined with a **comment bump** in `public/_headers` to force Cloudflare to re-read the file.

### What Will Be Changed

**`public/_headers`** — Add a comment timestamp bump to force Cloudflare to re-process the file and re-read all the no-cache directives for villas routes. This is a safe, non-breaking change.

No changes are needed to `_redirects` or the middleware — the routing logic is already correct.

### After the Fix

Once Cloudflare's cached 404 is cleared:
- `https://www.delsolprimehomes.com/fr/villas/properties` will load correctly
- All other language villas pages (`/nl/`, `/de/`, `/sv/`, etc.) will also be confirmed working
- The no-cache headers will prevent this from happening again for these routes
