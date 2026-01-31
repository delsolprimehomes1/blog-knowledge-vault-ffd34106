

# Translate Founder Bios Based on Language Selection

## Problem Identified

The founder profiles on the About page show **English bios, roles, and specializations** regardless of the selected language (as shown in the Finnish page screenshot):

| Field | Current (English from DB) | Should Be (Finnish Example) |
|-------|--------------------------|----------------------------|
| Steven's Role | "Co-Founder & Director" | "Perustaja & Johtaja" |
| Steven's Bio | "Steven arrived in Spain in 1997..." | "Steven saapui Espanjaan vuonna 1997..." |
| Steven's Specialization | "New Developments and International Buyers" | "Uudiskohteet ja Kansainväliset Ostajat" |
| Cédric's Role | "Co-Founder & Sales Director" | "Perustaja & Myyntijohtaja" |
| Cédric's Bio | "Cédric relocated from Belgium..." | "Cédric muutti Belgiasta..." |
| Hans's Role | "Property Expert & Technology Lead" | "Kiinteistöasiantuntija & Teknologiajohtaja" |
| Hans's Bio | "Hans arrived at the Costa del Sol..." | "Hans saapui Costa del Solille..." |

**Root Cause:** The founder data comes from the database (English only) and is rendered directly without translation lookup.

---

## Solution

Add a `profiles` array to the `aboutUs.founders` section in all 10 language files containing translated bios, roles, and specializations for each founder. Then update the `FounderProfiles` component to merge i18n translations with database data.

---

## Part 1: Add Localized Founder Profiles to i18n Files

### Structure to Add

```typescript
founders: {
  badge: "...",           // EXISTS
  heading: "...",         // EXISTS
  subheading: "...",      // EXISTS
  specialization: "...",  // EXISTS
  viewProfile: "...",     // EXISTS
  profiles: [             // NEW
    {
      name: "Steven Roberts",
      role: "Co-Founder & Director",
      bio: "Steven arrived in Spain in 1997 and began his real estate career in 2010. In 2016, he founded Sentinel Estates, which evolved into Del Sol Prime Homes. A Scottish native, Steven brings decades of experience in the Costa del Sol market.",
      specialization: "New Developments and International Buyers"
    },
    {
      name: "Cédric Van Hecke",
      role: "Co-Founder & Sales Director",
      bio: "Cédric relocated from Belgium to the Costa del Sol in 1998. Together with Steven Roberts, he co-founded the agency and brings extensive knowledge of the local market. His multilingual capabilities make him invaluable for European buyers.",
      specialization: "New developments and European buyers"
    },
    {
      name: "Hans Beeckman",
      role: "Property Expert & Technology Lead",
      bio: "Hans arrived at the Costa del Sol in 2020 and joined as a Property Expert. In 2024, Hans began an intensive course in Artificial Intelligence, bringing cutting-edge technology solutions to enhance the property search experience.",
      specialization: "Technology and AI-enhanced property matching"
    }
  ]
}
```

### Sample Translations

**Finnish (fi.ts):**
```typescript
profiles: [
  {
    name: "Steven Roberts",
    role: "Perustaja & Johtaja",
    bio: "Steven saapui Espanjaan vuonna 1997 ja aloitti kiinteistöuransa vuonna 2010. Vuonna 2016 hän perusti Sentinel Estatesin, josta kehittyi Del Sol Prime Homes. Skotlantilaisena Steven tuo vuosikymmenten kokemuksen Costa del Solin markkinoilta.",
    specialization: "Uudiskohteet ja Kansainväliset Ostajat"
  },
  {
    name: "Cédric Van Hecke",
    role: "Perustaja & Myyntijohtaja",
    bio: "Cédric muutti Belgiasta Costa del Solille vuonna 1998. Yhdessä Steven Robertsin kanssa hän perusti toimiston ja tuo laajan paikallismarkkinoiden tuntemuksen. Hänen monikielisyytensä on korvaamatonta eurooppalaisille ostajille.",
    specialization: "Uudiskohteet ja Eurooppalaiset Ostajat"
  },
  {
    name: "Hans Beeckman",
    role: "Kiinteistöasiantuntija & Teknologiajohtaja",
    bio: "Hans saapui Costa del Solille vuonna 2020 ja liittyi tiimiin kiinteistöasiantuntijana. Vuonna 2024 Hans aloitti intensiivisen tekoälykoulutuksen tuoden huipputeknologiaa kiinteistöhaun parantamiseen.",
    specialization: "Teknologia ja Tekoälyavusteinen Kiinteistöhaku"
  }
]
```

---

## Part 2: Update FounderProfiles Component

### File: `src/components/about/FounderProfiles.tsx`

**Changes:**

1. **Extend the interface** to include localized profiles:
```typescript
interface LocalizedProfile {
  name: string;
  role: string;
  bio: string;
  specialization: string;
}

interface FoundersSection {
  badge?: string;
  heading?: string;
  subheading?: string;
  specialization?: string;
  viewProfile?: string;
  profiles?: LocalizedProfile[];
}
```

2. **Create a helper function** to merge i18n translations with database founder data:
```typescript
const getLocalizedFounder = (founder: Founder, index: number): Founder => {
  const localizedProfile = foundersSection?.profiles?.[index];
  if (!localizedProfile) return founder;
  
  return {
    ...founder,
    role: localizedProfile.role || founder.role,
    bio: localizedProfile.bio || founder.bio,
    specialization: localizedProfile.specialization || founder.specialization,
  };
};
```

3. **Apply localization in render** by calling `getLocalizedFounder(founder, index)` before rendering each founder card.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/translations/en.ts` | Add `founders.profiles` array with English bios |
| `src/i18n/translations/fi.ts` | Add `founders.profiles` array with Finnish bios |
| `src/i18n/translations/de.ts` | Add `founders.profiles` array with German bios |
| `src/i18n/translations/nl.ts` | Add `founders.profiles` array with Dutch bios |
| `src/i18n/translations/fr.ts` | Add `founders.profiles` array with French bios |
| `src/i18n/translations/pl.ts` | Add `founders.profiles` array with Polish bios |
| `src/i18n/translations/da.ts` | Add `founders.profiles` array with Danish bios |
| `src/i18n/translations/hu.ts` | Add `founders.profiles` array with Hungarian bios |
| `src/i18n/translations/sv.ts` | Add `founders.profiles` array with Swedish bios |
| `src/i18n/translations/no.ts` | Add `founders.profiles` array with Norwegian bios |
| `src/components/about/FounderProfiles.tsx` | Merge i18n profiles with database data |

---

## Expected Result

After implementation:
- `/fi/about` shows Finnish founder bios, roles, and specializations
- `/de/about` shows German founder bios, roles, and specializations
- All 10 languages display fully localized founder information
- Database founder data (photo, LinkedIn URL, credentials, years experience) still used for non-translatable fields
- Names remain unchanged across all languages (Steven Roberts, Cédric Van Hecke, Hans Beeckman)

