import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Supabase setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://www.delsolprimehomes.com';

// All 10 supported languages
const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

// Language code mapping for hreflang attributes
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

// Location brochure cities (not language-prefixed)
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
  hreflang_group_id: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface LocationPageData {
  city_slug: string;
  topic_slug: string;
  city_name: string;
  language: string;
  intent_type: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
  date_published: string | null;
}

interface ComparisonPageData {
  slug: string;
  language: string;
  option_a: string;
  option_b: string;
  niche: string | null;
  hreflang_group_id: string | null;
  updated_at: string | null;
  date_published: string | null;
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

// Generate master sitemap index pointing DIRECTLY to URL-containing sitemaps (flat structure)
// Google does not allow nested sitemap indexes (index pointing to another index)
function generateMasterSitemapIndex(
  languageContentTypes: Map<string, { type: string; lastmod: string }[]>,
  lastmod: string
): string {
  const entries: string[] = [];
  
  // List all individual content sitemaps directly (no intermediate indexes)
  languageContentTypes.forEach((contentTypes, lang) => {
    contentTypes.forEach(ct => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/${ct.type}.xml</loc>
    <lastmod>${ct.lastmod}</lastmod>
  </sitemap>`);
    });
  });
  
  // Add static sitemaps (glossary, brochures) that aren't language-prefixed
  entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/glossary.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);
  entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/brochures.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`;
}

// Generate per-language sitemap index
function generateLanguageSitemapIndex(
  lang: string, 
  contentTypes: { type: string; count: number; lastmod: string }[]
): string {
  const entries = contentTypes
    .filter(ct => ct.count > 0)
    .map(ct => `  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/${ct.type}.xml</loc>
    <lastmod>${ct.lastmod}</lastmod>
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

// Generate language-specific blog sitemap with /:lang/ prefixed URLs
function generateLanguageBlogSitemap(
  articles: ArticleData[],
  lang: string,
  clusterMap: Map<string, ArticleData[]>,
  hreflangEnabled: boolean
): string {
  if (articles.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  // Blog index for this language
  const blogIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/blog" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/blog" />` : '';

  const articleUrls = articles.map((article) => {
    const lastmod = article.date_modified || article.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/blog/${article.slug}`;
    
    let hreflangLinks = '';
    
    if (hreflangEnabled) {
      const currentLangCode = langToHreflang[article.language] || article.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      
      // Add cluster siblings as alternate language versions
      const siblings = article.cluster_id ? clusterMap.get(article.cluster_id) : null;
      if (siblings && siblings.length > 1) {
        siblings.forEach((sibling) => {
          if (sibling.slug && sibling.language !== article.language) {
            const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
            hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/blog/${sibling.slug}" />`;
          }
        });
      }
      
      // x-default points to cluster primary (English preferred)
      const primaryArticle = siblings?.find((s) => s.is_primary) || siblings?.find((s) => s.language === 'en');
      const xDefaultUrl = primaryArticle 
        ? `${BASE_URL}/${primaryArticle.language}/blog/${primaryArticle.slug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Blog Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/blog</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${blogIndexHreflang}
  </url>
  
  <!-- Blog Articles in ${lang.toUpperCase()} (${articles.length} total) -->
${articleUrls}
  
</urlset>`;
}

// Generate language-specific Q&A sitemap
function generateLanguageQASitemap(
  qaPages: QAPageData[],
  lang: string,
  allQAPages: QAPageData[],
  hreflangEnabled: boolean
): string {
  if (qaPages.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  // Build hreflang group map
  const groupMap = new Map<string, QAPageData[]>();
  allQAPages.forEach((qa) => {
    if (qa.hreflang_group_id) {
      const existing = groupMap.get(qa.hreflang_group_id) || [];
      existing.push(qa);
      groupMap.set(qa.hreflang_group_id, existing);
    }
  });

  const qaIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/qa" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/qa" />` : '';

  const qaUrls = qaPages.map((qa) => {
    const lastmod = qa.updated_at || qa.created_at || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/qa/${qa.slug}`;
    
    let hreflangLinks = '';
    if (hreflangEnabled) {
      const currentLangCode = langToHreflang[qa.language] || qa.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      
      // Add siblings from hreflang group
      const siblings = qa.hreflang_group_id ? groupMap.get(qa.hreflang_group_id) : null;
      if (siblings && siblings.length > 1) {
        siblings.forEach((sibling) => {
          if (sibling.slug && sibling.language !== qa.language) {
            const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
            hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/qa/${sibling.slug}" />`;
          }
        });
      }
      
      // x-default to English version or current
      const englishVersion = siblings?.find((s) => s.language === 'en');
      const xDefaultUrl = englishVersion 
        ? `${BASE_URL}/en/qa/${englishVersion.slug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Q&A Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/qa</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>${qaIndexHreflang}
  </url>
  
  <!-- Q&A Pages in ${lang.toUpperCase()} (${qaPages.length} total) -->
${qaUrls}
  
</urlset>`;
}

// Generate language-specific location pages sitemap
function generateLanguageLocationsSitemap(
  locationPages: LocationPageData[],
  lang: string,
  allLocationPages: LocationPageData[],
  hreflangEnabled: boolean
): string {
  if (locationPages.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  // Build hreflang group map
  const groupMap = new Map<string, LocationPageData[]>();
  allLocationPages.forEach((page) => {
    if (page.hreflang_group_id) {
      const existing = groupMap.get(page.hreflang_group_id) || [];
      existing.push(page);
      groupMap.set(page.hreflang_group_id, existing);
    }
  });

  const locIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/locations" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/locations" />` : '';

  const pageUrls = locationPages.map((page) => {
    const lastmod = page.updated_at || page.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/locations/${page.city_slug}/${page.topic_slug}`;
    
    let hreflangLinks = '';
    
    if (hreflangEnabled) {
      const currentLangCode = langToHreflang[page.language] || page.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      
      // Add siblings from hreflang group
      const siblings = page.hreflang_group_id ? groupMap.get(page.hreflang_group_id) : null;
      if (siblings && siblings.length > 1) {
        siblings.forEach((sibling) => {
          if (sibling.language !== page.language) {
            const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
            hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/locations/${sibling.city_slug}/${sibling.topic_slug}" />`;
          }
        });
      }
      
      // x-default to English version or current
      const englishVersion = siblings?.find((s) => s.language === 'en');
      const xDefaultUrl = englishVersion 
        ? `${BASE_URL}/en/locations/${englishVersion.city_slug}/${englishVersion.topic_slug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Location Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/locations</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${locIndexHreflang}
  </url>
  
  <!-- Location Pages in ${lang.toUpperCase()} (${locationPages.length} total) -->
${pageUrls}
  
</urlset>`;
}

// Generate language-specific comparison pages sitemap
function generateLanguageComparisonSitemap(
  comparisonPages: ComparisonPageData[],
  lang: string,
  allComparisonPages: ComparisonPageData[],
  hreflangEnabled: boolean
): string {
  if (comparisonPages.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  // Build hreflang group map
  const groupMap = new Map<string, ComparisonPageData[]>();
  allComparisonPages.forEach((page) => {
    if (page.hreflang_group_id) {
      const existing = groupMap.get(page.hreflang_group_id) || [];
      existing.push(page);
      groupMap.set(page.hreflang_group_id, existing);
    }
  });

  const compareIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/compare" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/compare" />` : '';

  const pageUrls = comparisonPages.map((page) => {
    const lastmod = page.updated_at || page.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/compare/${page.slug}`;
    
    let hreflangLinks = '';
    
    if (hreflangEnabled) {
      const currentLangCode = langToHreflang[page.language] || page.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      
      // Add siblings from hreflang group
      const siblings = page.hreflang_group_id ? groupMap.get(page.hreflang_group_id) : null;
      if (siblings && siblings.length > 1) {
        siblings.forEach((sibling) => {
          if (sibling.language !== page.language) {
            const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
            hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/compare/${sibling.slug}" />`;
          }
        });
      }
      
      // x-default to English version or current
      const englishVersion = siblings?.find((s) => s.language === 'en');
      const xDefaultUrl = englishVersion 
        ? `${BASE_URL}/en/compare/${englishVersion.slug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(hreflangEnabled)}
  
  <!-- Comparison Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/compare</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${compareIndexHreflang}
  </url>
  
  <!-- Comparison Pages in ${lang.toUpperCase()} (${comparisonPages.length} total) -->
${pageUrls}
  
</urlset>`;
}

// Generate glossary sitemap (non-language-prefixed)
function generateGlossarySitemap(terms: GlossaryTerm[]): string {
  const glossaryUrl = `  <url>
    <loc>${BASE_URL}/glossary</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

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

// Generate brochures sitemap (non-language-prefixed)
function generateBrochuresSitemap(): string {
  const homepageUrl = `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  const cityUrls = LOCATION_CITIES.map((city) => {
    return `  <url>
    <loc>${BASE_URL}/brochure/${city}</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`;
  }).join('\n');

  const guideUrl = `  <url>
    <loc>${BASE_URL}/guide</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

  const aboutUrl = `  <url>
    <loc>${BASE_URL}/about</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

  return `${xmlHeader(false)}
  
  <!-- Homepage -->
${homepageUrl}
  
  <!-- Buyer's Guide -->
${guideUrl}
  
  <!-- About Page -->
${aboutUrl}
  
  <!-- City Brochures (${LOCATION_CITIES.length} locations) -->
${cityUrls}
  
</urlset>`;
}

// Load glossary terms from JSON
function loadGlossaryTerms(): GlossaryTerm[] {
  try {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const glossaryPath = join(process.cwd(), 'public', 'glossary.json');
    const content = readFileSync(glossaryPath, 'utf-8');
    return JSON.parse(content) as GlossaryTerm[];
  } catch {
    console.log('⚠️ Could not load glossary.json, using empty array');
    return [];
  }
}

// Ensure directory exists
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Group content by language
function groupByLanguage<T extends { language: string }>(items: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const existing = grouped.get(item.language) || [];
    existing.push(item);
    grouped.set(item.language, existing);
  });
  return grouped;
}

// Main sitemap generation function
export async function generateSitemap(outputDir?: string): Promise<void> {
  console.log('\n🗺️ Starting hierarchical multi-sitemap generation...');
  console.log('📁 Structure: /sitemaps/{lang}/{content-type}.xml\n');
  
  const outputPath = outputDir || join(process.cwd(), 'public');
  const sitemapsPath = join(outputPath, 'sitemaps');
  
  // Check feature flag
  const hreflangEnabled = await checkFeatureFlag('enhanced_hreflang');
  console.log(`🏳️ Hreflang: ${hreflangEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  // Fetch all published content
  console.log('\n📥 Fetching content from database...');
  
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, language, cluster_id, is_primary, date_modified, date_published')
    .eq('status', 'published')
    .order('date_modified', { ascending: false });
  
  if (error) {
    console.error('❌ Failed to fetch articles:', error);
    throw error;
  }
  console.log(`   📝 Blog articles: ${articles?.length || 0}`);
  
  const { data: qaPages, error: qaError } = await supabase
    .from('qa_pages')
    .select('slug, language, hreflang_group_id, updated_at, created_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  
  if (qaError) console.error('❌ Failed to fetch QA pages:', qaError);
  console.log(`   🔍 Q&A pages: ${qaPages?.length || 0}`);
  
  const { data: locationPages, error: locError } = await supabase
    .from('location_pages')
    .select('city_slug, topic_slug, city_name, language, intent_type, hreflang_group_id, updated_at, date_published')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  
  if (locError) console.error('❌ Failed to fetch location pages:', locError);
  console.log(`   📍 Location pages: ${locationPages?.length || 0}`);
  
  const { data: comparisonPages, error: compError } = await supabase
    .from('comparison_pages')
    .select('slug, language, option_a, option_b, niche, hreflang_group_id, updated_at, date_published')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  
  if (compError) console.error('❌ Failed to fetch comparison pages:', compError);
  console.log(`   ⚖️ Comparison pages: ${comparisonPages?.length || 0}`);
  
  const glossaryTerms = loadGlossaryTerms();
  console.log(`   📖 Glossary terms: ${glossaryTerms.length}`);
  
  // Build cluster map for blog hreflang
  const clusterMap = new Map<string, ArticleData[]>();
  (articles || []).forEach((article: ArticleData) => {
    if (article.cluster_id) {
      const existing = clusterMap.get(article.cluster_id) || [];
      existing.push(article);
      clusterMap.set(article.cluster_id, existing);
    }
  });
  
  // Group content by language
  const articlesByLang = groupByLanguage(articles || []);
  const qaByLang = groupByLanguage(qaPages || []);
  const locationsByLang = groupByLanguage(locationPages || []);
  const comparisonsByLang = groupByLanguage(comparisonPages || []);
  
  // Create directory structure
  console.log('\n📁 Creating directory structure...');
  ensureDir(sitemapsPath);
  
  const languagesWithContent: string[] = [];
  const languageContentTypes = new Map<string, { type: string; lastmod: string }[]>();
  let totalUrls = 0;
  
  // Generate per-language sitemaps
  console.log('\n🔨 Generating language-specific sitemaps...');
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const langArticles = articlesByLang.get(lang) || [];
    const langQA = qaByLang.get(lang) || [];
    const langLocations = locationsByLang.get(lang) || [];
    const langComparisons = comparisonsByLang.get(lang) || [];
    
    const totalContent = langArticles.length + langQA.length + langLocations.length + langComparisons.length;
    
    if (totalContent === 0) {
      console.log(`   ⏭️ ${lang.toUpperCase()}: No content, skipping`);
      continue;
    }
    
    languagesWithContent.push(lang);
    const langPath = join(sitemapsPath, lang);
    ensureDir(langPath);
    
    console.log(`   📝 ${lang.toUpperCase()}: ${langArticles.length} blog, ${langQA.length} qa, ${langLocations.length} loc, ${langComparisons.length} comp`);
    
    const contentTypes: { type: string; count: number; lastmod: string }[] = [];
    
    // Blog sitemap
    if (langArticles.length > 0) {
      const blogSitemap = generateLanguageBlogSitemap(langArticles, lang, clusterMap, hreflangEnabled);
      writeFileSync(join(langPath, 'blog.xml'), blogSitemap, 'utf-8');
      const lastmod = langArticles[0]?.date_modified 
        ? new Date(langArticles[0].date_modified).toISOString().split('T')[0]
        : getToday();
      contentTypes.push({ type: 'blog', count: langArticles.length + 1, lastmod });
      totalUrls += langArticles.length + 1;
    }
    
    // Q&A sitemap
    if (langQA.length > 0) {
      const qaSitemap = generateLanguageQASitemap(langQA, lang, qaPages || [], hreflangEnabled);
      writeFileSync(join(langPath, 'qa.xml'), qaSitemap, 'utf-8');
      const lastmod = langQA[0]?.updated_at 
        ? new Date(langQA[0].updated_at).toISOString().split('T')[0]
        : getToday();
      contentTypes.push({ type: 'qa', count: langQA.length + 1, lastmod });
      totalUrls += langQA.length + 1;
    }
    
    // Locations sitemap
    if (langLocations.length > 0) {
      const locSitemap = generateLanguageLocationsSitemap(langLocations, lang, locationPages || [], hreflangEnabled);
      writeFileSync(join(langPath, 'locations.xml'), locSitemap, 'utf-8');
      const lastmod = langLocations[0]?.updated_at 
        ? new Date(langLocations[0].updated_at).toISOString().split('T')[0]
        : getToday();
      contentTypes.push({ type: 'locations', count: langLocations.length + 1, lastmod });
      totalUrls += langLocations.length + 1;
    }
    
    // Comparisons sitemap
    if (langComparisons.length > 0) {
      const compSitemap = generateLanguageComparisonSitemap(langComparisons, lang, comparisonPages || [], hreflangEnabled);
      writeFileSync(join(langPath, 'comparisons.xml'), compSitemap, 'utf-8');
      const lastmod = langComparisons[0]?.updated_at 
        ? new Date(langComparisons[0].updated_at).toISOString().split('T')[0]
        : getToday();
      contentTypes.push({ type: 'comparisons', count: langComparisons.length + 1, lastmod });
      totalUrls += langComparisons.length + 1;
    }
    
    // Store content types for master index (flat structure)
    if (contentTypes.length > 0) {
      languageContentTypes.set(lang, contentTypes.map(ct => ({ type: ct.type, lastmod: ct.lastmod })));
      
      // Also generate language index for internal reference (not linked from master)
      const langIndex = generateLanguageSitemapIndex(lang, contentTypes);
      writeFileSync(join(langPath, 'index.xml'), langIndex, 'utf-8');
    }
  }
  
  // Generate static sitemaps
  console.log('\n🔨 Generating static sitemaps...');
  
  const glossarySitemap = generateGlossarySitemap(glossaryTerms);
  writeFileSync(join(sitemapsPath, 'glossary.xml'), glossarySitemap, 'utf-8');
  console.log(`   📖 glossary.xml (${glossaryTerms.length + 1} URLs)`);
  totalUrls += glossaryTerms.length + 1;
  
  const brochuresSitemap = generateBrochuresSitemap();
  writeFileSync(join(sitemapsPath, 'brochures.xml'), brochuresSitemap, 'utf-8');
  console.log(`   🏠 brochures.xml (${LOCATION_CITIES.length + 3} URLs)`);
  totalUrls += LOCATION_CITIES.length + 3;
  
  // Generate master sitemap index (FLAT structure - directly lists all URL sitemaps)
  console.log('\n🔨 Generating master sitemap index (flat structure)...');
  const masterIndex = generateMasterSitemapIndex(languageContentTypes, getToday());
  writeFileSync(join(outputPath, 'sitemap-index.xml'), masterIndex, 'utf-8');
  
  // Count total sitemaps in master index
  const totalSitemapsInIndex = Array.from(languageContentTypes.values()).reduce((sum, ct) => sum + ct.length, 0) + 2;
  console.log(`   📄 Master index references ${totalSitemapsInIndex} sitemaps directly (no nested indexes)`);
  
  // Legacy sitemap.xml alias
  writeFileSync(join(outputPath, 'sitemap.xml'), masterIndex, 'utf-8');
  
  // Summary
  console.log(`\n✅ Hierarchical sitemap generation complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   • Master index: sitemap-index.xml`);
  console.log(`   • Languages with content: ${languagesWithContent.length} (${languagesWithContent.join(', ')})`);
  console.log(`   • Total sitemap files: ${languagesWithContent.length * 4 + 2 + languagesWithContent.length + 2}`);
  console.log(`   • Total URLs: ${totalUrls}`);
  console.log(`\n📁 Structure:`);
  console.log(`   /sitemap-index.xml`);
  languagesWithContent.forEach(lang => {
    console.log(`   /sitemaps/${lang}/index.xml`);
    console.log(`     ├── blog.xml`);
    console.log(`     ├── qa.xml`);
    console.log(`     ├── locations.xml`);
    console.log(`     └── comparisons.xml`);
  });
  console.log(`   /sitemaps/glossary.xml`);
  console.log(`   /sitemaps/brochures.xml`);
}

// Run if called directly
generateSitemap().catch(console.error);
