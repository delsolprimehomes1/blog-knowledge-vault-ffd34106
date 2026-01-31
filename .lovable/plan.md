
# Fix About Page Translation & Button Visibility Issues

## Problems Identified

### Problem 1: Content Not Translating to Finnish
The About page is using **database content** (English only) instead of **i18n translations** for several sections:

| Section | Current Source | Should Be |
|---------|----------------|-----------|
| Mission Statement text | Database prop | i18n `aboutUs.mission.content` |
| "About Us" summary text | Database prop | i18n `aboutUs.mission.speakableContent` |
| "A Journey of Passion..." narrative | Database `our_story_content` | i18n `aboutUs.story.content` |
| Founder bios & roles | Database `founders` JSONB | i18n localized founder data |
| Credentials items | Hardcoded English in About.tsx | i18n `aboutUs.credentials.items` |

### Problem 2: White Button with Invisible Text
In the CTA section, the "Chat with Emma" button has:
```tsx
variant="outline"  // → applies bg-background (white)
className="text-white"  // → white text on white = invisible!
```

---

## Solution

### Part 1: Add Missing Translation Keys (10 files)

Add new keys to the `aboutUs` section in all translation files:

**New keys needed:**
```typescript
aboutUs: {
  mission: {
    heading: "...",           // EXISTS
    summaryLabel: "...",      // EXISTS
    content: "...",           // NEW - translated mission statement
    speakableContent: "..."   // NEW - translated about us summary
  },
  story: {
    heading: "...",           // EXISTS
    subheading: "...",        // EXISTS
    timelineHeading: "...",   // EXISTS
    timeline: [...],          // EXISTS
    narrativeHeading: "...",  // NEW - "A Journey of Passion and Expertise"
    narrativeContent: "..."   // NEW - translated story paragraphs
  },
  founders: {
    badge: "...",             // EXISTS
    heading: "...",           // EXISTS
    subheading: "...",        // EXISTS
    specialization: "...",    // EXISTS
    viewProfile: "...",       // EXISTS
    profiles: [...]           // NEW - localized founder bios
  },
  credentials: {
    heading: "...",           // EXISTS
    subheading: "...",        // EXISTS
    citationsLabel: "...",    // EXISTS
    items: [...]              // EXISTS in some files
  }
}
```

### Part 2: Update Components to Use i18n (4 files)

#### File 1: `src/components/about/MissionStatement.tsx`

**Change:** Use i18n translation for mission statement and speakable summary, fall back to props

```tsx
// Add to missionSection interface
interface MissionSection {
  heading?: string;
  summaryLabel?: string;
  content?: string;           // Add
  speakableContent?: string;  // Add
}

// In the component
<p className="...">
  "{missionSection?.content || mission}"  // Use i18n first
</p>

<p className="...">
  {missionSection?.speakableContent || speakableSummary}  // Use i18n first
</p>
```

#### File 2: `src/components/about/OurStory.tsx`

**Change:** Add i18n for narrative section heading and content

```tsx
// Extend interface
interface Story {
  heading?: string;
  subheading?: string;
  timelineHeading?: string;
  timeline?: TimelineItem[];
  narrativeHeading?: string;   // Add
  narrativeContent?: string;   // Add
}

// In the render
<h3>{story?.narrativeHeading || "A Journey of Passion and Expertise"}</h3>
<div dangerouslySetInnerHTML={{ __html: parseMarkdown(story?.narrativeContent || content) }} />
```

#### File 3: `src/components/about/FounderProfiles.tsx`

**Change:** Add localized founder profile support from i18n

```tsx
// Add interface
interface LocalizedFounder {
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
  profiles?: LocalizedFounder[];  // Add
}

// In the component, merge database founders with i18n translations
const getLocalizedFounder = (founder: Founder, index: number) => {
  const profile = foundersSection?.profiles?.[index];
  return {
    ...founder,
    role: profile?.role || founder.role,
    bio: profile?.bio || founder.bio,
    specialization: profile?.specialization || founder.specialization,
  };
};
```

#### File 4: `src/pages/About.tsx`

**Change:** Use i18n credentials instead of hardcoded English

```tsx
// Current (hardcoded English)
credentials={pageContent.founders.length > 0 ? [
  { name: "API Licensed", description: "Registered with...", icon: "shield-check" },
  ...
] : []}

// Fixed (use i18n)
const { t } = useTranslation();
const aboutUs = t.aboutUs as Record<string, unknown> | undefined;
const credentialsFromI18n = (aboutUs?.credentials as any)?.items || [];

<Credentials
  credentials={credentialsFromI18n}
  citations={pageContent.citations}
/>
```

### Part 3: Fix Button Visibility

#### File: `src/components/about/AboutCTA.tsx`

**Change line 48-55:**

```tsx
// Current (broken)
<Button 
  size="lg" 
  variant="outline" 
  className="border-white/30 text-white hover:bg-white/10 px-8"
  onClick={...}
>

// Fixed (add bg-transparent to override bg-background)
<Button 
  size="lg" 
  variant="outline" 
  className="bg-transparent border-white/30 text-white hover:bg-white/10 px-8"
  onClick={...}
>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/translations/en.ts` | Add `mission.content`, `mission.speakableContent`, `story.narrativeHeading`, `story.narrativeContent`, `founders.profiles` |
| `src/i18n/translations/fi.ts` | Add same keys with Finnish translations |
| `src/i18n/translations/de.ts` | Add same keys with German translations |
| `src/i18n/translations/nl.ts` | Add same keys with Dutch translations |
| `src/i18n/translations/fr.ts` | Add same keys with French translations |
| `src/i18n/translations/pl.ts` | Add same keys with Polish translations |
| `src/i18n/translations/da.ts` | Add same keys with Danish translations |
| `src/i18n/translations/hu.ts` | Add same keys with Hungarian translations |
| `src/i18n/translations/sv.ts` | Add same keys with Swedish translations |
| `src/i18n/translations/no.ts` | Add same keys with Norwegian translations |
| `src/components/about/MissionStatement.tsx` | Use i18n content with prop fallback |
| `src/components/about/OurStory.tsx` | Use i18n for narrative section |
| `src/components/about/FounderProfiles.tsx` | Merge i18n profiles with database founders |
| `src/pages/About.tsx` | Use i18n credentials instead of hardcoded |
| `src/components/about/AboutCTA.tsx` | Add `bg-transparent` to fix button visibility |

---

## Expected Result

After implementation:
- `/fi/about` shows 100% Finnish content (mission, story, founder bios, credentials)
- `/de/about` shows 100% German content
- All 10 languages display fully localized About page content
- "Chat with Emma" button is visible with white text on transparent background
- Database content only used as fallback when i18n translations missing
