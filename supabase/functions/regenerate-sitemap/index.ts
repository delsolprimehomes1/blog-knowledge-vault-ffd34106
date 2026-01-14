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

    // Filter out redirects from sitemap
    const articles = (rawArticles || []).filter(a => !a.is_redirect && !a.redirect_to);
    const qaPages = (rawQaPages || []).filter(q => !q.is_redirect && !q.redirect_to);
    const locationPages = (rawLocationPages || []).filter(l => !l.is_redirect && !l.redirect_to);
    const comparisonPages = (rawComparisonPages || []).filter(c => !c.is_redirect && !c.redirect_to);

    const excludedRedirects = {
      blog: (rawArticles?.length || 0) - articles.length,
      qa: (rawQaPages?.length || 0) - qaPages.length,
      locations: (rawLocationPages?.length || 0) - locationPages.length,
      comparisons: (rawComparisonPages?.length || 0) - comparisonPages.length,
    };
    const totalExcluded = excludedRedirects.blog + excludedRedirects.qa + excludedRedirects.locations + excludedRedirects.comparisons;

    console.log(`📊 Content counts (after filtering redirects):`);
    console.log(`   📝 Blog: ${articles.length} (excluded ${excludedRedirects.blog} redirects)`);
    console.log(`   🔍 Q&A: ${qaPages.length} (excluded ${excludedRedirects.qa} redirects)`);
    console.log(`   📍 Locations: ${locationPages.length} (excluded ${excludedRedirects.locations} redirects)`);
    console.log(`   ⚖️ Comparisons: ${comparisonPages.length} (excluded ${excludedRedirects.comparisons} redirects)`);
    if (totalExcluded > 0) {
      console.log(`   🔀 Total redirects excluded from sitemap: ${totalExcluded}`);
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
    const brochuresXml = generateBrochuresSitemap();
    sitemapFiles['sitemaps/brochures.xml'] = brochuresXml;
    totalUrls += 1 + 1 + 1 + LOCATION_CITIES.length; // homepage + guide + about + cities

    const glossaryXml = generateGlossarySitemap();
    sitemapFiles['sitemaps/glossary.xml'] = glossaryXml;
    totalUrls += 1 + GLOSSARY_TERMS.length; // main + terms

    // Generate master sitemap index
    const masterIndex = generateMasterSitemapIndex(languageContentTypes, getToday());
    sitemapFiles['sitemap-index.xml'] = masterIndex;
    
    // Also add main sitemap.xml that points to sitemap-index.xml
    sitemapFiles['sitemap.xml'] = masterIndex;

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
      total_redirects_excluded: totalExcluded,
      files_generated: Object.keys(sitemapFiles).length,
      files_uploaded: uploadedCount,
      upload_errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      file_list: Object.keys(sitemapFiles),
      storage_bucket: 'sitemaps',
      storage_url: `${supabaseUrl}/storage/v1/object/public/sitemaps`,
    };

    // Ping IndexNow if this is a publish event
    if (trigger_source === 'publish') {
      console.log('🔔 Pinging IndexNow...');
      try {
        await fetch(`${supabaseUrl}/functions/v1/ping-indexnow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sitemap_update: true }),
        });
      } catch (e) {
        console.error('Failed to ping IndexNow:', e);
      }
    }

    // Return XML files if requested
    if (download_xml) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sitemap XML files generated and uploaded to storage',
        data: sitemapData,
        xml_files: sitemapFiles,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Sitemap regenerated and uploaded to storage',
      data: sitemapData,
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
