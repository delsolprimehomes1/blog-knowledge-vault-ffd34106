
## Update Buyer's Guide Copy: "3-6 months" → "1-24 months" (All Languages)

### Problem
The paragraph text in the SpeakableIntro section says the property buying process takes "3-6 months" but this needs to be updated to "1-24 months" to match the recently updated stat display.

### What Needs to Change

**10 Translation Files** — Update the `speakable.paragraph2` field in each language file:

| Language | File | Current | New |
|----------|------|---------|-----|
| English | `en.ts` | "3-6 months" | "1-24 months" |
| German | `de.ts` | "3-6 Monate" | "1-24 Monate" |
| Dutch | `nl.ts` | "3-6 maanden" | "1-24 maanden" |
| French | `fr.ts` | "3 à 6 mois" | "1 à 24 mois" |
| Polish | `pl.ts` | "3-6 miesięcy" | "1-24 miesięcy" |
| Swedish | `sv.ts` | "3-6 månader" | "1-24 månader" |
| Danish | `da.ts` | "3-6 måneder" | "1-24 måneder" |
| Hungarian | `hu.ts` | "3-6 hónapot" | "1-24 hónapot" |
| Finnish | `fi.ts` | "3-6 kuukautta" | "1-24 kuukautta" |
| Norwegian | `no.ts` | "3-6 måneder" | "1-24 måneder" |

### Technical Details

**Directory:** `src/i18n/translations/buyersGuide/`

Each file contains the `speakable.paragraph2` property that needs editing. The change is a simple find-and-replace within the paragraph string, preserving all other content.

**Example (English):**
```text
Current: "The process takes 3-6 months from finding your property..."
Updated: "The process takes 1-24 months from finding your property..."
```

### Result
After this change, both the numeric stat display ("1-24") and the paragraph copy will be consistent across all 10 language versions of the Buyer's Guide.
