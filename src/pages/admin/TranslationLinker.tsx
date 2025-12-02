import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Languages, Link2, Unlink, Save, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";

interface Article {
  id: string;
  slug: string;
  headline: string;
  language: string;
  cluster_theme: string | null;
  translations: Record<string, string> | null;
  status: string;
}

interface TranslationCluster {
  theme: string;
  articles: Article[];
  completeness: number;
}

const LANGUAGES = ['en', 'nl', 'fr', 'de', 'fi', 'pl', 'hu', 'sv', 'da', 'no'] as const;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch',
  fr: 'French',
  de: 'German',
  fi: 'Finnish',
  pl: 'Polish',
  hu: 'Hungarian',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
};

export default function TranslationLinker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Record<string, string>>>(new Map());
  const queryClient = useQueryClient();

  // Fetch all published articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ["translation-linker-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, language, cluster_theme, translations, status")
        .eq("status", "published")
        .order("cluster_theme", { ascending: true, nullsFirst: false })
        .order("headline", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Article[];
    },
  });

  // Group articles into translation clusters
  const clusters = useMemo<TranslationCluster[]>(() => {
    if (!articles) return [];
    
    const clusterMap = new Map<string, Article[]>();
    const orphanedArticles: Article[] = [];
    
    // Group by cluster_theme
    articles.forEach(article => {
      if (article.cluster_theme) {
        const existing = clusterMap.get(article.cluster_theme) || [];
        clusterMap.set(article.cluster_theme, [...existing, article]);
      } else {
        orphanedArticles.push(article);
      }
    });
    
    // Calculate completeness for each cluster
    const clustersArray = Array.from(clusterMap.entries()).map(([theme, arts]) => {
      const languagesPresent = new Set(arts.map(a => a.language));
      const completeness = Math.round((languagesPresent.size / LANGUAGES.length) * 100);
      
      return {
        theme,
        articles: arts,
        completeness,
      };
    });
    
    // Add orphaned articles as individual clusters
    orphanedArticles.forEach(article => {
      clustersArray.push({
        theme: `Orphaned: ${article.headline.substring(0, 50)}...`,
        articles: [article],
        completeness: 10,
      });
    });
    
    return clustersArray.sort((a, b) => b.completeness - a.completeness);
  }, [articles]);

  // Filter clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter(cluster => {
      const matchesSearch = searchQuery === "" || 
        cluster.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cluster.articles.some(a => a.headline.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesLanguage = languageFilter === "all" || 
        cluster.articles.some(a => a.language === languageFilter);
      
      const matchesCompleteness = !showIncompleteOnly || cluster.completeness < 100;
      
      return matchesSearch && matchesLanguage && matchesCompleteness;
    });
  }, [clusters, searchQuery, languageFilter, showIncompleteOnly]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const totalArticles = articles?.length || 0;
    const articlesWithTranslations = articles?.filter(a => 
      a.translations && Object.keys(a.translations).length > 0
    ).length || 0;
    const completelyLinked = clusters.filter(c => c.completeness === 100).length;
    
    return {
      totalArticles,
      articlesWithTranslations,
      linkedPercentage: totalArticles > 0 ? Math.round((articlesWithTranslations / totalArticles) * 100) : 0,
      totalClusters: clusters.length,
      completelyLinked,
      incompleteLinked: clusters.length - completelyLinked,
    };
  }, [articles, clusters]);

  // Handle linking articles within a cluster
  const linkArticles = (clusterArticles: Article[]) => {
    const updates = new Map(pendingUpdates);
    
    // Build translation maps for each article
    clusterArticles.forEach(sourceArticle => {
      const translations: Record<string, string> = {};
      
      clusterArticles.forEach(targetArticle => {
        if (sourceArticle.id !== targetArticle.id) {
          translations[targetArticle.language] = targetArticle.slug;
        }
      });
      
      updates.set(sourceArticle.id, translations);
    });
    
    setPendingUpdates(updates);
    toast.info(`Prepared translation links for ${clusterArticles.length} articles`);
  };

  // Handle unlinking a specific article
  const unlinkArticle = (articleId: string) => {
    const updates = new Map(pendingUpdates);
    updates.set(articleId, {});
    setPendingUpdates(updates);
    toast.info("Prepared to unlink article");
  };

  // Save all pending updates
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Array.from(pendingUpdates.entries());
      
      for (const [articleId, translations] of updates) {
        const { error } = await supabase
          .from("blog_articles")
          .update({ translations })
          .eq("id", articleId);
        
        if (error) throw error;
      }
      
      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["translation-linker-articles"] });
      setPendingUpdates(new Map());
      toast.success(`Successfully updated ${count} article${count > 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error(`Failed to save translations: ${error.message}`);
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Languages className="h-8 w-8" />
              Translation Linker
            </h1>
            <p className="text-muted-foreground">
              Link articles across languages for hreflang SEO
            </p>
          </div>
          {pendingUpdates.size > 0 && (
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              size="lg"
            >
              <Save className="mr-2 h-5 w-5" />
              Save {pendingUpdates.size} Update{pendingUpdates.size > 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Translation Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.linkedPercentage}%</span>
                  <Badge variant={stats.linkedPercentage > 50 ? "default" : "secondary"}>
                    {stats.articlesWithTranslations} / {stats.totalArticles}
                  </Badge>
                </div>
                <Progress value={stats.linkedPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Articles with at least one translation
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Translation Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.totalClusters}</span>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {stats.completelyLinked}
                    </Badge>
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {stats.incompleteLinked}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete vs. Incomplete clusters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Language Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{LANGUAGES.length} Languages</div>
                <div className="flex flex-wrap gap-1">
                  {LANGUAGES.map(lang => {
                    const count = articles?.filter(a => a.language === lang).length || 0;
                    return (
                      <Badge key={lang} variant="outline" className="text-xs">
                        {lang.toUpperCase()}: {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clusters or headlines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_NAMES[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incomplete"
                  checked={showIncompleteOnly}
                  onCheckedChange={(checked) => setShowIncompleteOnly(checked as boolean)}
                />
                <label
                  htmlFor="incomplete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show incomplete only
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clusters List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading articles...
            </CardContent>
          </Card>
        ) : filteredClusters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No clusters found matching your filters
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredClusters.map((cluster, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedCluster(selectedCluster === cluster.theme ? null : cluster.theme)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {cluster.theme}
                        <Badge variant={cluster.completeness === 100 ? "default" : "secondary"}>
                          {cluster.completeness}% Complete
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {cluster.articles.length} article{cluster.articles.length > 1 ? 's' : ''} across {new Set(cluster.articles.map(a => a.language)).size} language{new Set(cluster.articles.map(a => a.language)).size > 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        linkArticles(cluster.articles);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Link All
                    </Button>
                  </div>
                </CardHeader>

                {selectedCluster === cluster.theme && (
                  <CardContent className="border-t pt-4">
                    <div className="space-y-3">
                      {cluster.articles.map(article => {
                        const hasPendingUpdate = pendingUpdates.has(article.id);
                        const currentTranslations = hasPendingUpdate 
                          ? pendingUpdates.get(article.id)! 
                          : article.translations || {};
                        const translationCount = Object.keys(currentTranslations).length;
                        
                        return (
                          <div 
                            key={article.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary">
                                  {article.language.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{article.headline}</span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <code className="bg-muted px-1 py-0.5 rounded">{article.slug}</code>
                                {translationCount > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {translationCount} translation{translationCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {hasPendingUpdate && (
                                  <Badge variant="default" className="text-xs bg-amber-500">
                                    Pending Save
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => unlinkArticle(article.id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
