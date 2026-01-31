
# Add English Video & Restart on Sound Enable

## Overview

Two changes are needed:
1. Add the English video URL to the configuration file
2. Update the video component to restart from the beginning when users click the sound button

## Technical Changes

### File 1: `src/config/retargetingWelcomeBackVideos.ts`

**Update the English video URL (Line 13)**

| Current | New |
|---------|-----|
| `en: ''` | `en: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548eb59a77b4486da126b.mp4'` |

### File 2: `src/components/retargeting/RetargetingAutoplayVideo.tsx`

**Update the `toggleSound` function (Lines 38-49)**

Add logic to restart the video from the beginning when enabling sound:

```text
const toggleSound = () => {
  const video = videoRef.current;
  if (!video) return;

  if (video.muted) {
    // Unmuting - restart video from beginning
    video.currentTime = 0;
    video.muted = false;
    setIsMuted(false);
    video.play();
  } else {
    // Muting - just mute, don't restart
    video.muted = true;
    setIsMuted(true);
  }
};
```

**Key behavior:**
- When user clicks "Click for sound" (unmuting): Video restarts from 0:00 and plays with sound
- When user clicks "Sound on" (muting): Video continues playing but mutes (no restart)

## Files Modified

| File | Change |
|------|--------|
| `src/config/retargetingWelcomeBackVideos.ts` | Add English video URL |
| `src/components/retargeting/RetargetingAutoplayVideo.tsx` | Restart video from beginning when enabling sound |

## Expected Result

- The `/en/welcome-back` page will now show and autoplay the English video
- When users click "Click for sound" on any retargeting page, the video restarts from the beginning with audio enabled
- This gives users the full experience from the start with sound
