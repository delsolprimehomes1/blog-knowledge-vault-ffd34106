import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const BASE_URL = 'https://www.delsolprimehomes.com';

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

const LOCATION_CITIES = [
  'marbella', 'estepona', 'mijas', 'fuengirola', 'benalmadena',
  'torremolinos', 'malaga', 'sotogrande', 'manilva', 'casares'
];

const GLOSSARY_TERMS = ['nie', 'nif', 'tie', 'ibi', 'itp', 'ajd', 'iva', 'plusvalia', 'golden-visa', 'escritura'];

// Static pages that exist for all languages
const STATIC_PAGES = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: 'about-us', priority: 0.8, changefreq: 'monthly' },
  { path: 'contact', priority: 0.7, changefreq: 'monthly' },
  { path: 'buyers-guide', priority: 0.9, changefreq: 'weekly' },
  { path: 'team', priority: 0.7, changefreq: 'monthly' },
  { path: 'glossary', priority: 0.7, changefreq: 'monthly' },
  { path: 'properties', priority: 0.9, changefreq: 'daily' },
];

interface PropertyData {
  internal_ref: string;
  internal_name: string;
  updated_at: string | null;
  images: any[] | null;
  is_active: boolean;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ArticleData {
  slug: string;
  language: string;
  cluster_id: string | null;
  is_primary: boolean;
  date_modified: string | null;
  date_published: string | null;
  is_redirect?: boolean | null;
  redirect_to?: string | null;
}

interface QAPageData {
  slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
  created_at: string | null;
  is_redirect?: boolean | null;
  redirect_to?: string | null;
}

interface ComparisonData {
  slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
  is_redirect?: boolean | null;
  redirect_to?: string | null;
}

interface LocationData {
  city_slug: string;
  topic_slug: string;
  city_name: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
  is_redirect?: boolean | null;
  redirect_to?: string | null;
}

// Paginated fetching to bypass Supabase 1000-row limit
async function fetchAllRows<T>(
  supabase: any,
  table: string,
  columns: string,
  filter: { column: string; value: any },
  orderBy?: { column: string; ascending: boolean }
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(columns)
      .eq(filter.column, filter.value)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching ${table} page ${page}:`, error);
      break;
    }
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      hasMore = data.length === PAGE_SIZE;
      page++;
      console.log(`   Fetched ${table} page ${page}: ${data.length} rows (total: ${allData.length})`);
    } else {
      hasMore = false;
    }
  }

  return allData;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function xmlHeader(includeHreflang: boolean): string {
  const ns = includeHreflang 
    ? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"`
    : `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${ns}>`;
}

function generateMasterSitemapIndex(
  languageContentTypes: Map<string, { type: string; lastmod: string }[]>,
  lastmod: string
): string {
  const entries: string[] = [];
  
  languageContentTypes.forEach((contentTypes, lang) => {
    contentTypes.forEach(ct => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/${ct.type}.xml</loc>
    <lastmod>${ct.lastmod}</lastmod>
  </sitemap>`);
    });
  });
  
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

// Enhanced master sitemap index that includes properties and static pages
function generateEnhancedMasterSitemapIndex(
  languageContentTypes: Map<string, { type: string; lastmod: string }[]>,
  lastmod: string,
  propertiesCount: number
): string {
  const entries: string[] = [];
  
  // Static pages (all languages with hreflang)
  entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/pages.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);
  
  // Properties with images
  if (propertiesCount > 0) {
    entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/properties.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);
  }
  
  // Language-specific content sitemaps
  languageContentTypes.forEach((contentTypes, lang) => {
    contentTypes.forEach(ct => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/${ct.type}.xml</loc>
    <lastmod>${ct.lastmod}</lastmod>
  </sitemap>`);
    });
  });
  
  // Static sitemaps
  entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/brochures.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);
  entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/glossary.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Master Sitemap Index - Del Sol Prime Homes -->
  <!-- Generated: ${new Date().toISOString()} -->
  
${entries.join('\n')}
  
</sitemapindex>`;
}

function generateLanguageBlogSitemap(
  articles: ArticleData[],
  lang: string,
  clusterMap: Map<string, ArticleData[]>
): string {
  if (articles.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  const blogIndexHreflang = `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/blog" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/blog" />`;

  const articleUrls = articles.map((article) => {
    const lastmod = article.date_modified || article.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/blog/${article.slug}`;
    
    const currentLangCode = langToHreflang[article.language] || article.language;
    let hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
    
    const siblings = article.cluster_id ? clusterMap.get(article.cluster_id) : null;
    if (siblings && siblings.length > 1) {
      siblings.forEach((sibling) => {
        if (sibling.slug && sibling.language !== article.language) {
          const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
          hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/blog/${sibling.slug}" />`;
        }
      });
    }
    
    const primaryArticle = siblings?.find((s) => s.is_primary) || siblings?.find((s) => s.language === 'en');
    const xDefaultUrl = primaryArticle 
      ? `${BASE_URL}/${primaryArticle.language}/blog/${primaryArticle.slug}`
      : currentUrl;
    hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(true)}
  
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

function generateLanguageQASitemap(
  qaPages: QAPageData[],
  lang: string,
  qaGroupMap: Map<string, QAPageData[]>
): string {
  if (qaPages.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  // QA Index hreflang
  const qaIndexHreflang = `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/qa" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/qa" />`;

  const qaUrls = qaPages.map((qa) => {
    const lastmod = qa.updated_at || qa.created_at || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/qa/${qa.slug}`;
    
    let hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${currentUrl}" />`;
    
    // Find siblings by hreflang_group_id using pre-computed map (O(1) lookup)
    if (qa.hreflang_group_id) {
      const siblings = (qaGroupMap.get(qa.hreflang_group_id) || []).filter(p => p.language !== lang);
      let englishSlug: string | null = null;
      
      siblings.forEach((sibling) => {
        const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
        hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/qa/${sibling.slug}" />`;
        if (sibling.language === 'en') {
          englishSlug = sibling.slug;
        }
      });
      
      // x-default to English version or current
      const xDefaultUrl = englishSlug 
        ? `${BASE_URL}/en/qa/${englishSlug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    } else {
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${currentUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(true)}
  
  <!-- Q&A Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/qa</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>${qaIndexHreflang}
  </url>
  
  <!-- Q&A Pages in ${lang.toUpperCase()} (${qaPages.length} total) -->
${qaUrls}
  
</urlset>`;
}

function generateLanguageComparisonSitemap(
  comparisons: ComparisonData[],
  lang: string,
  comparisonGroupMap: Map<string, ComparisonData[]>
): string {
  if (comparisons.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  const comparisonIndexHreflang = `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/compare" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/compare" />`;

  const compUrls = comparisons.map((comp) => {
    const lastmod = comp.updated_at || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/compare/${comp.slug}`;
    
    let hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${currentUrl}" />`;
    
    if (comp.hreflang_group_id) {
      const siblings = (comparisonGroupMap.get(comp.hreflang_group_id) || []).filter(c => c.language !== lang);
      let englishSlug: string | null = null;
      
      siblings.forEach((sibling) => {
        const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
        hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/compare/${sibling.slug}" />`;
        if (sibling.language === 'en') {
          englishSlug = sibling.slug;
        }
      });
      
      const xDefaultUrl = englishSlug 
        ? `${BASE_URL}/en/compare/${englishSlug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    } else {
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${currentUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(true)}
  
  <!-- Comparison Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/compare</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>${comparisonIndexHreflang}
  </url>
  
  <!-- Comparison Pages in ${lang.toUpperCase()} (${comparisons.length} total) -->
${compUrls}
  
</urlset>`;
}

function generateLanguageLocationSitemap(
  locations: LocationData[],
  lang: string,
  locationGroupMap: Map<string, LocationData[]>
): string {
  if (locations.length === 0) return '';

  const hreflangCode = langToHreflang[lang] || lang;
  
  const locationIndexHreflang = `
    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${BASE_URL}/${lang}/locations" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/locations" />`;

  const locUrls = locations.map((loc) => {
    const lastmod = loc.updated_at || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${BASE_URL}/${lang}/locations/${loc.city_slug}/${loc.topic_slug}`;
    
    let hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${currentUrl}" />`;
    
    if (loc.hreflang_group_id) {
      const siblings = (locationGroupMap.get(loc.hreflang_group_id) || []).filter(l => l.language !== lang);
      let englishCitySlug: string | null = null;
      let englishTopicSlug: string | null = null;
      
      siblings.forEach((sibling) => {
        const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
        hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/locations/${sibling.city_slug}/${sibling.topic_slug}" />`;
        if (sibling.language === 'en') {
          englishCitySlug = sibling.city_slug;
          englishTopicSlug = sibling.topic_slug;
        }
      });
      
      const xDefaultUrl = englishCitySlug && englishTopicSlug 
        ? `${BASE_URL}/en/locations/${englishCitySlug}/${englishTopicSlug}`
        : currentUrl;
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
    } else {
      hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${currentUrl}" />`;
    }
    
    return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${hreflangLinks}
  </url>`;
  }).join('\n');

  return `${xmlHeader(true)}
  
  <!-- Location Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/locations</loc>
    <lastmod>${getToday()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>${locationIndexHreflang}
  </url>
  
  <!-- Location Pages in ${lang.toUpperCase()} (${locations.length} total) -->
${locUrls}
  
</urlset>`;
}

function generateBrochuresSitemap(): string {
  const today = getToday();
  
  const homepageUrl = `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  const guideUrl = `  <url>
    <loc>${BASE_URL}/guide</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

  const aboutUrl = `  <url>
    <loc>${BASE_URL}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

  const cityUrls = LOCATION_CITIES.map((city) => {
    return `  <url>
    <loc>${BASE_URL}/brochure/${city}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`;
  }).join('\n');

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

// Generate properties sitemap with image extensions
function generatePropertiesSitemap(properties: PropertyData[]): string {
  const today = getToday();
  
  const urls = properties.map(prop => {
    const images = Array.isArray(prop.images) ? prop.images.slice(0, 10) : [];
    const imageXml = images.length > 0 
      ? images.map((img: any) => {
          const imgUrl = typeof img === 'string' ? img : (img?.url || img?.src || '');
          if (!imgUrl) return '';
          return `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(prop.internal_name || 'Property Image')}</image:title>
    </image:image>`;
        }).filter(Boolean).join('')
      : '';
    
    return `  <url>
    <loc>${BASE_URL}/properties/${escapeXml(prop.internal_ref)}</loc>
    <lastmod>${prop.updated_at ? new Date(prop.updated_at).toISOString().split('T')[0] : today}</lastmod>
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
function generateStaticPagesSitemap(): string {
  const today = getToday();
  
  const urls = STATIC_PAGES.flatMap(page => {
    return SUPPORTED_LANGUAGES.map(lang => {
      const url = page.path ? `${BASE_URL}/${lang}/${page.path}` : `${BASE_URL}/${lang}`;
      
      const hreflangLinks = SUPPORTED_LANGUAGES.map(l => {
        const href = page.path ? `${BASE_URL}/${l}/${page.path}` : `${BASE_URL}/${l}`;
        return `    <xhtml:link rel="alternate" hreflang="${langToHreflang[l]}" href="${href}" />`;
      }).join('\n');
      
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
  
  <!-- Static Pages × ${SUPPORTED_LANGUAGES.length} Languages (${STATIC_PAGES.length * SUPPORTED_LANGUAGES.length} URLs) -->
${urls}
  
</urlset>`;
}

function generateGlossarySitemap(): string {
  const today = getToday();
  
  const mainUrl = `  <url>
    <loc>${BASE_URL}/glossary</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

  const termUrls = GLOSSARY_TERMS.map((term) => {
    return `  <url>
    <loc>${BASE_URL}/glossary#${term}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join('\n');

  return `${xmlHeader(false)}
  
  <!-- Glossary Main Page -->
${mainUrl}
  
  <!-- Glossary Term Anchors -->
${termUrls}
  
</urlset>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🗺️ Regenerating sitemaps with full XML generation...');
    
    const { trigger_source, download_xml } = await req.json().catch(() => ({ 
      trigger_source: 'manual',
      download_xml: false 
    }));
    console.log(`   Trigger: ${trigger_source}, Download XML: ${download_xml}`);

    // Fetch all published content (paginated to get ALL articles beyond 1000-row limit)
    console.log('📥 Fetching blog articles with pagination...');
    const rawArticles = await fetchAllRows<ArticleData>(
      supabase,
      'blog_articles',
      'slug, language, cluster_id, is_primary, date_modified, date_published, is_redirect, redirect_to',
      { column: 'status', value: 'published' },
      { column: 'date_modified', ascending: false }
    );

    console.log('📥 Fetching Q&A pages with pagination...');
    const rawQaPages = await fetchAllRows<QAPageData>(
      supabase,
      'qa_pages',
      'slug, language, hreflang_group_id, updated_at, created_at, is_redirect, redirect_to',
      { column: 'status', value: 'published' },
      { column: 'updated_at', ascending: false }
    );

    console.log('📥 Fetching location pages with pagination...');
    const rawLocationPages = await fetchAllRows<LocationData>(
      supabase,
      'location_pages',
      'city_slug, topic_slug, city_name, language, hreflang_group_id, updated_at, is_redirect, redirect_to',
      { column: 'status', value: 'published' },
      { column: 'updated_at', ascending: false }
    );

    console.log('📥 Fetching comparison pages with pagination...');
    const rawComparisonPages = await fetchAllRows<ComparisonData>(
      supabase,
      'comparison_pages',
      'slug, language, hreflang_group_id, updated_at, is_redirect, redirect_to',
      { column: 'status', value: 'published' },
      { column: 'updated_at', ascending: false }
    );

    // Fetch gone URLs to exclude from sitemap (sync with 410 Gone system)
    console.log('📥 Fetching gone URLs to exclude...');
    const { data: goneUrlData } = await supabase
      .from('gone_urls')
      .select('url_path');
    const goneUrlPaths = new Set((goneUrlData || []).map((g: { url_path: string }) => g.url_path));
    console.log(`   🚫 Gone URLs loaded: ${goneUrlPaths.size}`);

    // Helper to check if path is in gone_urls
    const isGonePath = (path: string): boolean => goneUrlPaths.has(path);

    // Filter out redirects AND gone URLs from sitemap
    const articles = (rawArticles || []).filter(a => {
      if (a.is_redirect || a.redirect_to) return false;
      const path = `/${a.language}/blog/${a.slug}`;
      return !isGonePath(path);
    });
    const qaPages = (rawQaPages || []).filter(q => {
      if (q.is_redirect || q.redirect_to) return false;
      const path = `/${q.language}/qa/${q.slug}`;
      return !isGonePath(path);
    });
    const locationPages = (rawLocationPages || []).filter(l => {
      if (l.is_redirect || l.redirect_to) return false;
      const path = `/${l.language}/locations/${l.city_slug}/${l.topic_slug}`;
      return !isGonePath(path);
    });
    const comparisonPages = (rawComparisonPages || []).filter(c => {
      if (c.is_redirect || c.redirect_to) return false;
      const path = `/${c.language}/compare/${c.slug}`;
      return !isGonePath(path);
    });

    // Calculate exclusion stats
    const excludedRedirects = {
      blog: (rawArticles || []).filter(a => a.is_redirect || a.redirect_to).length,
      qa: (rawQaPages || []).filter(q => q.is_redirect || q.redirect_to).length,
      locations: (rawLocationPages || []).filter(l => l.is_redirect || l.redirect_to).length,
      comparisons: (rawComparisonPages || []).filter(c => c.is_redirect || c.redirect_to).length,
    };
    const excludedGone = {
      blog: (rawArticles || []).filter(a => !a.is_redirect && !a.redirect_to && isGonePath(`/${a.language}/blog/${a.slug}`)).length,
      qa: (rawQaPages || []).filter(q => !q.is_redirect && !q.redirect_to && isGonePath(`/${q.language}/qa/${q.slug}`)).length,
      locations: (rawLocationPages || []).filter(l => !l.is_redirect && !l.redirect_to && isGonePath(`/${l.language}/locations/${l.city_slug}/${l.topic_slug}`)).length,
      comparisons: (rawComparisonPages || []).filter(c => !c.is_redirect && !c.redirect_to && isGonePath(`/${c.language}/compare/${c.slug}`)).length,
    };
    const totalExcludedRedirects = excludedRedirects.blog + excludedRedirects.qa + excludedRedirects.locations + excludedRedirects.comparisons;
    const totalExcludedGone = excludedGone.blog + excludedGone.qa + excludedGone.locations + excludedGone.comparisons;

    console.log(`📊 Content counts (after filtering):`);
    console.log(`   📝 Blog: ${articles.length} (excluded ${excludedRedirects.blog} redirects, ${excludedGone.blog} gone)`);
    console.log(`   🔍 Q&A: ${qaPages.length} (excluded ${excludedRedirects.qa} redirects, ${excludedGone.qa} gone)`);
    console.log(`   📍 Locations: ${locationPages.length} (excluded ${excludedRedirects.locations} redirects, ${excludedGone.locations} gone)`);
    console.log(`   ⚖️ Comparisons: ${comparisonPages.length} (excluded ${excludedRedirects.comparisons} redirects, ${excludedGone.comparisons} gone)`);
    if (totalExcludedRedirects > 0) {
      console.log(`   🔀 Total redirects excluded: ${totalExcludedRedirects}`);
    }
    if (totalExcludedGone > 0) {
      console.log(`   🚫 Total 410 Gone excluded: ${totalExcludedGone}`);
    }

    // Build cluster map for blog articles
    const clusterMap = new Map<string, ArticleData[]>();
    (articles || []).forEach((article: ArticleData) => {
      if (article.cluster_id) {
        const existing = clusterMap.get(article.cluster_id) || [];
        existing.push(article);
        clusterMap.set(article.cluster_id, existing);
      }
    });

    // Group content by language
    const articlesByLang = new Map<string, ArticleData[]>();
    const qaByLang = new Map<string, QAPageData[]>();
    const comparisonsByLang = new Map<string, ComparisonData[]>();
    const locationsByLang = new Map<string, LocationData[]>();

    (articles || []).forEach((article: ArticleData) => {
      const existing = articlesByLang.get(article.language) || [];
      existing.push(article);
      articlesByLang.set(article.language, existing);
    });

    (qaPages || []).forEach((qa: QAPageData) => {
      const existing = qaByLang.get(qa.language) || [];
      existing.push(qa);
      qaByLang.set(qa.language, existing);
    });

    (comparisonPages || []).forEach((comp: ComparisonData) => {
      const existing = comparisonsByLang.get(comp.language) || [];
      existing.push(comp);
      comparisonsByLang.set(comp.language, existing);
    });

    (locationPages || []).forEach((loc: LocationData) => {
      const existing = locationsByLang.get(loc.language) || [];
      existing.push(loc);
      locationsByLang.set(loc.language, existing);
    });

    // Pre-compute hreflang group maps for O(1) lookups (prevents CPU timeout)
    console.log('🔗 Pre-computing hreflang group maps...');
    
    const qaGroupMap = new Map<string, QAPageData[]>();
    (qaPages || []).forEach((qa: QAPageData) => {
      if (qa.hreflang_group_id) {
        const existing = qaGroupMap.get(qa.hreflang_group_id) || [];
        existing.push(qa);
        qaGroupMap.set(qa.hreflang_group_id, existing);
      }
    });
    console.log(`   Q&A groups: ${qaGroupMap.size}`);

    const comparisonGroupMap = new Map<string, ComparisonData[]>();
    (comparisonPages || []).forEach((comp: ComparisonData) => {
      if (comp.hreflang_group_id) {
        const existing = comparisonGroupMap.get(comp.hreflang_group_id) || [];
        existing.push(comp);
        comparisonGroupMap.set(comp.hreflang_group_id, existing);
      }
    });
    console.log(`   Comparison groups: ${comparisonGroupMap.size}`);

    const locationGroupMap = new Map<string, LocationData[]>();
    (locationPages || []).forEach((loc: LocationData) => {
      if (loc.hreflang_group_id) {
        const existing = locationGroupMap.get(loc.hreflang_group_id) || [];
        existing.push(loc);
        locationGroupMap.set(loc.hreflang_group_id, existing);
      }
    });
    console.log(`   Location groups: ${locationGroupMap.size}`);
    console.log('✅ Hreflang maps pre-computed');

    // Build content types map and generate XML files
    const languageContentTypes = new Map<string, { type: string; lastmod: string }[]>();
    const sitemapFiles: Record<string, string> = {};
    let totalUrls = 0;

    for (const lang of SUPPORTED_LANGUAGES) {
      const langArticles = articlesByLang.get(lang) || [];
      const langQA = qaByLang.get(lang) || [];
      const langLocations = locationsByLang.get(lang) || [];
      const langComparisons = comparisonsByLang.get(lang) || [];

      const contentTypes: { type: string; lastmod: string }[] = [];

      // Blog sitemap
      if (langArticles.length > 0) {
        const lastmod = langArticles[0]?.date_modified 
          ? new Date(langArticles[0].date_modified).toISOString().split('T')[0]
          : getToday();
        contentTypes.push({ type: 'blog', lastmod });
        
        const blogXml = generateLanguageBlogSitemap(langArticles, lang, clusterMap);
        sitemapFiles[`sitemaps/${lang}/blog.xml`] = blogXml;
        totalUrls += langArticles.length + 1; // +1 for index page
      }

      // Q&A sitemap
      if (langQA.length > 0) {
        contentTypes.push({ type: 'qa', lastmod: getToday() });
        
        const qaXml = generateLanguageQASitemap(langQA, lang, qaGroupMap);
        sitemapFiles[`sitemaps/${lang}/qa.xml`] = qaXml;
        totalUrls += langQA.length + 1;
      }

      // Comparisons sitemap
      if (langComparisons.length > 0) {
        contentTypes.push({ type: 'comparisons', lastmod: getToday() });
        
        const compXml = generateLanguageComparisonSitemap(langComparisons, lang, comparisonGroupMap);
        sitemapFiles[`sitemaps/${lang}/comparisons.xml`] = compXml;
        totalUrls += langComparisons.length + 1;
      }

      // Locations sitemap
      if (langLocations.length > 0) {
        contentTypes.push({ type: 'locations', lastmod: getToday() });
        
        const locXml = generateLanguageLocationSitemap(langLocations, lang, locationGroupMap);
        sitemapFiles[`sitemaps/${lang}/locations.xml`] = locXml;
        totalUrls += langLocations.length + 1;
      }

      if (contentTypes.length > 0) {
        languageContentTypes.set(lang, contentTypes);
      }
    }

    // Generate static sitemaps
    console.log('📥 Fetching properties for sitemap...');
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('internal_ref, internal_name, updated_at, images, is_active')
      .eq('is_active', true);
    
    const properties: PropertyData[] = propertiesData || [];
    console.log(`   🏠 Properties: ${properties.length}`);
    
    // Properties sitemap with images
    const propertiesXml = generatePropertiesSitemap(properties);
    sitemapFiles['sitemaps/properties.xml'] = propertiesXml;
    totalUrls += properties.length + 1; // +1 for properties index
    
    // Static pages sitemap with hreflang
    const staticPagesXml = generateStaticPagesSitemap();
    sitemapFiles['sitemaps/pages.xml'] = staticPagesXml;
    totalUrls += 1 + (STATIC_PAGES.length * SUPPORTED_LANGUAGES.length); // root + all language pages
    
    const brochuresXml = generateBrochuresSitemap();
    sitemapFiles['sitemaps/brochures.xml'] = brochuresXml;
    totalUrls += 1 + 1 + 1 + LOCATION_CITIES.length; // homepage + guide + about + cities

    const glossaryXml = generateGlossarySitemap();
    sitemapFiles['sitemaps/glossary.xml'] = glossaryXml;
    totalUrls += 1 + GLOSSARY_TERMS.length; // main + terms

    // Generate master sitemap index (now includes pages and properties)
    const updatedMasterIndex = generateEnhancedMasterSitemapIndex(languageContentTypes, getToday(), properties.length);
    sitemapFiles['sitemap-index.xml'] = updatedMasterIndex;
    
    // Also add main sitemap.xml that points to sitemap-index.xml
    sitemapFiles['sitemap.xml'] = updatedMasterIndex;

    // Upload all sitemap files to Supabase Storage for fresh serving
    console.log('📤 Uploading sitemaps to storage...');
    let uploadedCount = 0;
    let uploadErrors: string[] = [];
    
    for (const [filePath, xmlContent] of Object.entries(sitemapFiles)) {
      try {
        // Convert string to Uint8Array for upload
        const encoder = new TextEncoder();
        const contentBytes = encoder.encode(xmlContent);
        
        const { error: uploadError } = await supabase.storage
          .from('sitemaps')
          .upload(filePath, contentBytes, {
            contentType: 'application/xml',
            cacheControl: '300', // 5 minute cache
            upsert: true
          });
        
        if (uploadError) {
          console.error(`   ❌ Failed to upload ${filePath}:`, uploadError.message);
          uploadErrors.push(`${filePath}: ${uploadError.message}`);
        } else {
          uploadedCount++;
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`   ❌ Error uploading ${filePath}:`, errMsg);
        uploadErrors.push(`${filePath}: ${errMsg}`);
      }
    }
    
    console.log(`   ✅ Uploaded ${uploadedCount}/${Object.keys(sitemapFiles).length} files to storage`);
    if (uploadErrors.length > 0) {
      console.log(`   ⚠️ Upload errors: ${uploadErrors.join(', ')}`);
    }

    // Log the regeneration event
    console.log(`✅ Sitemap regeneration complete:`);
    console.log(`   • Total URLs: ${totalUrls}`);
    console.log(`   • Languages: ${Array.from(languageContentTypes.keys()).join(', ')}`);
    console.log(`   • Files generated: ${Object.keys(sitemapFiles).length}`);
    console.log(`   • Files uploaded to storage: ${uploadedCount}`);

    // Prepare response data
    const sitemapData = {
      generated_at: new Date().toISOString(),
      trigger_source,
      total_urls: totalUrls,
      languages_with_content: Array.from(languageContentTypes.keys()),
      content_counts: {
        blog: articles.length,
        qa: qaPages.length,
        locations: locationPages.length,
        comparisons: comparisonPages.length,
      },
      excluded_redirects: excludedRedirects,
      excluded_gone: excludedGone,
      total_redirects_excluded: totalExcludedRedirects,
      total_gone_excluded: totalExcludedGone,
      files_generated: Object.keys(sitemapFiles).length,
      files_uploaded: uploadedCount,
      upload_errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      file_list: Object.keys(sitemapFiles),
      storage_bucket: 'sitemaps',
      storage_url: `${supabaseUrl}/storage/v1/object/public/sitemaps`,
    };

    // Ping IndexNow for Bing and Yandex (Google deprecated their ping endpoint in 2023)
    let indexNowResult = null;
    if (trigger_source === 'publish') {
      console.log('🔔 Pinging IndexNow (Bing/Yandex)...');
      try {
        const indexNowResponse = await fetch(`${supabaseUrl}/functions/v1/ping-indexnow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sitemap_update: true }),
        });
        indexNowResult = await indexNowResponse.json();
        console.log('   IndexNow result:', indexNowResult?.success ? '✓' : '✗');
      } catch (e) {
        console.error('   Failed to ping IndexNow:', e);
      }
    }

    // Add ping results to response (no Google ping - deprecated in 2023)
    const pingResults = {
      indexNow: indexNowResult,
      googleNote: 'Google discontinued their sitemap ping endpoint in 2023. Use Google Search Console for manual submission.',
    };

    // Return XML files if requested
    if (download_xml) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sitemap XML files generated and uploaded to storage',
        data: { ...sitemapData, ping_results: pingResults },
        xml_files: sitemapFiles,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Sitemap regenerated and uploaded to storage',
      data: { ...sitemapData, ping_results: pingResults },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Sitemap regeneration failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
