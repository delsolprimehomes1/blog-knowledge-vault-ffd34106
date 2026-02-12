

# Add Google Tag Manager (GTM-MNQLS97C)

## Overview
Add Google Tag Manager tracking scripts to `index.html` so GTM loads on every page across all routes and languages.

## Changes

### `index.html` (single file edit)

1. **Head section** -- Add the GTM script as the very first element inside `<head>`, before the existing inline language-detection script:

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MNQLS97C');</script>
<!-- End Google Tag Manager -->
```

2. **Body section** -- Add the noscript fallback immediately after the opening `<body>` tag, before `<div id="root">`:

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MNQLS97C"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

### `public/app-shell.html` (same two additions)

The app-shell used by content pages (blog, Q&A, compare, locations) also needs the same GTM snippets in the same positions to ensure tracking coverage on SSR/middleware-served pages.

## Technical Notes

- No React code changes needed -- `index.html` is the entry point for all SPA routes.
- `app-shell.html` covers pages served by the Cloudflare middleware fallback.
- The `dataLayer` global will be available immediately for any future custom event pushes.
- GTM will fire on every route change automatically via its built-in History Change trigger.

