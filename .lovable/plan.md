

## Fix: Display Bedroom Range on Public Property Cards

### Problem
The admin dashboard correctly shows "1 - 3" for bedrooms, but the public-facing property cards on `/en/apartments` only show "1" because the `bedrooms_max` column is not fetched or used.

### Changes

**File: `src/components/apartments/ApartmentsPropertiesSection.tsx`**

1. Add `bedrooms_max` to the `Property` interface (nullable number)
2. Add `bedrooms_max` to the Supabase `.select()` query
3. Update the bedroom display in `PropertyCard` to show a range when `bedrooms_max` exists and differs from `bedrooms`:
   - If `bedrooms_max` is set and different: show "1 - 3"
   - Otherwise: show just "1"

This is a small, focused fix -- only 3 lines need to change in the one file.
