
# Replace Play Button with "Enable Sound" Button on Retargeting Videos

## Overview

Replace the current play/pause button overlay with a "click to hear sound" button since videos already autoplay muted. This will allow users to enable audio with a single click.

## Current Behavior

- Videos autoplay muted (browser requirement for autoplay)
- A play/pause button overlay is shown over the video
- The button controls play/pause, not audio

## New Behavior

- Videos continue to autoplay muted
- A sound button appears in the corner (not center)
- When clicked, the video unmutes and the icon changes to show sound is on
- Button stays visible so users can toggle sound on/off

## Technical Changes

### File: `src/components/retargeting/RetargetingAutoplayVideo.tsx`

**Change 1: Update state variables**

Replace `hasInteracted` with `isMuted` to track sound state:

```text
const [isPlaying, setIsPlaying] = useState(true);
const [isMuted, setIsMuted] = useState(true);  // NEW - tracks mute state
```

**Change 2: Update imports**

Replace Play/Pause icons with Volume icons:

```text
import { Volume2, VolumeX, Check, MessageCircle } from "lucide-react";
```

**Change 3: Create toggle sound function**

Replace `togglePlayPause` with `toggleSound`:

```text
const toggleSound = () => {
  const video = videoRef.current;
  if (!video) return;

  if (video.muted) {
    video.muted = false;
    setIsMuted(false);
  } else {
    video.muted = true;
    setIsMuted(true);
  }
};
```

**Change 4: Replace the play button overlay with a sound button**

Remove the center play button and add a corner sound button:

```text
{/* Sound Toggle Button - Bottom Right Corner */}
<button
  onClick={toggleSound}
  className="absolute bottom-4 right-4 z-10 flex items-center gap-2 
    bg-white/90 backdrop-blur-md rounded-full 
    px-4 py-2.5 shadow-lg
    hover:bg-white hover:scale-105
    transition-all duration-300 ease-out
    border border-white/50 group"
>
  {isMuted ? (
    <>
      <VolumeX className="w-5 h-5 text-landing-navy" />
      <span className="text-sm font-medium text-landing-navy">
        {t.videoUnmuteButton || "Click for sound"}
      </span>
    </>
  ) : (
    <>
      <Volume2 className="w-5 h-5 text-landing-gold" />
      <span className="text-sm font-medium text-landing-navy">
        {t.videoMuteButton || "Sound on"}
      </span>
    </>
  )}
</button>
```

### File: `src/lib/retargetingTranslations.ts`

**Add new translation keys for all 10 languages:**

| Language | `videoUnmuteButton` | `videoMuteButton` |
|----------|---------------------|-------------------|
| en | Click for sound | Sound on |
| nl | Klik voor geluid | Geluid aan |
| de | Klicken für Ton | Ton an |
| fr | Cliquez pour le son | Son activé |
| pl | Kliknij, aby usłyszeć | Dźwięk włączony |
| sv | Klicka för ljud | Ljud på |
| da | Klik for lyd | Lyd til |
| hu | Kattints a hangért | Hang be |
| fi | Klikkaa ääntä varten | Ääni päällä |
| no | Klikk for lyd | Lyd på |

## Visual Design

| Element | Description |
|---------|-------------|
| **Position** | Bottom-right corner of video (not center) |
| **Style** | Pill-shaped button with frosted glass effect |
| **Icon** | VolumeX when muted, Volume2 when unmuted |
| **Text** | Localized "Click for sound" / "Sound on" |
| **Interaction** | Hover scale effect, smooth transitions |

## Button States

```text
MUTED STATE (default):
┌─────────────────────────┐
│  🔇  Click for sound    │  ← Invites user to enable audio
└─────────────────────────┘

UNMUTED STATE (after click):
┌─────────────────────────┐
│  🔊  Sound on           │  ← Confirms audio is playing
└─────────────────────────┘
```

## Files Modified

| File | Changes |
|------|---------|
| `src/components/retargeting/RetargetingAutoplayVideo.tsx` | Replace play button with sound toggle button |
| `src/lib/retargetingTranslations.ts` | Add `videoUnmuteButton` and `videoMuteButton` translations for all 10 languages |

## Expected Result

- Video autoplays silently as before
- A clear "Click for sound" button appears in the bottom-right corner
- Clicking enables audio immediately
- Button updates to show "Sound on" when audio is enabled
- Users can toggle sound on/off anytime
- Works across all 10 language versions with localized text
