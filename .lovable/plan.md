
# Update Steven Roberts' Years of Experience to 15

## Summary
Change Steven Roberts' years of experience from 28 to 15 to match Cédric Van Hecke and ensure consistency across the team cards.

---

## Database Change

**Table:** `team_members`

| Team Member | Current | Updated |
|-------------|---------|---------|
| Steven Roberts | 28 years | 15 years |
| Cédric Van Hecke | 15 years | No change needed |

**SQL Update:**
```sql
UPDATE team_members 
SET years_experience = 15 
WHERE name = 'Steven Roberts';
```

---

## Result
After this update, both Steven Roberts and Cédric Van Hecke will display "15+ yrs" on their team member cards.
