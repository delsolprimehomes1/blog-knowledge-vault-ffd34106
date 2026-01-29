

# Fix Buyer's Guide - Correct Step Order

## Problem Summary

The current Buyer's Guide has steps in the wrong order based on actual Spanish property buying practice. Hans has provided the **correct order** that reflects real-world workflow where the lawyer handles NIE and bank account setup on your behalf.

**Current (Incorrect) Order:**
1. Define Your Requirements
2. Get Your NIE Number ❌
3. Open a Spanish Bank Account ❌
4. Property Search & Viewings
5. Make an Offer & Reservation
6. Legal Due Diligence
7. Sign Private Purchase Contract
8. Complete at the Notary

**Correct Order (Hans's):**
1. Define Your Requirements
2. Property Search
3. Reservation
4. Appoint a Lawyer (Power of Attorney)
5. Lawyer Gets Your NIE Number
6. Lawyer Opens Bank Account
7. Private Purchase Contract
8. Complete at Notary

---

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/translations/buyersGuide/en.ts` | Rewrite process.steps with correct order and new content |
| `src/i18n/translations/buyersGuide/nl.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/de.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/fr.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/sv.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/no.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/da.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/fi.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/pl.ts` | Translate new step order |
| `src/i18n/translations/buyersGuide/hu.ts` | Translate new step order |
| `src/components/buyers-guide/ProcessTimeline.tsx` | Update icons to match new steps |
| `src/components/buyers-guide/BuyersGuideHero.tsx` | Update timeline stat (6-12 weeks instead of 3-6 months) |

---

## Implementation Details

### 1. English Translation - New Step Content

```typescript
// New correct process.steps for en.ts
steps: [
  {
    title: "Define Your Requirements",
    description: "Establish your budget range, property type (apartment, penthouse, townhouse, villa), location preferences, and must-haves versus nice-to-haves. Consider your timeline for purchase.",
    documents: [],
    cta: { text: "Start with our Property Finder", link: "/en/find-property" }
  },
  {
    title: "Property Search",
    description: "Work with Del Sol Prime Homes to view suitable properties. We offer virtual tours, in-person viewings, and area familiarization trips to help you find your perfect home.",
    documents: [],
    cta: { text: "Search Properties", link: "/en/find-property" }
  },
  {
    title: "Reservation",
    description: "Once you've found your property, make an offer. Upon acceptance, sign a reservation agreement and pay a deposit (typically €6,000-€10,000) to secure the property for 2-4 weeks.",
    documents: ["Reservation agreement", "Passport copy", "Proof of funds"]
  },
  {
    title: "Appoint a Lawyer (Power of Attorney)",
    description: "Engage a Spanish lawyer who will represent your interests. Grant them Power of Attorney (Poder Notarial) so they can handle the legal process on your behalf—even if you're not in Spain.",
    documents: ["Power of Attorney document", "Passport copy", "Lawyer engagement letter"]
  },
  {
    title: "Obtain Your NIE Number",
    description: "Your lawyer obtains your NIE (Número de Identificación de Extranjero)—the Spanish tax ID required for all property transactions. This typically takes 1-3 weeks.",
    documents: ["Passport copy", "NIE application form (EX-15)", "Reason for application"]
  },
  {
    title: "Open Spanish Bank Account",
    description: "Your lawyer arranges a Spanish bank account in your name—required for the property purchase and ongoing payments. This can be done remotely with your Power of Attorney.",
    documents: ["NIE number", "Passport copy", "Proof of address", "Proof of income"]
  },
  {
    title: "Private Purchase Contract",
    description: "Sign the Contrato Privado de Compraventa. Pay 10% of the purchase price (minus the reservation deposit). The contract sets the completion date and binds both parties legally.",
    documents: ["Contrato Privado", "10% deposit", "Due diligence report from lawyer"]
  },
  {
    title: "Complete at Notary",
    description: "Sign the Escritura (title deed) at the notary's office, pay the final balance, and receive your keys! The notary registers the property in your name at the Land Registry.",
    documents: ["Escritura", "Final payment", "All previous documentation"]
  }
]
```

### 2. Update Hero Section

```typescript
// Update hero stats in en.ts
stats: {
  steps: { value: "8", label: "Simple Steps" },
  timeline: { value: "6-12", label: "Week Timeline" },  // Changed from 3-6 months
  locations: { value: "15+", label: "Prime Locations" },
  languages: { value: "10+", label: "Languages" }
}
```

### 3. Update ProcessTimeline Icons

```typescript
// New icons matching the updated steps
import { 
  ClipboardList,  // Step 1: Define Requirements
  Search,         // Step 2: Property Search  
  CalendarCheck,  // Step 3: Reservation
  Scale,          // Step 4: Lawyer/POA
  FileText,       // Step 5: NIE Number
  Building2,      // Step 6: Bank Account
  FileSignature,  // Step 7: Private Contract
  Key             // Step 8: Completion
} from 'lucide-react';

const stepIcons = [ClipboardList, Search, CalendarCheck, Scale, FileText, Building2, FileSignature, Key];
```

### 4. All 10 Language Translations

Each language file will be updated with the new 8 steps in the correct order:

| Language | Step 4 Title (New) | Key Translation Note |
|----------|-------------------|----------------------|
| English | Appoint a Lawyer (Power of Attorney) | Base version |
| Dutch | Schakel een Advocaat in (Volmacht) | "Volmacht" = Power of Attorney |
| German | Beauftragen Sie einen Anwalt (Vollmacht) | "Vollmacht" = Power of Attorney |
| French | Engagez un Avocat (Procuration) | "Procuration" = Power of Attorney |
| Swedish | Anlita en Advokat (Fullmakt) | "Fullmakt" = Power of Attorney |
| Norwegian | Engasjer en Advokat (Fullmakt) | "Fullmakt" = Power of Attorney |
| Danish | Ansæt en Advokat (Fuldmagt) | "Fuldmagt" = Power of Attorney |
| Finnish | Palkkaa Asianajaja (Valtakirja) | "Valtakirja" = Power of Attorney |
| Polish | Zatrudnij Prawnika (Pełnomocnictwo) | "Pełnomocnictwo" = Power of Attorney |
| Hungarian | Bízzon meg egy Ügyvédet (Meghatalmazás) | "Meghatalmazás" = Power of Attorney |

---

## Key Messaging Changes

The fundamental narrative shift is:

| Aspect | Before | After |
|--------|--------|-------|
| NIE/Bank | "You get these first" | "Your lawyer handles this for you" |
| Lawyer Role | Just "Legal Due Diligence" | Central role with Power of Attorney |
| Timeline Position | NIE before property search | NIE after reservation |
| Remote Buying | Not emphasized | Emphasized (POA enables remote purchase) |

---

## Visual Diagram of New Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROPERTY BUYING JOURNEY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: DISCOVERY          PHASE 2: COMMITMENT        PHASE 3: LEGAL     │
│  ─────────────────           ─────────────────          ───────────────     │
│  ┌───────────────┐          ┌───────────────┐          ┌───────────────┐   │
│  │ 1. DEFINE     │          │ 3. RESERVATION│          │ 4. APPOINT    │   │
│  │    REQUIREMENTS│    ──►   │    €6-10k     │    ──►   │    LAWYER     │   │
│  └───────────────┘          │    deposit    │          │    + POA      │   │
│         │                   └───────────────┘          └───────────────┘   │
│         ▼                                                     │            │
│  ┌───────────────┐                                           ▼            │
│  │ 2. PROPERTY   │          ┌───────────────────────────────────────────┐ │
│  │    SEARCH     │          │  LAWYER HANDLES (on your behalf):         │ │
│  │    & VIEWINGS │          │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │ │
│  └───────────────┘          │  │ 5. NIE  │  │ 6. BANK │  │   DUE   │   │ │
│                             │  │ NUMBER  │  │ ACCOUNT │  │DILIGENCE│   │ │
│                             │  └─────────┘  └─────────┘  └─────────┘   │ │
│                             └───────────────────────────────────────────┘ │
│                                                                   │       │
│  PHASE 4: COMPLETION                                              ▼       │
│  ───────────────────                                                      │
│  ┌───────────────┐          ┌───────────────┐                            │
│  │ 8. NOTARY     │    ◄──   │ 7. PRIVATE    │                            │
│  │    COMPLETION │          │    CONTRACT   │                            │
│  │    🎉 KEYS!   │          │    10% deposit│                            │
│  └───────────────┘          └───────────────┘                            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary of Changes

1. **Reorder steps** in all 10 language translation files to match Hans's correct order
2. **New Step 4** content: "Appoint a Lawyer (Power of Attorney)" - completely new step
3. **Modified Steps 5 & 6**: Emphasize that the lawyer handles NIE and bank account
4. **Update hero timeline**: Change from "3-6 Month Timeline" to "6-12 Week Timeline"
5. **Update ProcessTimeline icons**: New icon set to match the updated step meanings
6. **Maintain SEO structure**: Keep all existing JSON-LD schema patterns, FAQ section, and costs breakdown unchanged

