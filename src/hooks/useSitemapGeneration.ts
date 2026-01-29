// Sitemap generation utilities for properties and static pages

export const BASE_URL = 'https://www.delsolprimehomes.com';

export const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

export const langToHreflang: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  nl: 'nl-NL',
  fr: 'fr-FR',
  pl: 'pl-PL',
  sv: 'sv-SE',
  da: 'da-DK',
  hu: 'hu-HU',
  fi: 'fi-FI',
  no: 'nb-NO'
};

// Static pages that exist for all languages
export const STATIC_PAGES = [
  { path: '', priority: 1.0, changefreq: 'daily' },           // homepage
  { path: 'about-us', priority: 0.8, changefreq: 'monthly' },
  { path: 'contact', priority: 0.7, changefreq: 'monthly' },
  { path: 'buyers-guide', priority: 0.9, changefreq: 'weekly' },
  { path: 'team', priority: 0.7, changefreq: 'monthly' },
  { path: 'glossary', priority: 0.7, changefreq: 'monthly' },
  { path: 'properties', priority: 0.9, changefreq: 'daily' },
];

export interface PropertyData {
  internal_ref: string;
  internal_name: string;
  updated_at: string | null;
  images: Array<{ url: string; alt?: string }> | null;
  is_active: boolean;
}

export interface NewBuildData {
  slug: string;
  name: string;
  updated_at: string | null;
  images: Array<{ url: string; alt?: string }> | null;
  status: string;
}

// Escape XML special characters
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Format date for sitemap
export function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

// Generate properties sitemap with image extensions
export function generatePropertiesSitemap(properties: PropertyData[]): string {
  const today = formatDate(null);
  
  const urls = properties.map(prop => {
    const images = (prop.images || []).slice(0, 10);
    const imageXml = images.length > 0 
      ? images.map(img => `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:title>${escapeXml(prop.internal_name || 'Property Image')}</image:title>
    </image:image>`).join('')
      : '';
    
    return `  <url>
    <loc>${BASE_URL}/properties/${escapeXml(prop.internal_ref)}</loc>
    <lastmod>${formatDate(prop.updated_at)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>${imageXml}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Properties Index -->
  <url>
    <loc>${BASE_URL}/properties</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Property Listings (${properties.length} total) -->
${urls}
  
</urlset>`;
}

// Generate static pages sitemap with hreflang for all languages
export function generateStaticPagesSitemap(): string {
  const today = formatDate(null);
  
  const urls = STATIC_PAGES.flatMap(page => {
    return SUPPORTED_LANGUAGES.map(lang => {
      const url = page.path ? `${BASE_URL}/${lang}/${page.path}` : `${BASE_URL}/${lang}`;
      
      // Generate hreflang links for all languages
      const hreflangLinks = SUPPORTED_LANGUAGES.map(l => {
        const href = page.path ? `${BASE_URL}/${l}/${page.path}` : `${BASE_URL}/${l}`;
        return `    <xhtml:link rel="alternate" hreflang="${langToHreflang[l]}" href="${href}" />`;
      }).join('\n');
      
      // x-default points to English version
      const xDefaultHref = page.path ? `${BASE_URL}/en/${page.path}` : `${BASE_URL}/en`;
      
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${hreflangLinks}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultHref}" />
  </url>`;
    });
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  
  <!-- Root Homepage -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Static Pages × ${SUPPORTED_LANGUAGES.length} Languages -->
${urls}
  
</urlset>`;
}

// Generate new-builds sitemap with image extensions
export function generateNewBuildsSitemap(newBuilds: NewBuildData[]): string {
  const today = formatDate(null);
  
  const urls = newBuilds.map(build => {
    const images = (build.images || []).slice(0, 10);
    const imageXml = images.length > 0 
      ? images.map(img => `
    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:title>${escapeXml(build.name || 'New Build Image')}</image:title>
    </image:image>`).join('')
      : '';
    
    return `  <url>
    <loc>${BASE_URL}/new-builds/${escapeXml(build.slug)}</loc>
    <lastmod>${formatDate(build.updated_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageXml}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- New Builds Index -->
  <url>
    <loc>${BASE_URL}/new-builds</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  
  <!-- New Build Projects (${newBuilds.length} total) -->
${urls}
  
</urlset>`;
}

// Calculate URL counts for each sitemap type
export interface SitemapStats {
  pages: number;
  properties: number;
  newBuilds: number;
  blog: Record<string, number>;
  qa: Record<string, number>;
  locations: Record<string, number>;
  comparisons: Record<string, number>;
  brochures: number;
  glossary: number;
  total: number;
}

export function calculateTotalUrls(stats: Partial<SitemapStats>): number {
  let total = 0;
  
  total += stats.pages || 0;
  total += stats.properties || 0;
  total += stats.newBuilds || 0;
  total += stats.brochures || 0;
  total += stats.glossary || 0;
  
  if (stats.blog) {
    Object.values(stats.blog).forEach(count => { total += count; });
  }
  if (stats.qa) {
    Object.values(stats.qa).forEach(count => { total += count; });
  }
  if (stats.locations) {
    Object.values(stats.locations).forEach(count => { total += count; });
  }
  if (stats.comparisons) {
    Object.values(stats.comparisons).forEach(count => { total += count; });
  }
  
  return total;
}
