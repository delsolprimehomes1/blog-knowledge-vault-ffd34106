
## Fix: Translate Status & Property Type Labels in the Admin Properties Table

### The Problem

In the admin properties table, two columns always display raw English database values regardless of which language tab is selected:

- **Type column**: shows "apartment", "villa", "townhouse" (always English)
- **Status column**: shows "available", "for_sale", "new_development" (always English)

These are internal database enum-style values stored as English strings. They cannot be translated in the database because they're used as filter keys — but their *display labels* in the admin UI should reflect the selected language.

### What Will Change

**`src/pages/admin/ApartmentsProperties.tsx`** — One file, targeted changes only.

Add two translation maps near the top of the `PropertiesManager` component:

**Status translations** (10 languages × 3 values):
| DB Value | EN | FR | DE | NL | etc. |
|---|---|---|---|---|---|
| available | Available | Disponible | Verfügbar | Beschikbaar | ... |
| for_sale | For Sale | À vendre | Zu verkaufen | Te koop | ... |
| new_development | New Development | Nouveau projet | Neuentwicklung | Nieuw project | ... |

**Property type translations** (10 languages × 3 values):
| DB Value | EN | FR | DE | NL | etc. |
|---|---|---|---|---|---|
| apartment | Apartment | Appartement | Wohnung | Appartement | ... |
| villa | Villa | Villa | Villa | Villa | ... |
| townhouse | Townhouse | Maison de ville | Stadthaus | Stadswoning | ... |
| penthouse | Penthouse | Penthouse | Penthouse | Penthouse | ... |

Then update the two table cells that display these values:

- **Line 291**: `{p.property_type}` → `{TYPE_LABELS[lang]?.[p.property_type] ?? p.property_type}`
- **Line 293**: `{p.status}` → `{STATUS_LABELS[lang]?.[p.status] ?? p.status}`

A fallback to the raw value (`?? p.property_type`) ensures that any unexpected values still display rather than showing blank.

### Technical Details

- The translation maps are **display-only** — they do not change what is written to the database. The underlying database values stay as "apartment", "for_sale", etc. (these are used by the translation edge function as filter keys)
- This is a client-side label map, not an AI translation — it's instant and always consistent
- The same `lang` state variable already in `PropertiesManager` is used to select the correct label set
- No edge function changes, no database changes needed

### Scope

This is an admin-only UI fix. The public-facing property cards (`ApartmentsPropertiesSection`, `VillasPropertiesSection`) do not display raw status/type strings to visitors, so no changes are needed there.

### Files Changed

- `src/pages/admin/ApartmentsProperties.tsx` — Add two label maps + update two render cells
