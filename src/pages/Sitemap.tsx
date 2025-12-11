import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { isFeatureEnabled } from "@/lib/featureFlags";

const Sitemap = () => {
  const [hreflangEnabled, setHreflangEnabled] = useState(false);

  // Check feature flag on mount
  useEffect(() => {
    isFeatureEnabled('enhanced_hreflang').then(setHreflangEnabled);
  }, []);

  const { data: articles } = useQuery({
    queryKey: ["sitemap-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("slug, date_modified, date_published, language, cluster_id, is_primary")
        .eq("status", "published")
        .order("date_modified", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Group articles by cluster_id for hreflang siblings lookup
  const clusterMap = useMemo(() => {
    if (!articles) return new Map<string, typeof articles>();
    const map = new Map<string, typeof articles>();
    articles.forEach(article => {
      if (article.cluster_id) {
        const existing = map.get(article.cluster_id) || [];
        existing.push(article);
        map.set(article.cluster_id, existing);
      }
    });
    return map;
  }, [articles]);

  useEffect(() => {
    if (articles) {
      const baseUrl = "https://www.delsolprimehomes.com";
      
      // All 10 supported languages (no Spanish)
      const langToHreflang: Record<string, string> = {
        en: 'en-GB', de: 'de-DE', nl: 'nl-NL',
        fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE', 
        da: 'da-DK', hu: 'hu-HU', fi: 'fi-FI', no: 'nb-NO',
      };
      
      // Build sitemap with conditional hreflang based on feature flag
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hreflangEnabled ? '\n        xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ''}>
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>${hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${baseUrl}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/" />` : ''}
  </url>
  
  <!-- Blog Index -->
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${hreflangEnabled ? `
    <xhtml:link rel="alternate" hreflang="en-GB" href="${baseUrl}/blog" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/blog" />` : ''}
  </url>
  
  <!-- Blog Articles -->
${articles.map(article => {
  const lastmod = article.date_modified || article.date_published || new Date().toISOString();
  const currentUrl = `${baseUrl}/blog/${article.slug}`;
  
  // Phase 4: Build hreflang links using cluster siblings (not translations JSONB)
  let hreflangLinks = '';
  
  if (hreflangEnabled) {
    // 1. Self-referencing hreflang
    const currentLangCode = langToHreflang[article.language] || article.language;
    hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${currentLangCode}" href="${currentUrl}" />`;
    
    // 2. Add cluster siblings as alternate language versions
    const siblings = article.cluster_id ? clusterMap.get(article.cluster_id) : null;
    if (siblings && siblings.length > 1) {
      siblings.forEach((sibling) => {
        if (sibling.slug && sibling.language !== article.language) {
          const langCode = langToHreflang[sibling.language] || sibling.language;
          hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${langCode}" href="${baseUrl}/blog/${sibling.slug}" />`;
        }
      });
    }
    
    // 3. x-default points to cluster primary (or self if standalone)
    const primaryArticle = siblings?.find(s => s.is_primary);
    const xDefaultUrl = primaryArticle 
      ? `${baseUrl}/blog/${primaryArticle.slug}`
      : currentUrl;
    hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />`;
  }
  
  return `  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${hreflangLinks}
  </url>`;
}).join('\n')}
  
</urlset>`;

      // Copy sitemap to clipboard
      navigator.clipboard.writeText(sitemap);
      
      // Trigger download
      const blob = new Blob([sitemap], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [articles, hreflangEnabled]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Sitemap Generated</h1>
      <p className="text-muted-foreground mb-4">
        The sitemap has been copied to your clipboard and downloaded as sitemap.xml
      </p>
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm">
          <strong>Hreflang tags:</strong> {hreflangEnabled ? '✅ Enabled' : '❌ Disabled (feature flag off)'}
        </p>
      </div>
      <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
        <pre className="text-xs">
          {articles && `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${articles.length} published articles included
  Hreflang: ${hreflangEnabled ? 'ENABLED' : 'DISABLED'}
</urlset>`}
        </pre>
      </div>
    </div>
  );
};

export default Sitemap;