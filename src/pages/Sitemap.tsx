import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://www.delsolprimehomes.com";

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

const langToHreflang: Record<string, string> = {
  en: 'en-GB', de: 'de-DE', nl: 'nl-NL', hu: 'hu-HU',
  fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE', 
  da: 'da-DK', fi: 'fi-FI', no: 'nb-NO',
};

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
}

interface ComparisonPageData {
  slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
}

interface LocationPageData {
  city_slug: string;
  topic_slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
}

const Sitemap = () => {
  const [hreflangEnabled, setHreflangEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    isFeatureEnabled('enhanced_hreflang').then(setHreflangEnabled);
  }, []);

  // Fetch all content
  const { data: articles, isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
    queryKey: ["sitemap-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("slug, date_modified, date_published, language, cluster_id, is_primary")
        .eq("status", "published")
        .order("date_modified", { ascending: false });
      if (error) throw error;
      return data as ArticleData[];
    },
  });

  const { data: qaPages, isLoading: qaLoading } = useQuery({
    queryKey: ["sitemap-qa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_pages")
        .select("slug, language, hreflang_group_id, updated_at")
        .eq("status", "published");
      if (error) throw error;
      return data as QAPageData[];
    },
  });

  const { data: comparisonPages, isLoading: compLoading } = useQuery({
    queryKey: ["sitemap-comparisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparison_pages")
        .select("slug, language, hreflang_group_id, updated_at")
        .eq("status", "published");
      if (error) throw error;
      return data as ComparisonPageData[];
    },
  });

  const { data: locationPages, isLoading: locLoading } = useQuery({
    queryKey: ["sitemap-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_pages")
        .select("city_slug, topic_slug, language, hreflang_group_id, updated_at")
        .eq("status", "published");
      if (error) throw error;
      return data as LocationPageData[];
    },
  });

  const isLoading = articlesLoading || qaLoading || compLoading || locLoading;

  // Group content by language
  const articlesByLang = useMemo(() => {
    const map = new Map<string, ArticleData[]>();
    (articles || []).forEach(article => {
      const existing = map.get(article.language) || [];
      existing.push(article);
      map.set(article.language, existing);
    });
    return map;
  }, [articles]);

  const clusterMap = useMemo(() => {
    const map = new Map<string, ArticleData[]>();
    (articles || []).forEach(article => {
      if (article.cluster_id) {
        const existing = map.get(article.cluster_id) || [];
        existing.push(article);
        map.set(article.cluster_id, existing);
      }
    });
    return map;
  }, [articles]);

  // Generate sitemap XML for a specific content type and language
  const generateBlogSitemap = useCallback((langArticles: ArticleData[], lang: string) => {
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
  }, [hreflangEnabled, clusterMap]);

  // Generate master sitemap index
  const generateMasterIndex = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const entries: string[] = [];

    SUPPORTED_LANGUAGES.forEach(lang => {
      const langArticles = articlesByLang.get(lang) || [];
      if (langArticles.length > 0) {
        entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      }
    });

    // Q&A sitemaps
    const qaByLang = new Map<string, QAPageData[]>();
    (qaPages || []).forEach(qa => {
      const existing = qaByLang.get(qa.language) || [];
      existing.push(qa);
      qaByLang.set(qa.language, existing);
    });
    qaByLang.forEach((_, lang) => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/qa.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    });

    // Comparison sitemaps
    const compByLang = new Map<string, ComparisonPageData[]>();
    (comparisonPages || []).forEach(comp => {
      const existing = compByLang.get(comp.language) || [];
      existing.push(comp);
      compByLang.set(comp.language, existing);
    });
    compByLang.forEach((_, lang) => {
      entries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}/comparisons.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
    });

    // Location sitemaps
    const locByLang = new Map<string, LocationPageData[]>();
    (locationPages || []).forEach(loc => {
      const existing = locByLang.get(loc.language) || [];
      existing.push(loc);
      locByLang.set(loc.language, existing);
    });
    locByLang.forEach((_, lang) => {
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
  <!-- Total: ${(articles?.length || 0) + (qaPages?.length || 0) + (comparisonPages?.length || 0) + (locationPages?.length || 0)} published pages -->
${entries.join('\n')}
</sitemapindex>`;
  }, [articles, qaPages, comparisonPages, locationPages, articlesByLang]);

  const handleDownloadAll = async () => {
    setGenerating(true);
    try {
      // Create a zip-like download of all sitemaps
      const masterIndex = generateMasterIndex();
      
      // Download master index
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
      for (const lang of SUPPORTED_LANGUAGES) {
        const langArticles = articlesByLang.get(lang);
        if (langArticles && langArticles.length > 0) {
          const sitemap = generateBlogSitemap(langArticles, lang);
          const blob = new Blob([sitemap], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${lang}-blog.xml`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          await new Promise(r => setTimeout(r, 100)); // Small delay between downloads
        }
      }

      toast({
        title: "Sitemaps Generated",
        description: `Downloaded sitemap index and ${articlesByLang.size} language sitemaps`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate sitemaps",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyIndex = async () => {
    const masterIndex = generateMasterIndex();
    await navigator.clipboard.writeText(masterIndex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const totalUrls = (articles?.length || 0) + (qaPages?.length || 0) + (comparisonPages?.length || 0) + (locationPages?.length || 0);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Sitemap Generator</h1>
      <p className="text-muted-foreground mb-6">
        Generate comprehensive XML sitemaps for all published content
      </p>
      
      {isLoading ? (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading content...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{articles?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Blog Articles</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{qaPages?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Q&A Pages</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{comparisonPages?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Comparisons</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{locationPages?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Locations</div>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{totalUrls}</div>
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

          {/* Language breakdown */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Content by Language</h3>
            <div className="grid grid-cols-5 gap-2">
              {SUPPORTED_LANGUAGES.map(lang => {
                const count = articlesByLang.get(lang)?.length || 0;
                return (
                  <div key={lang} className={`p-2 rounded text-center text-sm ${count > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <span className="font-medium uppercase">{lang}</span>
                    <span className="ml-1 text-muted-foreground">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>

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
            <Button variant="ghost" onClick={() => refetchArticles()}>
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
