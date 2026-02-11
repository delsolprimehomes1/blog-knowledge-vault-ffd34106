

# Retargeting Video: Thumbnail + Play Button (No Autoplay)

## What Changes

**File:** `src/components/retargeting/RetargetingAutoplayVideo.tsx`

Replace the current autoplay-muted behavior with a click-to-play pattern matching the landing page's `ExplainerVideo` component.

### Current Behavior
- Video auto-plays muted on page load
- Shows a "Click for sound" overlay button
- Native controls visible immediately

### New Behavior
- Video does NOT auto-play
- Shows the thumbnail image (`RETARGETING_VIDEO_THUMBNAIL`) with a centered gold play button
- User clicks play button to start the video with sound and native controls (including timestamp/progress bar)
- Close button appears to stop video and return to thumbnail
- Works on all 11 retargeting language pages

## Technical Details

### Remove
- `useEffect` autoplay logic (lines 20-36)
- `isMuted` state and `toggleSound` function (lines 16, 38-53)
- The custom sound toggle button overlay (lines 102-126)
- `loop` attribute on the video element

### Change
- `isPlaying` initial state from `true` to `false`
- When `isPlaying === false`: render the thumbnail image with a centered gold play button (matching the landing page style)
- When `isPlaying === true`: render the `<video>` element with `controls`, `autoPlay` (plays on click), and a close/X button in the top-right corner
- Native browser controls handle the timestamp/progress bar automatically

### Keep
- Section header, bullet points, and CTA button (unchanged)
- `RETARGETING_VIDEO_THUMBNAIL` as the poster/thumbnail image
- Language-specific video URLs via `getWelcomeBackVideoUrl(language)`
- All motion animations and styling

## Visual Result

**Before click:** Thumbnail image with a gold circular play button centered on it (matching the landing page aesthetic).

**After click:** Full video player with native controls showing play/pause, progress bar with elapsed/remaining time, volume, and fullscreen. A small close button in the top-right corner lets users return to the thumbnail.

