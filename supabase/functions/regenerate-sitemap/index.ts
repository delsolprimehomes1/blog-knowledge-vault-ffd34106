import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const BASE_URL = 'https://www.delsolprimehomes.com';

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

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function xmlHeader(includeHreflang: boolean): string {
  const ns = includeHreflang 
    ? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"`
    : `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>`;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🗺️ Regenerating sitemaps...');
    
    const { trigger_source } = await req.json().catch(() => ({ trigger_source: 'manual' }));
    console.log(`   Trigger: ${trigger_source}`);

    // Fetch all published content
    const { data: articles } = await supabase
      .from('blog_articles')
      .select('slug, language, cluster_id, is_primary, date_modified, date_published')
      .eq('status', 'published')
      .order('date_modified', { ascending: false });

    const { data: qaPages } = await supabase
      .from('qa_pages')
      .select('slug, language, hreflang_group_id, updated_at, created_at')
      .eq('status', 'published');

    const { data: locationPages } = await supabase
      .from('location_pages')
      .select('city_slug, topic_slug, city_name, language, hreflang_group_id, updated_at')
      .eq('status', 'published');

    const { data: comparisonPages } = await supabase
      .from('comparison_pages')
      .select('slug, language, hreflang_group_id, updated_at')
      .eq('status', 'published');

    console.log(`📊 Content counts:`);
    console.log(`   📝 Blog: ${articles?.length || 0}`);
    console.log(`   🔍 Q&A: ${qaPages?.length || 0}`);
    console.log(`   📍 Locations: ${locationPages?.length || 0}`);
    console.log(`   ⚖️ Comparisons: ${comparisonPages?.length || 0}`);

    // Build cluster map
    const clusterMap = new Map<string, ArticleData[]>();
    (articles || []).forEach((article: ArticleData) => {
      if (article.cluster_id) {
        const existing = clusterMap.get(article.cluster_id) || [];
        existing.push(article);
        clusterMap.set(article.cluster_id, existing);
      }
    });

    // Group by language
    const articlesByLang = new Map<string, ArticleData[]>();
    (articles || []).forEach((article: ArticleData) => {
      const existing = articlesByLang.get(article.language) || [];
      existing.push(article);
      articlesByLang.set(article.language, existing);
    });

    // Build content types map for master index
    const languageContentTypes = new Map<string, { type: string; lastmod: string }[]>();
    let totalUrls = 0;

    for (const lang of SUPPORTED_LANGUAGES) {
      const langArticles = articlesByLang.get(lang) || [];
      const langQA = (qaPages || []).filter(p => p.language === lang);
      const langLocations = (locationPages || []).filter(p => p.language === lang);
      const langComparisons = (comparisonPages || []).filter(p => p.language === lang);

      const contentTypes: { type: string; lastmod: string }[] = [];

      if (langArticles.length > 0) {
        const lastmod = langArticles[0]?.date_modified 
          ? new Date(langArticles[0].date_modified).toISOString().split('T')[0]
          : getToday();
        contentTypes.push({ type: 'blog', lastmod });
        totalUrls += langArticles.length + 1;
      }

      if (langQA.length > 0) {
        contentTypes.push({ type: 'qa', lastmod: getToday() });
        totalUrls += langQA.length + 1;
      }

      if (langLocations.length > 0) {
        contentTypes.push({ type: 'locations', lastmod: getToday() });
        totalUrls += langLocations.length + 1;
      }

      if (langComparisons.length > 0) {
        contentTypes.push({ type: 'comparisons', lastmod: getToday() });
        totalUrls += langComparisons.length + 1;
      }

      if (contentTypes.length > 0) {
        languageContentTypes.set(lang, contentTypes);
      }
    }

    // Generate master sitemap index
    const masterIndex = generateMasterSitemapIndex(languageContentTypes, getToday());
    
    // Store sitemap data for reference (could be used by build process)
    const sitemapData = {
      generated_at: new Date().toISOString(),
      trigger_source,
      total_urls: totalUrls,
      languages_with_content: Array.from(languageContentTypes.keys()),
      content_counts: {
        blog: articles?.length || 0,
        qa: qaPages?.length || 0,
        locations: locationPages?.length || 0,
        comparisons: comparisonPages?.length || 0,
      },
      master_index_preview: masterIndex.substring(0, 500) + '...',
    };

    // Log the regeneration event
    console.log(`✅ Sitemap regeneration complete:`);
    console.log(`   • Total URLs: ${totalUrls}`);
    console.log(`   • Languages: ${Array.from(languageContentTypes.keys()).join(', ')}`);

    // Ping search engines if this is a publish event
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

    return new Response(JSON.stringify({
      success: true,
      message: 'Sitemap data regenerated',
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
