
## Remove Bathrooms & SQM from All Apartment and Villa Property Cards

### What's Being Removed

The **Bathrooms** and **SQM** stats currently appear on every property card on the public-facing Apartments and Villas pages, and in the admin table view. The request is to remove them entirely from:

1. **Public property cards** — Apartments section
2. **Public property cards** — Villas section
3. **Admin table columns** — the Bathrooms & SQM display columns in the list view
4. **Admin edit form** — the Bathrooms and SQM input fields (optional: keep in DB but hide from form, or leave as-is since the data still exists in the database)

### Files to Change

**1. `src/components/apartments/ApartmentsPropertiesSection.tsx`**
- Remove the `Bath` and `Square` icon imports (no longer needed)
- Remove `bathrooms` and `sqm` from the `Property` interface
- Remove `bathrooms` and `sqm` from the `.select()` query string
- Delete the two `<div>` stat rows for Bath and Square inside `PropertyCard`
- The remaining stats row will show only the **Beds** count

**2. `src/components/villas/VillasPropertiesSection.tsx`**
- Same changes as above — identical structure

**3. `src/pages/admin/ApartmentsProperties.tsx`**
- Remove Bathrooms and SQM from the **admin table columns** (TableHead + TableCell) so the list view is cleaner
- Remove the Bathrooms and SQM **input fields** from the Edit/Add Property dialog form
- Keep the fields in the database schema and the `form` state object so existing data is preserved — the fields just won't be shown or edited through the UI going forward

### What the Card Will Look Like After

The bottom stats row on each property card will show only:

```
[Bed icon] 2 - 3          [View →]
```

Instead of the current:

```
[Bed icon] 2 - 3   [Bath icon] 2   [Sq icon] 120m²          [View →]
```

### No Database Changes

The `bathrooms` and `sqm` columns stay in the database as-is. Existing values are preserved. The translation edge functions will continue to copy these fields as they do now — they just won't be displayed to users or editable through the admin form.
