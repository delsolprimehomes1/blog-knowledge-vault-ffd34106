
# Fix: All Three LinkedIn Buttons Link to Company Page

## Current State

Looking at the database and code, the LinkedIn buttons currently redirect to:

| Founder | Current URL | Status |
|---------|-------------|--------|
| Steven Roberts | `https://www.linkedin.com/company/delsolprimehomes/` | Correct |
| Cédric Van Hecke | `https://www.linkedin.com/company/delsolprimehomes/` | Correct |
| Hans Beeckman | `https://www.linkedin.com/in/hansbeeckman/` | **Needs updating** |

---

## Changes Required

### 1. Database Update

Update the `founders` JSONB in `about_page_content` table to change Hans Beeckman's LinkedIn URL from his personal profile to the company page.

```sql
UPDATE about_page_content 
SET founders = jsonb_set(
  founders,
  '{2,linkedin}',  -- Index 2 = Hans Beeckman (third founder)
  '"https://www.linkedin.com/company/delsolprimehomes/"'
)
WHERE slug = 'main';
```

### 2. Code Update (SEO Fallback)

Update `src/lib/aboutSchemaGenerator.ts` to change Hans Beeckman's `linkedin_url` in the `FOUNDERS_DATA` constant from his personal profile to the company page.

| File | Line | Change |
|------|------|--------|
| `src/lib/aboutSchemaGenerator.ts` | Line 65 | Change `https://www.linkedin.com/in/hansbeeckman/` → `https://www.linkedin.com/company/delsolprimehomes/` |

---

## Result

After implementation, all three "View Profile" buttons will redirect to:
**https://www.linkedin.com/company/delsolprimehomes/**

---

## Memory Update

The memory note `company/founder-linkedin-links` should also be updated to reflect that all three founders now link to the company page (no longer a split between personal and company profiles).
