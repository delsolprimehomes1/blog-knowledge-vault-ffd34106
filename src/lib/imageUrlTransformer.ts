/**
 * Image URL utility for Resales Online CDN
 * 
 * Currently returns URLs unchanged. High-resolution upgrade 
 * should only be re-enabled after verifying CDN support.
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  return url; // Return original URL unchanged
}
