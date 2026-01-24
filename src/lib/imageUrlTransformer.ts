/**
 * Image URL utility for Resales Online CDN
 * 
 * Note: Resales Online CDN only provides w400 images.
 * This function passes through URLs unchanged.
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  
  // Return original URL - CDN only supports w400
  return url;
}
