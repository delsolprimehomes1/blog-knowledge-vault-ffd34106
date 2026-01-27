/**
 * Image URL utility for Resales Online CDN
 * 
 * Transforms w400 URLs to higher resolutions based on display context.
 * URL pattern: .../w400/filename.jpg → .../w1200/filename.jpg
 */
export function getHighResImageUrl(
  url: string | undefined | null, 
  size: 'thumbnail' | 'card' | 'hero' | 'lightbox' = 'hero'
): string {
  if (!url) return '/placeholder.svg';
  
  // Define resolution mapping
  const resolutionMap: Record<typeof size, string> = {
    thumbnail: 'w400',   // 400px - small thumbnails
    card: 'w800',        // 800px - property cards
    hero: 'w1200',       // 1200px - hero images
    lightbox: 'w1200',   // 1200px - full-screen gallery
  };
  
  const targetResolution = resolutionMap[size];
  
  // Transform /w400/ to target resolution
  if (url.includes('/w400/')) {
    return url.replace('/w400/', `/${targetResolution}/`);
  }
  
  // Return original URL if pattern not found
  return url;
}
