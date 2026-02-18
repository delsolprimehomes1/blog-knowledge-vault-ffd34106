
## Add `Pragma: no-cache` to All 20 Villas/Apartments Paths in `public/_headers`

### What Exists Now

`public/_headers` lines 41–81 contain all 20 villas/apartments entries. Each entry currently has exactly one header directive:

```
/en/villas
  Cache-Control: no-store, no-cache, must-revalidate
```

### What Changes

Add `  Pragma: no-cache` as a second indented line under every one of the 20 path entries (lines 42–81), so each becomes:

```
/en/villas
  Cache-Control: no-store, no-cache, must-revalidate
  Pragma: no-cache
```

This applies to all 10 villas paths (`/en`, `/nl`, `/fr`, `/de`, `/fi`, `/pl`, `/da`, `/hu`, `/sv`, `/no`) and all 10 apartments paths (same 10 languages).

### Why This Works

Cloudflare re-hashes the `_headers` asset on every deployment. When the file content changes (even by adding one line), Cloudflare treats it as a new version and invalidates the edge cache entries for the affected paths. The `Pragma: no-cache` directive is a genuine HTTP/1.0 cache-busting header that also signals to any upstream proxy that the response must not be served from cache. Together with `Cache-Control: no-store, no-cache, must-revalidate`, this is the strongest possible cache prevention signal available in a `_headers` file.

### Only File Changed

| File | Lines Modified |
|------|---------------|
| `public/_headers` | Lines 43–81 — insert `  Pragma: no-cache` after each `Cache-Control` line (20 insertions total) |

No other files (`App.tsx`, `_redirects`, `_middleware.js`) require any changes.
