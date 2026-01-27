/**
 * Image URL utility for Resales Online CDN
 * 
 * Transforms w400 URLs to higher resolutions based on display context.
 * CDN supports: w400, w800, w1200
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  
  // Define resolution mapping
  const resolutionMap: Record<typeof size, string> = {
    thumbnail: 'w400',
    card: 'w800',
    hero: 'w1200',
    lightbox: 'w1200',
  };
  
  const targetResolution = resolutionMap[size];
  
  // Transform w400 to target resolution in URL path
  // Pattern: .../w400/... → .../w800/... or .../w1200/...
  if (url.includes('/w400/')) {
    return url.replace('/w400/', `/${targetResolution}/`);
  }
  
  // Also handle w800 if upgrading to w1200
  if (url.includes('/w800/') && (size === 'hero' || size === 'lightbox')) {
    return url.replace('/w800/', '/w1200/');
  }
  
  // Return original URL if no transformation needed
  return url;
}
