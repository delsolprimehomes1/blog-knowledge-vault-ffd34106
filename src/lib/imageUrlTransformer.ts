/**
 * Image URL utility for Resales Online CDN
 * 
 * Upgrades card images to w800 for better quality.
 * Other sizes remain at original resolution for safety.
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  // Return placeholder if no URL
  if (!url) return '/placeholder.svg';
  
  // Only transform URLs that contain /w400/
  if (!url.includes('/w400/')) {
    return url;
  }
  
  // Upgrade card images to w800 ONLY
  if (size === 'card') {
    return url.replace('/w400/', '/w800/');
  }
  
  // Keep everything else at w400 for now (safe)
  return url;
}
