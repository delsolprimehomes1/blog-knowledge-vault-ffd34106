
# Update Founder Credentials: API Licensed vs API Degree

## Current State

The credentials are stored in **two locations** that need to be synchronized:

| Location | Steven Roberts | Cédric Van Hecke | Hans Beeckman |
|----------|---------------|------------------|---------------|
| `about_page_content.founders` | API Licensed Agent (2025) | API Licensed Agent (2025) | API Licensed Agent (2025) |
| `team_members.credentials` | API Licensed, RICS Affiliate | API Licensed, Property Investment Certified | AI Specialist, Digital Marketing Expert |

## Required Changes

Based on legal requirements:
- **Cédric Van Hecke** → Keep "API Licensed" (he is the only licensed agent)
- **Steven Roberts** → Change to "API Degree" 
- **Hans Beeckman** → Change to "API Degree"

---

## Database Updates

### 1. Update `about_page_content.founders` (About Page)

Update the credentials array for each founder in the JSONB:

| Founder | Current | New |
|---------|---------|-----|
| Steven Roberts | `["API Licensed Agent (2025)", "Sentinel Estates Founder"]` | `["API Degree", "Sentinel Estates Founder"]` |
| Cédric Van Hecke | `["API Licensed Agent (2025)", "Certified Negotiation Expert"]` | `["API Licensed", "Certified Negotiation Expert"]` ← Keep licensed |
| Hans Beeckman | `["API Licensed Agent (2025)", "AI Technology Specialist (2024)"]` | `["API Degree", "AI Technology Specialist (2024)"]` |

### 2. Update `team_members.credentials` (Team Page)

| Name | Current | New |
|------|---------|-----|
| Steven Roberts | `["API Licensed", "RICS Affiliate"]` | `["API Degree", "RICS Affiliate"]` |
| Cédric Van Hecke | `["API Licensed", "Property Investment Certified"]` | `["API Licensed", "Property Investment Certified"]` ← No change |
| Hans Beeckman | `["AI Specialist", "Digital Marketing Expert"]` | `["API Degree", "AI Specialist"]` |

---

## Regarding Multi-Language Support

Currently, the About page content exists only in English (`language: 'en'`). The Team page uses a single `team_members` table with translation columns (`role_translations`, `bio_translations`).

### Current Architecture
- About page: Single English record in `about_page_content`
- Team page: Single records per member with JSONB translation columns
- Both pages: No separate language versions in database

### To Implement Full 10-Language Support with Canonical/Hreflang

This would require a larger architectural change:

1. **Create 10 language variants** in `about_page_content` table (one row per language)
2. **Add `hreflang_group_id`** column to link translations together
3. **Update About page routing** to use `/:lang/about` pattern
4. **Create `AboutHreflangTags` component** similar to existing `PropertyHreflangTags`
5. **Translate all founder bios and page content** into 10 languages

This is a significant expansion beyond the credentials fix. I recommend:
1. **Phase 1 (Now)**: Fix the credentials in the database
2. **Phase 2 (Follow-up)**: Full multilingual About page architecture

---

## Implementation Summary

| Step | Action |
|------|--------|
| 1 | Update `about_page_content.founders` JSONB to change credentials |
| 2 | Update `team_members` table credentials for Steven and Hans |

Both updates will immediately reflect on the About and Team pages without code changes.

