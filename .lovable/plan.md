

## Update Buyer's Guide Timeline from "3-6" to "1-24"

### Change Required
Update the months timeline value displayed in the SpeakableIntro component from "3-6" to "1-24" months.

### Technical Details

**File:** `src/components/buyers-guide/SpeakableIntro.tsx`

**Line 48 - Current:**
```tsx
<span className="text-2xl font-bold text-white block">3-6</span>
```

**Updated to:**
```tsx
<span className="text-2xl font-bold text-white block">1-24</span>
```

### Why This Works for All Languages
The numeric value "3-6" (and the new "1-24") is hardcoded in the component itself, not in translation files. The label below it (`{t.speakable.months}`) is translated, but the number display is universal. This single change automatically applies to all 10 language versions of the Buyer's Guide.

