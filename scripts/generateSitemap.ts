import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Supabase setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://www.delsolprimehomes.com';

// Language code mapping
const langToHreflang: Record<string, string> = {
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

// Location brochure cities
const LOCATION_CITIES = [
  'marbella', 'estepona', 'mijas', 'fuengirola', 'benalmadena',
  'torremolinos', 'malaga', 'sotogrande', 'manilva', 'casares'
];

interface ArticleData {
  slug: string;
  language: string;
  cluster_id: string | null;
  is_primary: boolean;
  date_modified: string | null;
  date_published: string | null;
}

interface QAPageData {
  slug: string;
  language: string;
  updated_at: string | null;
  created_at: string | null;
}

interface GlossaryTerm {
  term: string;
  definition: string;
}

// Check feature flag
async function checkFeatureFlag(flagName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', `feature_${flagName}`)
      .single();
    
    if (error) return false;
    return data?.setting_value === 'true';
  } catch {
    return false;
  }
}

// Get current date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// Generate XML header with optional hreflang namespace
function xmlHeader(includeHreflang: boolean): string {
  const ns = includeHreflang 
    ? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"`
    : `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>`;
}

// Generate sitemap index
function generateSitemapIndex(lastmods: Record<string, string>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-blog.xml</loc>
    <lastmod>${lastmods.blog}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-qa.xml</loc>
    <lastmod>${lastmods.qa}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-glossary.xml</loc>
    <lastmod>${lastmods.glossary}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-locations.xml</loc>
    <lastmod>${lastmods.locations}</lastmod>
  </sitemap>
</sitemapindex>`;
}

// Generate blog sitemap (articles + blog index)
function generateBlogSitemap(
  articles: ArticleData[], 
  clusterMap: Map<string, ArticleData[]>,
  hreflangEnabled: boolean
): string {
  const blogIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${BASE_URL}/blog" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/blog" />` : '';

  const articleUrls = articles.map((article) => {
    const lastmod = article.date_modified || article.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/blog/${article.slug}`;
    
    let hreflangLinks = '';
    
    if (hreflangEnabled) {
      const currentLangCode = langToHreflang[article.language] || article.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      
      const siblings = article.cluster_id ? clusterMap.get(article.cluster_id) : null;
      if (siblings && siblings.length > 1) {
        siblings.forEach((sibling) => {
          if (sibling.slug && sibling.language !== article.language) {
            const langCode = langToHreflang[sibling.language] || sibling.language;
            hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${langCode}" href="${BASE_URL}/blog/${sibling.slug}" />`;
          }
        });
      }
      
      const primaryArticle = siblings?.find((s) => s.is_primary);
      const xDefaultUrl = primaryArticle 
        ? `${BASE_URL}/blog/${primaryArticle.slug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Blog Index -->
  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${blogIndexHreflang}
  </url>
  
  <!-- Blog Articles (${articles.length} total) -->
${articleUrls}
  
</urlset>`;
}

// Generate Q&A sitemap
function generateQASitemap(qaPages: QAPageData[], hreflangEnabled: boolean): string {
  const qaIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${BASE_URL}/qa" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/qa" />` : '';

  const qaUrls = qaPages.map((qa) => {
    const lastmod = qa.updated_at || qa.created_at || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/qa/${qa.slug}`;
    
    let hreflangLinks = '';
    if (hreflangEnabled) {
      const currentLangCode = langToHreflang[qa.language] || qa.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${currentUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Q&A Index -->
  <url>
    <loc>${BASE_URL}/qa</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>${qaIndexHreflang}
  </url>
  
  <!-- Q&A Pages (${qaPages.length} total) -->
${qaUrls}
  
</urlset>`;
}

// Generate glossary sitemap
function generateGlossarySitemap(terms: GlossaryTerm[]): string {
  // Main glossary page
  const glossaryUrl = `  <url>
    <loc>${BASE_URL}/glossary</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

  // Individual term anchors (for better crawl coverage)
  const termUrls = terms.map((item) => {
    const termSlug = item.term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `  <url>
    <loc>${BASE_URL}/glossary#${termSlug}</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join('\n');

  return `${xmlHeader(false)}
  
  <!-- Glossary Page -->
${glossaryUrl}
  
  <!-- Glossary Terms (${terms.length} total) -->
${termUrls}
  
</urlset>`;
}

// Generate locations sitemap (homepage + city brochures)
function generateLocationsSitemap(hreflangEnabled: boolean): string {
  const homepageHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${BASE_URL}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />` : '';

  const homepageUrl = `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>${homepageHreflang}
  </url>`;

  const cityUrls = LOCATION_CITIES.map((city) => {
    return `  <url>
    <loc>${BASE_URL}/brochure/${city}</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Homepage -->
${homepageUrl}
  
  <!-- City Brochures (${LOCATION_CITIES.length} locations) -->
${cityUrls}
  
</urlset>`;
}

// Load glossary terms from JSON
function loadGlossaryTerms(): GlossaryTerm[] {
  try {
    const glossaryPath = join(process.cwd(), 'public', 'glossary.json');
    const content = readFileSync(glossaryPath, 'utf-8');
    return JSON.parse(content) as GlossaryTerm[];
  } catch {
    console.log('⚠️ Could not load glossary.json, using empty array');
    return [];
  }
}

// Main sitemap generation function
export async function generateSitemap(outputDir?: string): Promise<void> {
  console.log('\n🗺️ Starting multi-sitemap generation...');
  
  const outputPath = outputDir || join(process.cwd(), 'public');
  
  // Check feature flag
  const hreflangEnabled = await checkFeatureFlag('enhanced_hreflang');
  console.log(`🏳️ Hreflang: ${hreflangEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  // Fetch published articles
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, language, cluster_id, is_primary, date_modified, date_published')
    .eq('status', 'published')
    .order('date_modified', { ascending: false });
  
  if (error) {
    console.error('❌ Failed to fetch articles:', error);
    throw error;
  }
  
  console.log(`📝 Found ${articles?.length || 0} blog articles`);
  
  // Fetch published QA pages
  const { data: qaPages, error: qaError } = await supabase
    .from('qa_pages')
    .select('slug, language, updated_at, created_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  
  if (qaError) {
    console.error('❌ Failed to fetch QA pages:', qaError);
  }
  
  console.log(`🔍 Found ${qaPages?.length || 0} Q&A pages`);
  
  // Load glossary terms
  const glossaryTerms = loadGlossaryTerms();
  console.log(`📖 Found ${glossaryTerms.length} glossary terms`);
  
  // Build cluster map for hreflang
  const clusterMap = new Map<string, ArticleData[]>();
  (articles || []).forEach((article: ArticleData) => {
    if (article.cluster_id) {
      const existing = clusterMap.get(article.cluster_id) || [];
      existing.push(article);
      clusterMap.set(article.cluster_id, existing);
    }
  });
  
  // Get latest modification dates for index
  const blogLastmod = articles?.[0]?.date_modified 
    ? new Date(articles[0].date_modified).toISOString().split('T')[0]
    : getToday();
  const qaLastmod = qaPages?.[0]?.updated_at 
    ? new Date(qaPages[0].updated_at).toISOString().split('T')[0]
    : getToday();
  
  const lastmods = {
    blog: blogLastmod,
    qa: qaLastmod,
    glossary: getToday(),
    locations: getToday()
  };
  
  // Generate all sitemaps
  const sitemapIndex = generateSitemapIndex(lastmods);
  const blogSitemap = generateBlogSitemap(articles || [], clusterMap, hreflangEnabled);
  const qaSitemap = generateQASitemap(qaPages || [], hreflangEnabled);
  const glossarySitemap = generateGlossarySitemap(glossaryTerms);
  const locationsSitemap = generateLocationsSitemap(hreflangEnabled);
  
  // Write all files
  writeFileSync(join(outputPath, 'sitemap-index.xml'), sitemapIndex, 'utf-8');
  writeFileSync(join(outputPath, 'sitemap-blog.xml'), blogSitemap, 'utf-8');
  writeFileSync(join(outputPath, 'sitemap-qa.xml'), qaSitemap, 'utf-8');
  writeFileSync(join(outputPath, 'sitemap-glossary.xml'), glossarySitemap, 'utf-8');
  writeFileSync(join(outputPath, 'sitemap-locations.xml'), locationsSitemap, 'utf-8');
  
  // Also keep sitemap.xml as a copy of the index for legacy compatibility
  writeFileSync(join(outputPath, 'sitemap.xml'), sitemapIndex, 'utf-8');
  
  console.log(`\n✅ Multi-sitemap generation complete!`);
  console.log(`📊 Summary:`);
  console.log(`   • sitemap-index.xml (4 sitemaps)`);
  console.log(`   • sitemap-blog.xml (${(articles?.length || 0) + 1} URLs)`);
  console.log(`   • sitemap-qa.xml (${(qaPages?.length || 0) + 1} URLs)`);
  console.log(`   • sitemap-glossary.xml (${glossaryTerms.length + 1} URLs)`);
  console.log(`   • sitemap-locations.xml (${LOCATION_CITIES.length + 1} URLs)`);
  console.log(`   • sitemap.xml (legacy alias → index)`);
  
  const totalUrls = (articles?.length || 0) + (qaPages?.length || 0) + glossaryTerms.length + LOCATION_CITIES.length + 4;
  console.log(`\n📍 Total URLs across all sitemaps: ${totalUrls}`);
}

// Run if called directly
generateSitemap().catch(console.error);
