import { useEffect, useState, useMemo, useCallback } from "react";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  useSitemapCounts,
  fetchAllArticles,
  fetchAllQAPages,
  fetchAllComparisonPages,
  fetchAllLocationPages,
  type ArticleData,
} from "@/hooks/useSitemapData";

const BASE_URL = "https://www.delsolprimehomes.com";

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

const langToHreflang: Record<string, string> = {
  en: 'en-GB', de: 'de-DE', nl: 'nl-NL', hu: 'hu-HU',
  fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE', 
  da: 'da-DK', fi: 'fi-FI', no: 'nb-NO',
};

const Sitemap = () => {
  const [hreflangEnabled, setHreflangEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const { toast } = useToast();

  // Use COUNT queries for accurate stats (bypasses 1000 row limit)
  const { data: counts, isLoading: countsLoading, refetch: refetchCounts } = useSitemapCounts();

  useEffect(() => {
    isFeatureEnabled('enhanced_hreflang').then(setHreflangEnabled);
  }, []);

  const totalUrls = (counts?.articles || 0) + (counts?.qa || 0) + (counts?.comparisons || 0) + (counts?.locations || 0);

  // Generate sitemap XML for blog articles
  const generateBlogSitemap = useCallback((langArticles: ArticleData[], lang: string, clusterMap: Map<string, ArticleData[]>) => {
    const hreflangCode = langToHreflang[lang] || lang;
    
    const articleUrls = langArticles.map((article) => {
      const lastmod = article.date_modified || article.date_published || new Date().toISOString();
      const lastmodFormatted = new Date(lastmod).toISOString().split('T')[0];
      const currentUrl = `${BASE_URL}/${lang}/blog/${article.slug}`;
      
      let hreflangLinks = '';
      if (hreflangEnabled) {
        hreflangLinks = `\n    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${currentUrl}" />`;
        const siblings = article.cluster_id ? clusterMap.get(article.cluster_id) : null;
        if (siblings && siblings.length > 1) {
          siblings.forEach((sibling) => {
            if (sibling.slug && sibling.language !== article.language) {
              const siblingLangCode = langToHreflang[sibling.language] || sibling.language;
              hreflangLinks += `\n    <xhtml:link rel="alternate" hreflang="${siblingLangCode}" href="${BASE_URL}/${sibling.language}/blog/${sibling.slug}" />`;
            }
          });
        }
        const primaryArticle = siblings?.find(s => s.is_primary) || siblings?.find(s => s.language === 'en');
        const xDefaultUrl = primaryArticle 
          ? `${BASE_URL}/${primaryArticle.language}/blog/${primaryArticle.slug}`
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

    const ns = hreflangEnabled 
      ? `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"`
      : `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>
  <!-- Blog Index (${lang}) -->
  <url>
    <loc>${BASE_URL}/${lang}/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Blog Articles in ${lang.toUpperCase()} (${langArticles.length} total) -->
${articleUrls}
</urlset>`;
  }, [hreflangEnabled]);

  // Generate master sitemap index using accurate counts
  const generateMasterIndex = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const entries: string[] = [];

    // Blog sitemaps - one per language
    SUPPORTED_LANGUAGES.forEach(lang => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    });

    // Q&A sitemaps
    SUPPORTED_LANGUAGES.forEach(lang => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/qa.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    });

    // Comparison sitemaps
    SUPPORTED_LANGUAGES.forEach(lang => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/comparisons.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    });

    // Location sitemaps
    SUPPORTED_LANGUAGES.forEach(lang => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/locations.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    });

    // Static sitemaps
    entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/glossary.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/brochures.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Del Sol Prime Homes Sitemap Index -->
  <!-- Total: ${totalUrls} published pages -->
${entries.join('\n')}
</sitemapindex>`;
  }, [totalUrls]);

  const handleDownloadAll = async () => {
    setGenerating(true);
    setProgress({ current: 0, total: totalUrls, phase: 'Fetching blog articles...' });

    try {
      // Fetch ALL articles with pagination (no 1000 row limit)
      const allArticles = await fetchAllArticles((fetched) => {
        setProgress(prev => ({ ...prev, current: fetched, phase: `Fetching blog articles... (${fetched})` }));
      });

      // Build cluster map for hreflang
      const clusterMap = new Map<string, ArticleData[]>();
      allArticles.forEach(article => {
        if (article.cluster_id) {
          const existing = clusterMap.get(article.cluster_id) || [];
          existing.push(article);
          clusterMap.set(article.cluster_id, existing);
        }
      });

      // Group by language
      const articlesByLang = new Map<string, ArticleData[]>();
      allArticles.forEach(article => {
        const existing = articlesByLang.get(article.language) || [];
        existing.push(article);
        articlesByLang.set(article.language, existing);
      });

      // Download master index
      setProgress(prev => ({ ...prev, phase: 'Generating sitemap index...' }));
      const masterIndex = generateMasterIndex();
      const blob = new Blob([masterIndex], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap-index.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Download each language's blog sitemap
      let downloadCount = 0;
      for (const lang of SUPPORTED_LANGUAGES) {
        const langArticles = articlesByLang.get(lang);
        if (langArticles && langArticles.length > 0) {
          setProgress(prev => ({ ...prev, phase: `Generating ${lang.toUpperCase()} sitemap... (${langArticles.length} articles)` }));
          const sitemap = generateBlogSitemap(langArticles, lang, clusterMap);
          const blob = new Blob([sitemap], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${lang}-blog.xml`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          downloadCount++;
          await new Promise(r => setTimeout(r, 100));
        }
      }

      toast({
        title: "Sitemaps Generated",
        description: `Downloaded sitemap index and ${downloadCount} language sitemaps (${allArticles.length} total articles)`,
      });
    } catch (error) {
      console.error('Sitemap generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate sitemaps",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0, phase: '' });
    }
  };

  const handleCopyIndex = async () => {
    const masterIndex = generateMasterIndex();
    await navigator.clipboard.writeText(masterIndex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Sitemap Generator</h1>
      <p className="text-muted-foreground mb-6">
        Generate comprehensive XML sitemaps for all published content
      </p>
      
      {countsLoading ? (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading content counts...</span>
        </div>
      ) : (
        <>
          {/* Stats - Using accurate COUNT queries */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{counts?.articles?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Blog Articles</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{counts?.qa?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Q&A Pages</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{counts?.comparisons?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Comparisons</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{counts?.locations?.toLocaleString() || 0}</div>
              <div className="text-sm text-muted-foreground">Locations</div>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{totalUrls.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total URLs</div>
            </div>
          </div>

          {/* Settings */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Hreflang Tags:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${hreflangEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {hreflangEnabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              URL Format: /{'{lang}'}/blog/{'{slug}'} (e.g., /en/blog/article-title)
            </p>
          </div>

          {/* Progress indicator */}
          {generating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{progress.phase}</span>
              </div>
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="h-2" />
              <p className="text-xs text-blue-600 mt-1">
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()} items
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleDownloadAll} disabled={generating}>
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Download All Sitemaps'}
            </Button>
            <Button variant="outline" onClick={handleCopyIndex}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Index XML'}
            </Button>
            <Button variant="ghost" onClick={() => refetchCounts()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Preview */}
          <div className="mt-6">
            <h3 className="font-medium mb-2">Sitemap Index Preview</h3>
            <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-xs whitespace-pre-wrap">{generateMasterIndex()}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Sitemap;
