
## Goal
Update **Steven Roberts**’ “Specializations” everywhere it is displayed (including the **About page**) to:
- **New Developments**
- **International Buyers**

…and ensure the change is consistent “for all languages” (i.e., regardless of the site language selected).

---

## What I found (why you’re still seeing the old value on /en/about)
There are **two different data sources** used in the site:

1) **Team page / Team modal** uses the `team_members` table.  
   - This is already updated correctly:
   - `team_members.specializations = ["New Developments", "International Buyers"]`

2) **About page founders section** uses the `about_page_content` table (`slug = 'main'`) and reads `founders` from a JSON field.
   - In this founders JSON, Steven is still set to:
   - `specialization: "British Buyers & International Buyers"`
   - That matches your screenshot, and explains why /en/about didn’t change.

So we need to **synchronize the founders JSON** as well.

---

## Implementation approach
### A) Keep the About page structure as-is (fastest, no UI refactor)
- Update the founders JSON field so Steven’s `specialization` string becomes:
  - `"New Developments and International Buyers"`

This will immediately update:
- The founder card “Specialization” line on the About page
- The specialization badge shown inside the modal when clicking Steven on the About page

Important note:
- The About page founder model currently supports **one specialization string**, so it will display as **one pill** containing the combined text.
- The Team page will still show **two separate specializations** (because it is an array).

### B) Optional enhancement (if you want two separate pills on the About page too)
If you want the About page to show **two separate specialization badges** (like the Team profile does), we can do a small follow-up:
- Extend founder objects to support `specializations: string[]`
- Update `FounderProfiles.tsx` transform to pass the array into the modal
- Keep backward compatibility with the existing `specialization` string so nothing else breaks

(This is optional and not required to satisfy the immediate request, but it matches the “two items” display style.)

---

## Exact backend changes (safe & idempotent)

### 1) Ensure the team member record is correct (already done, but safe to re-run)
```sql
UPDATE public.team_members
SET specializations = ARRAY['New Developments', 'International Buyers']
WHERE name = 'Steven Roberts';
```

### 2) Update the About page founders JSON (this is the missing piece)
```sql
UPDATE public.about_page_content
SET
  founders = (
    SELECT jsonb_agg(
      CASE
        WHEN f->>'name' = 'Steven Roberts'
          THEN jsonb_set(
            f,
            '{specialization}',
            to_jsonb('New Developments and International Buyers'::text),
            true
          )
        ELSE f
      END
    )
    FROM jsonb_array_elements(founders) AS f
  ),
  updated_at = now()
WHERE slug = 'main';
```

---

## Verification steps
1) Reload **/en/about** (hard refresh if needed).
2) Click Steven’s founder card to open the modal.
3) Confirm Specializations now show **New Developments and International Buyers**.
4) Check the Team page modal as well to confirm it still shows the two-item array.

---

## Expected result
- **Team pages**: Steven shows 2 specializations (two items).
- **About page founders**: Steven shows the updated specialization text (same across all languages because it’s stored as a base value in the backend data).

---

## Optional follow-up (only if you want two separate specialization badges on About founders)
- Add support for `specializations: string[]` in the founder JSON and UI, so the About founder modal shows **two separate badges** as well.
