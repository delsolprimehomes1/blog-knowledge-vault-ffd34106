
# Fix Round Robin Language Dropdown

## Problem
The "Edit Round" dialog in `/crm/admin/round-robin` lists **Spanish** (`es`) in the language dropdown, but Spanish is not a supported language. **Norwegian** (`no`) is missing and needs to be added.

## Change

### `src/pages/crm/admin/RoundRobinConfig.tsx` (line 84)

Replace the Spanish entry with Norwegian:

```
// Before
{ code: "es", name: "Spanish" },

// After
{ code: "no", name: "Norwegian" },
```

The supported languages will then be: English, French, Dutch, Finnish, Polish, German, **Norwegian**, Swedish, Danish, Hungarian — matching the 10 languages defined in `src/types/home.ts`.

No other files or database changes are needed.
