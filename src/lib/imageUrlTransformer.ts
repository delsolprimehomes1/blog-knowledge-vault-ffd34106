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
  
  const sizeMap = {
    thumbnail: 'w400',   // 400px - thumbnails, fast loading
    card: 'w800',        // 800px - property cards
    hero: 'w1200',       // 1200px - hero images
    lightbox: 'w1920',   // 1920px - full screen lightbox
  };
  
  const targetSize = sizeMap[size];
  
  // Replace /wXXX/ pattern with target size
  // Matches patterns like /w400/, /w800/, etc.
  if (url.includes('/w')) {
    return url.replace(/\/w\d+\//, `/${targetSize}/`);
  }
  
  // If no size pattern found, return original URL
  return url;
}
