/**
 * Transforms Resales Online CDN image URLs to higher resolution
 * The API returns w400 thumbnails by default - this upgrades to higher quality
 * 
 * Supported sizes: w400, w800, w1200, w1600, w1920
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  
  // CDN only supports w400 - return original URL
  // Browser handles scaling via CSS object-cover
  return url;
}
