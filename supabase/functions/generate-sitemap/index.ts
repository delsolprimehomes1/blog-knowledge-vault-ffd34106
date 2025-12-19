import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
};

const BASE_URL = 'https://www.delsolprimehomes.com';

const LOCATION_CITIES = [
  'marbella', 'estepona', 'mijas', 'fuengirola', 'benalmadena',
  'torremolinos', 'malaga', 'sotogrande', 'manilva', 'casares'
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'index';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let xml = '';

    switch (type) {
      case 'index':
        xml = await generateSitemapIndex();
        break;
      case 'blog':
        xml = await generateBlogSitemap(supabase);
        break;
      case 'qa':
        xml = await generateQASitemap(supabase);
        break;
      case 'glossary':
        xml = await generateGlossarySitemap();
        break;
      case 'locations':
        xml = generateLocationsSitemap();
        break;
      default:
        xml = await generateSitemapIndex();
    }

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error: unknown) {
    console.error('Sitemap generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error generating sitemap: ${message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
});

async function generateSitemapIndex(): Promise<string> {
  const today = getToday();
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-qa.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-glossary.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-locations.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

async function generateBlogSitemap(supabase: any): Promise<string> {
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, date_modified, date_published')
    .eq('status', 'published')
    .order('date_modified', { ascending: false });

  if (error) throw error;

  const today = getToday();
  
  const articleUrls = (articles || []).map((article: any) => {
    const lastmod = article.date_modified || article.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    return `  <url>
    <loc>${BASE_URL}/blog/${article.slug}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Blog Index -->
  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Blog Articles (${articles?.length || 0} total) -->
${articleUrls}
  
</urlset>`;
}

async function generateQASitemap(supabase: any): Promise<string> {
  const { data: qaPages, error } = await supabase
    .from('qa_pages')
    .select('slug, updated_at, created_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const today = getToday();
  
  const qaUrls = (qaPages || []).map((qa: any) => {
    const lastmod = qa.updated_at || qa.created_at || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    return `  <url>
    <loc>${BASE_URL}/qa/${qa.slug}</loc>
    <lastmod>${lastmodFormatted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Q&A Index -->
  <url>
    <loc>${BASE_URL}/qa</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  
  <!-- Q&A Pages (${qaPages?.length || 0} total) -->
${qaUrls}
  
</urlset>`;
}

async function generateGlossarySitemap(): Promise<string> {
  // Glossary terms - static list (could be expanded to fetch from DB)
  const terms = [
    'NIE Number', 'Notary', 'Property Transfer Tax', 'Community Fees', 'Plusvalia Tax',
    'Escritura', 'Registro de la Propiedad', 'Catastro', 'IBI Tax', 'Gestor',
    'Golden Visa', 'Mortgage', 'Power of Attorney', 'Rental License', 'RETA',
    'Autónomo', 'Residencia', 'Empadronamiento', 'TIE Card', 'Bank Account'
  ];
  
  const today = getToday();
  
  const termUrls = terms.map((term) => {
    const termSlug = term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `  <url>
    <loc>${BASE_URL}/glossary#${termSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Glossary Page -->
  <url>
    <loc>${BASE_URL}/glossary</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Glossary Terms (${terms.length} total) -->
${termUrls}
  
</urlset>`;
}

function generateLocationsSitemap(): string {
  const today = getToday();
  
  const cityUrls = LOCATION_CITIES.map((city) => {
    return `  <url>
    <loc>${BASE_URL}/brochure/${city}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- City Brochures (${LOCATION_CITIES.length} locations) -->
${cityUrls}
  
</urlset>`;
}
