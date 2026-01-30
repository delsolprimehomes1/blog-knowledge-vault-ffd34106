
# Replace Buyers Guide PDF File

## Current State
The "Download PDF Guide" button on the Buyers Guide page already links to `/downloads/The-Complete-Costa-del-Sol-Property-Buyers-Guide-2026.pdf` via the `COMPANY_RESOURCES.buyersGuideUrl` constant.

## Solution
Simply replace the existing PDF file with the newly uploaded version. No code changes needed since the URL path remains the same.

### File Change

| Action | File |
|--------|------|
| Replace | `public/downloads/The-Complete-Costa-del-Sol-Property-Buyers-Guide-2026.pdf` |

Copy the uploaded file `The-Complete-Costa-del-Sol-Property-Buyers-Guide-2026-2.pdf` to overwrite the existing PDF at `public/downloads/The-Complete-Costa-del-Sol-Property-Buyers-Guide-2026.pdf`.

## Result
- The "Download PDF Guide" button across all 10 language versions of the Buyers Guide page will serve the new PDF
- Users clicking the button will download the updated guide
- No code changes required - the existing `COMPANY_RESOURCES.buyersGuideUrl` path continues to work
