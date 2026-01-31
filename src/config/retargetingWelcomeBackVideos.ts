import retargetingVideoThumbnail from "@/assets/retargeting-video-thumbnail.jpg";

/**
 * Video thumbnail for retargeting pages - beautiful Costa del Sol luxury view
 */
export const RETARGETING_VIDEO_THUMBNAIL = retargetingVideoThumbnail;

/**
 * Language-specific welcome-back video URLs for the retargeting hero section.
 * These videos play in a modal when users click "Watch Video" on /{lang}/welcome-back pages.
 */
export const RETARGETING_WELCOME_BACK_VIDEOS: Record<string, string> = {
  en: 'https://storage.googleapis.com/msgsndr/281Nzx90nVL8424QY4Af/media/697548eb59a77b4486da126b.mp4',
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

/**
 * Get the welcome-back video URL for a specific language.
 * @param language - Language code (e.g., 'nl', 'de', 'fr')
 * @returns Video URL or null if no video exists for the language
 */
export const getWelcomeBackVideoUrl = (language: string): string | null => {
  const url = RETARGETING_WELCOME_BACK_VIDEOS[language];
  return url || null;
};
