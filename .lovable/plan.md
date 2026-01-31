

# Fix Sound Button to Not Cover Video Subtitles

## Problem

When sound is **on**, the "Sound on" button is the same large size as the "Click for sound" button, covering the video subtitles (typically centered at the bottom of the video).

**Current behavior (both states):**
- Large pill button: `px-4 py-2.5` with icon + text
- Position: `bottom-4 right-4` (bottom-right corner)
- This covers subtitles when sound is on

## Solution

Make the button **state-aware** with two distinct appearances:

| State | Size | Position | Content |
|-------|------|----------|---------|
| **Sound OFF** (muted) | Large pill (`px-4 py-2.5`) | Bottom-right | Icon + "Click for sound" text |
| **Sound ON** (unmuted) | Small circle (`w-8 h-8`) | Bottom-left | Icon only (no text) |

This ensures:
- The CTA is prominent when users need to enable sound
- The button is minimal and out of the way when sound is on
- Subtitles remain fully visible

---

## Technical Implementation

### File: `src/components/retargeting/RetargetingAutoplayVideo.tsx`

**Change:** Update the button at lines 102-126 to use conditional styling based on `isMuted` state.

**Before (lines 102-126):**
```tsx
<button
  onClick={toggleSound}
  className="absolute bottom-4 right-4 z-10 flex items-center gap-2 
    bg-white/90 backdrop-blur-md rounded-full 
    px-4 py-2.5 shadow-lg
    hover:bg-white hover:scale-105
    transition-all duration-300 ease-out
    border border-white/50"
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

**After:**
```tsx
<button
  onClick={toggleSound}
  className={`absolute z-10 flex items-center justify-center
    bg-white/90 backdrop-blur-md rounded-full shadow-lg
    hover:bg-white hover:scale-105
    transition-all duration-300 ease-out
    border border-white/50
    ${isMuted 
      ? 'bottom-4 right-4 px-4 py-2.5 gap-2'  // Large pill, bottom-right
      : 'bottom-4 left-4 w-8 h-8'              // Small circle, bottom-left
    }`}
  aria-label={isMuted ? "Enable sound" : "Mute sound"}
>
  {isMuted ? (
    <>
      <VolumeX className="w-5 h-5 text-landing-navy" />
      <span className="text-sm font-medium text-landing-navy">
        {t.videoUnmuteButton || "Click for sound"}
      </span>
    </>
  ) : (
    <Volume2 className="w-4 h-4 text-landing-gold" />
  )}
</button>
```

---

## Key Changes

1. **Conditional positioning**: `right-4` when muted → `left-4` when unmuted
2. **Conditional size**: `px-4 py-2.5` pill → `w-8 h-8` circle
3. **No text when unmuted**: Removes the "Sound on" label entirely
4. **Smaller icon when unmuted**: `w-5 h-5` → `w-4 h-4`
5. **Added `aria-label`**: Maintains accessibility when text is hidden
6. **Added `justify-center`**: Centers the icon in the small circle state

---

## Visual Result

| Before | After |
|--------|-------|
| Sound OFF: Large pill, bottom-right ✓ | Same ✓ |
| Sound ON: Large pill, bottom-right ✗ | Small icon, bottom-left ✓ |

The subtitles will remain fully visible when sound is enabled, as the small mute button is now in the bottom-left corner, away from typical subtitle placement.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/retargeting/RetargetingAutoplayVideo.tsx` | Update button with conditional styling based on `isMuted` state |

