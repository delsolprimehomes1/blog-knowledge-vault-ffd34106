import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Supabase setup (same pattern as generateStaticPages.ts)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Language code mapping (exact match to BlogArticle Phase 3)
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

interface ArticleData {
  slug: string;
  language: string;
  cluster_id: string | null;
  is_primary: boolean;
  date_modified: string | null;
  date_published: string | null;
}

// Check feature flag
async function checkFeatureFlag(flagName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', `feature_${flagName}`)
      .single();
    
    if (error) {
      console.log(`⚠️ Feature flag '${flagName}' not found, defaulting to false`);
      return false;
    }
    return data?.setting_value === 'true';
  } catch (err) {
    console.error(`Error checking feature flag:`, err);
    return false;
  }
}

// Main sitemap generation function
export async function generateSitemap(outputDir?: string): Promise<void> {
  console.log('\n🗺️ Starting sitemap generation...');
  
  // 1. Check feature flag
  const hreflangEnabled = await checkFeatureFlag('enhanced_hreflang');
  console.log(`🏳️ Hreflang feature flag: ${hreflangEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  // 2. Fetch ALL published articles (no limit!)
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, language, cluster_id, is_primary, date_modified, date_published')
    .eq('status', 'published')
    .order('date_modified', { ascending: false });
  
  if (error) {
    console.error('❌ Failed to fetch articles:', error);
    throw error;
  }
  
  console.log(`📝 Found ${articles?.length || 0} published articles`);
  
  if (!articles || articles.length === 0) {
    console.warn('⚠️ No published articles found!');
    return;
  }
  
  // 3. Group articles by cluster_id for hreflang siblings
  const clusterMap = new Map<string, ArticleData[]>();
  articles.forEach((article: ArticleData) => {
    if (article.cluster_id) {
      const existing = clusterMap.get(article.cluster_id) || [];
      existing.push(article);
      clusterMap.set(article.cluster_id, existing);
    }
  });
  
  console.log(`🔗 Found ${clusterMap.size} clusters with siblings`);
  
  // 4. Generate XML
  const baseUrl = 'https://www.delsolprimehomes.com';
  const xmlNamespace = hreflangEnabled 
    ? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"`
    : `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
  
  // Build article URLs with hreflang
  const articleUrls = articles.map((article: ArticleData) => {
    const lastmod = article.date_modified || article.date_published || new Date().toISOString();
    const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
    const currentUrl = `${baseUrl}/blog/${article.slug}`;
    
    let hreflangLinks = '';
    
    if (hreflangEnabled) {
      // 1. Self-referencing hreflang
      const currentLangCode = langToHreflang[article.language] || article.language;
      hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
      
      // 2. Add cluster siblings as alternate language versions
      const siblings = article.cluster_id ? clusterMap.get(article.cluster_id) : null;
      if (siblings && siblings.length > 1) {
        siblings.forEach((sibling: ArticleData) => {
          if (sibling.slug && sibling.language !== article.language) {
            const langCode = langToHreflang[sibling.language] || sibling.language;
            hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${langCode}" href="${baseUrl}/blog/${sibling.slug}" />`;
          }
        });
      }
      
      // 3. x-default points to cluster primary (or self if standalone)
      const primaryArticle = siblings?.find((s: ArticleData) => s.is_primary);
      const xDefaultUrl = primaryArticle 
        ? `${baseUrl}/blog/${primaryArticle.slug}`
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
  
  // Homepage hreflang
  const homepageHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${baseUrl}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/" />` : '';
  
  // Blog index hreflang
  const blogIndexHreflang = hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${baseUrl}/blog" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/blog" />` : '';
  
  // Full sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${xmlNamespace}>
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>${homepageHreflang}
  </url>
  
  <!-- Blog Index -->
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${blogIndexHreflang}
  </url>
  
  <!-- Blog Articles (${articles.length} total) -->
${articleUrls}
  
</urlset>`;

  // 5. Write to public/sitemap.xml
  const outputPath = outputDir 
    ? join(outputDir, 'sitemap.xml')
    : join(process.cwd(), 'public', 'sitemap.xml');
  
  writeFileSync(outputPath, sitemap, 'utf-8');
  
  console.log(`✅ Sitemap generated successfully!`);
  console.log(`📊 Total URLs: ${articles.length + 2} (${articles.length} articles + homepage + blog index)`);
  console.log(`📍 Output: ${outputPath}`);
  
  // Show sample with hreflang if enabled
  if (hreflangEnabled) {
    const clustersWithSiblings = Array.from(clusterMap.entries()).filter(([_, siblings]) => siblings.length > 1);
    console.log(`🌐 Multilingual clusters with hreflang: ${clustersWithSiblings.length}`);
  }
}

// Run if called directly
generateSitemap().catch(console.error);
