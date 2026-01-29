

# Replace Team Member Placeholder Photos with Real Photos

## Overview

The site currently displays placeholder initials (SR, CVH, HB) because the photo URLs in the database either point to non-existent files or generic Unsplash images. This plan updates both data sources with the real team member photos.

---

## Current State Analysis

| Data Source | Current Photo Values | Used By |
|-------------|---------------------|---------|
| `team_members` table | Unsplash placeholder images | Team page, Team Modal |
| `about_page_content.founders` JSONB | Local paths like `/team/steven-roberts.jpg` (not working) | About page |

---

## Photo URLs to Apply

| Team Member | New Photo URL |
|-------------|---------------|
| Steven Roberts | `https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb629c63bc054fc8ea90.jpeg` |
| Cédric Van Hecke | `https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb6aa74ce61b82a73c2d.jpeg` |
| Hans Beeckman | `https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb72a74ce63b64a73ded.jpeg` |

---

## Implementation Steps

### Step 1: Update `team_members` Table

Execute SQL to update photo URLs for all three founders:

```sql
UPDATE team_members 
SET photo_url = 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb629c63bc054fc8ea90.jpeg' 
WHERE name ILIKE '%Steven%Roberts%';

UPDATE team_members 
SET photo_url = 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb6aa74ce61b82a73c2d.jpeg' 
WHERE name ILIKE '%Cédric%' OR name ILIKE '%Cedric%';

UPDATE team_members 
SET photo_url = 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb72a74ce63b64a73ded.jpeg' 
WHERE name ILIKE '%Hans%';
```

**Affected pages:** Team page (`/team`), Team member modal popups

---

### Step 2: Update `about_page_content.founders` JSONB

Update the embedded founder data with real photo URLs:

```sql
UPDATE about_page_content 
SET founders = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'name' = 'Steven Roberts' 
        THEN jsonb_set(elem, '{photo_url}', '"https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb629c63bc054fc8ea90.jpeg"')
      WHEN elem->>'name' = 'Cédric Van Hecke' 
        THEN jsonb_set(elem, '{photo_url}', '"https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb6aa74ce61b82a73c2d.jpeg"')
      WHEN elem->>'name' = 'Hans Beeckman' 
        THEN jsonb_set(elem, '{photo_url}', '"https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697beb72a74ce63b64a73ded.jpeg"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(founders) AS elem
)
WHERE slug = 'main';
```

**Affected pages:** About page (`/about`)

---

## No Code Changes Required

The existing components already handle photo display correctly:

- **`FounderProfiles.tsx`**: Uses `<AvatarImage src={founder.photo_url}>` with fallback to initials
- **`TeamMemberCard.tsx`**: Uses `<AvatarImage src={member.photo_url}>` with fallback to initials
- **`TeamMemberModal.tsx`**: Uses `<AvatarImage src={member.photo_url}>` with fallback to initials

All components have proper `object-cover` styling and circular frames with golden borders already in place.

---

## Pages Affected

| Page | Component | Status After Update |
|------|-----------|---------------------|
| `/en/about` (all languages) | `FounderProfiles.tsx` | ✅ Real photos |
| `/en/team` (all languages) | `TeamMemberCard.tsx` | ✅ Real photos |
| Team member modal | `TeamMemberModal.tsx` | ✅ Real photos |

---

## Testing Checklist

After updates:
- [ ] Verify photos appear on About page (3 founders)
- [ ] Verify photos appear on Team page (3 founders)  
- [ ] Verify photos appear in team member modal when clicked
- [ ] Check all 10 language versions display photos correctly
- [ ] Confirm fallback initials still work if image fails to load

