
# Add Language-Specific Welcome-Back Videos to Retargeting Hero

## Current State

The retargeting pages have **two** video components:

| Component | Location | Current Behavior |
|-----------|----------|-----------------|
| `RetargetingHero` | Above the fold | Video modal with **hardcoded English URL** on line 125 |
| `RetargetingAutoplayVideo` | Below hero | Already has language-specific videos (different set) |

The Hero's "Watch Video" button opens a modal with this hardcoded URL:
```tsx
videoUrl="https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548eb59a77b4486da126b.mp4"
```

## Implementation Plan

### 1. Create Video Configuration File

Create a centralized config for the new welcome-back videos:

**File:** `src/config/retargetingWelcomeBackVideos.ts`

```typescript
export const RETARGETING_WELCOME_BACK_VIDEOS: Record<string, string> = {
  en: '', // Pending - component will gracefully hide button
  nl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/69754915c1fa0c27e56bed08.mp4',
  de: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548ebd4fb90e7cab25cba.mp4',
  fr: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548eb59a77b05d5da126c.mp4',
  es: '', // Pending - component will gracefully hide button
  pl: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548eb59a77b9fa4da126d.mp4',
  sv: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548ebc1fa0c2ca16bde41.mp4',
  da: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/69754915a87beb1d53acc836.mp4',
  hu: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548ebeb392bd9da2c924e.mp4',
  fi: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548ebeb392b6d632c924d.mp4',
  no: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548eba87beb06f5acbadc.mp4',
};

export const getWelcomeBackVideoUrl = (language: string): string | null => {
  const url = RETARGETING_WELCOME_BACK_VIDEOS[language];
  return url || null; // Return null if no video for this language
};
```

### 2. Update RetargetingHero Component

Modify `src/components/retargeting/RetargetingHero.tsx` to:

1. Import the new config
2. Get language-specific video URL
3. Conditionally show video button only if video exists
4. Pass dynamic URL to modal

**Key changes:**

```typescript
// Add import
import { getWelcomeBackVideoUrl } from "@/config/retargetingWelcomeBackVideos";

// Inside component
const videoUrl = getWelcomeBackVideoUrl(language);
const hasVideo = Boolean(videoUrl);

// Conditionally render video button
{hasVideo && (
  <Button
    onClick={() => setIsVideoOpen(true)}
    ...
  >
    <Play className="w-4 h-4 mr-2" />
    {t.heroButton}
  </Button>
)}

// Pass dynamic URL to modal
<RetargetingVideoModal
  isOpen={isVideoOpen}
  onClose={() => setIsVideoOpen(false)}
  videoUrl={videoUrl || ''}
/>
```

### 3. Handle Missing Videos Gracefully

For English and Spanish (pending videos):
- Hide the "Watch Video" button entirely
- Keep the secondary CTA ("Or talk to Emma") visible
- No error states or broken UI

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/config/retargetingWelcomeBackVideos.ts` | **CREATE** | Video URL configuration with helper function |
| `src/components/retargeting/RetargetingHero.tsx` | **MODIFY** | Import config, use dynamic URL, conditionally show button |

---

## Testing Checklist

After implementation, verify:

| Language | Path | Expected Behavior |
|----------|------|-------------------|
| Dutch | `/nl/welkom-terug` | Dutch video plays in modal |
| German | `/de/willkommen-zurueck` | German video plays in modal |
| French | `/fr/bienvenue` | French video plays in modal |
| Polish | `/pl/witamy-ponownie` | Polish video plays in modal |
| Swedish | `/sv/valkommen-tillbaka` | Swedish video plays in modal |
| Danish | `/da/velkommen-tilbage` | Danish video plays in modal |
| Hungarian | `/hu/udvozoljuk-ujra` | Hungarian video plays in modal |
| Finnish | `/fi/tervetuloa-takaisin` | Finnish video plays in modal |
| Norwegian | `/no/velkommen-tilbake` | Norwegian video plays in modal |
| English | `/en/welcome-back` | Video button hidden (no crash) |
| Spanish | `/es/bienvenido` | Video button hidden (no crash) |

---

## Notes

- The existing `RetargetingAutoplayVideo` component uses a **different set of videos** and remains unchanged
- This implementation separates concerns: config file for URLs, component for rendering
- When English/Spanish videos are added later, simply add URLs to the config file
