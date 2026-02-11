
# Change Elfsight Widget ID to Embed Code

## What Changes

The "Reviews Section" in the Apartments Page Content admin form currently has a single-line input labeled "Elfsight Widget ID". This needs to become a multi-line textarea labeled "Elfsight Embed Code" so editors can paste the full HTML embed snippet (e.g. `<!-- Elfsight Google Reviews | English --> <script ...></script> <div class="elfsight-app-..." ...></div>`).

## Changes

### 1. Database Migration
- Rename the column `elfsight_widget_id` to `elfsight_embed_code` on the `apartments_page_content` table (using `ALTER TABLE ... RENAME COLUMN`).

### 2. `src/pages/admin/ApartmentsPageContent.tsx`
- Rename `elfsight_widget_id` to `elfsight_embed_code` in the `PageContent` interface, `emptyContent`, `fetchContent` mapping, and `handleSave` payload.
- Change the Reviews Section field from `<Input>` to `<Textarea>` with 4 rows.
- Update the label from "Elfsight Widget ID" to "Elfsight Embed Code".
- Add a helper text below: "Paste the full Elfsight embed code (HTML comment + script + div)".

### 3. Frontend rendering (if applicable)
- Check where `elfsight_widget_id` is consumed on the public-facing apartments page and update it to use the new `elfsight_embed_code` field, rendering the raw HTML via `dangerouslySetInnerHTML` (sanitized with DOMPurify, which is already installed).

---

### Technical Notes
- The column rename is non-destructive -- existing data is preserved.
- DOMPurify (already a project dependency) will sanitize the embed code before rendering to prevent XSS.
- The Supabase types file will auto-update after the migration.
