

# GTM Verification Test Page

## Current Status
GTM-MNQLS97C is already correctly installed:
- `index.html`: Script in `<head>` (line 4-8), noscript after `<body>` (line 54-56)
- `public/app-shell.html`: Script in `<head>` (line 4-8), noscript after `<body>` (line 41-43)

## Changes

### 1. Create `src/pages/GTMTest.tsx`
A simple diagnostic page that checks for `window.dataLayer` and displays its contents, showing a green checkmark if GTM loaded or a red X if not.

### 2. Update routing to add `/gtm-test`
Add a route in the app's router configuration so the page is accessible at `/gtm-test`.

## After Deployment
- Navigate to `/gtm-test` to see the status
- Open browser console and type `dataLayer` to confirm the array exists
- In Google Tag Manager dashboard, use "Preview" mode with your site URL to verify tags are firing
- Once verified, the test page can be removed

