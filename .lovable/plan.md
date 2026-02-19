
## Fix: Clean Up Leftover bathrooms/sqm References & Republish

### Root Cause

The published page is showing the OLD version — the code changes removing Bath and SQM were made to the test/preview environment but the **published site has not been updated yet** to reflect those changes.

Additionally, in both component files, the previous edit correctly removed the JSX rendering of Bath and SQM, but left behind two things that should also be cleaned up:

1. `bathrooms: number` and `sqm: number` still in the `Property` interface
2. `bathrooms` and `sqm` still in the Supabase `.select()` query string

These are harmless to the display but fetching unused data. Cleaning them up will make the code consistent and prevent any future confusion.

### What Will Change

**`src/components/apartments/ApartmentsPropertiesSection.tsx`**
- Remove `bathrooms: number` and `sqm: number` from the `Property` interface (lines 25-26)
- Remove `bathrooms, sqm` from the `.select()` query string (line 129)

**`src/components/villas/VillasPropertiesSection.tsx`**
- Remove `bathrooms: number` and `sqm: number` from the `Property` interface (lines 25-26)
- Remove `bathrooms, sqm` from the `.select()` query string (line 120)

### Why the Published Page Still Shows Bath/SQM

The published URL (`blog-knowledge-vault.lovable.app`) is serving a **previously published build**. Every time you make changes in the editor, they appear in the preview but the published site only updates when you click **Publish**. The previous removal of Bath/SQM happened after the last publish, so the live site is still on the old version.

After this cleanup is applied, **republishing will fix the published page** — Bath and SQM will be completely gone.

### No Design Changes

The cards already look correct in the preview. This is purely a code hygiene fix + a republish to push the working version to production.

### Files Changed

- `src/components/apartments/ApartmentsPropertiesSection.tsx` — Remove 2 interface fields + update select query
- `src/components/villas/VillasPropertiesSection.tsx` — Remove 2 interface fields + update select query
