/**
 * Image URL utility for Resales Online CDN
 * 
 * Note: Currently passes through URLs unchanged while we investigate
 * the proper CDN URL structure for resolution upgrades.
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  return url; // Return unchanged for now
}
