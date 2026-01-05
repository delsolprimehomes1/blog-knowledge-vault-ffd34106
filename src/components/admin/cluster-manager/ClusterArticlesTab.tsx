import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Globe, Link2, Loader2, AlertTriangle, ExternalLink, Search, Eye, Edit, Sparkles, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { ClusterData, getLanguageFlag } from "./types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClusterArticlesTabProps {
  cluster: ClusterData;
  onPublish: () => void;
  onTranslate: () => void;
  onRegenerateLinks: () => void;
  isPublishing: boolean;
  isTranslating: boolean;
  isRegeneratingLinks: boolean;
  missingLanguages: string[];
  incompleteLanguages: { lang: string; count: number }[];
  sourceInfo: { sourceLanguage: string; sourceCount: number; needsMoreSource: boolean };
}

export const ClusterArticlesTab = ({
  cluster,
  onPublish,
  onTranslate,
  onRegenerateLinks,
  isPublishing,
  isTranslating,
  isRegeneratingLinks,
  missingLanguages,
  incompleteLanguages,
  sourceInfo,
}: ClusterArticlesTabProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  
  // Citation discovery state
  const [discoveringArticle, setDiscoveringArticle] = useState<string | null>(null);
  const [discoveredCitations, setDiscoveredCitations] = useState<any[]>([]);
  const [showCitationsModal, setShowCitationsModal] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [selectedCitations, setSelectedCitations] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  
  // Generate missing articles state
  const [isGeneratingMissing, setIsGeneratingMissing] = useState(false);

  const totalExpected = 60; // 6 articles × 10 languages
  const completionPercent = Math.round((cluster.total_articles / totalExpected) * 100);

  // Fetch actual articles for this cluster
  const { data: articles = [] } = useQuery({
    queryKey: ['cluster-articles', cluster.cluster_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, slug, language, status, funnel_stage, detailed_content, external_citations')
        .eq('cluster_id', cluster.cluster_id)
        .order('language')
        .order('funnel_stage');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Filter articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.headline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewLive = (article: { language: string; slug: string }) => {
    const langPrefix = article.language === 'en' ? '' : `/${article.language}`;
    window.open(`https://www.delsolprimehomes.com${langPrefix}/blog/${article.slug}`, '_blank');
  };

  const handleDiscoverCitations = async (article: any) => {
    setDiscoveringArticle(article.id);
    setCurrentArticle(article);
    
    try {
      toast.info("Finding citations via AI... This takes 10-30 seconds.");
      
      const { data, error } = await supabase.functions.invoke('find-citations-perplexity', {
        body: { 
          articleTopic: article.headline,
          articleLanguage: article.language,
          articleContent: article.detailed_content?.substring(0, 5000) || '',
          currentCitations: article.external_citations || []
        }
      });
      
      if (error) throw error;
      
      if (data.success && data.citations?.length > 0) {
        setDiscoveredCitations(data.citations);
        setSelectedCitations(new Set(data.citations.map((c: any) => c.url)));
        setShowCitationsModal(true);
        toast.success(`Found ${data.citations.length} citations!`);
      } else {
        toast.info(data.message || "No new citations found for this article");
      }
    } catch (error: any) {
      console.error('Citation discovery failed:', error);
      toast.error(`Discovery failed: ${error.message}`);
    } finally {
      setDiscoveringArticle(null);
    }
  };

  const toggleCitation = (url: string) => {
    setSelectedCitations(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleApplyCitations = async () => {
    if (!currentArticle || selectedCitations.size === 0) return;
    
    setIsApplying(true);
    try {
      const citationsToAdd = discoveredCitations
        .filter(c => selectedCitations.has(c.url))
        .map(c => ({
          url: c.url,
          source: c.sourceName || c.source,
          text: c.relevance || c.suggestedContext || ''
        }));
      
      const existing = (currentArticle.external_citations as any[]) || [];
      const combined = [...existing, ...citationsToAdd];
      
      const { error } = await supabase
        .from('blog_articles')
        .update({ external_citations: combined })
        .eq('id', currentArticle.id);
      
      if (error) throw error;
      
      toast.success(`Added ${citationsToAdd.length} citations to article`);
      setShowCitationsModal(false);
      setDiscoveredCitations([]);
      setSelectedCitations(new Set());
      setCurrentArticle(null);
      
      // Refetch articles
      queryClient.invalidateQueries({ queryKey: ['cluster-articles', cluster.cluster_id] });
    } catch (error: any) {
      toast.error(`Failed to apply citations: ${error.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Calculate missing articles count
  const getMissingCount = () => {
    const sourceArticles = articles.filter(a => a.language === sourceInfo.sourceLanguage);
    return 6 - sourceArticles.length;
  };

  const handleGenerateMissing = async () => {
    setIsGeneratingMissing(true);
    try {
      toast.info("Generating missing article(s)... This may take 1-2 minutes.");
      
      const { data, error } = await supabase.functions.invoke('generate-missing-articles', {
        body: { clusterId: cluster.cluster_id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Generated ${data.generated} missing article(s)!`);
        queryClient.invalidateQueries({ queryKey: ['cluster-articles', cluster.cluster_id] });
        queryClient.invalidateQueries({ queryKey: ['clusters-unified'] });
      } else {
        toast.error(data.error || "Failed to generate missing articles");
      }
    } catch (error: any) {
      console.error('Generate missing failed:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsGeneratingMissing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_articles}</div>
          <div className="text-xs text-muted-foreground">Total Articles</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {Object.values(cluster.languages).reduce((sum, l) => sum + l.published, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Published</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">
            {Object.values(cluster.languages).reduce((sum, l) => sum + l.draft, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Draft</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{Object.keys(cluster.languages).length}/10</div>
          <div className="text-xs text-muted-foreground">Languages</div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Cluster Completion</span>
          <span className="font-medium">{completionPercent}% ({cluster.total_articles}/{totalExpected})</span>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </div>

      {/* Language Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Articles by Language</h4>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(cluster.languages).map(([lang, stats]) => (
            <div
              key={lang}
              className={`p-2 rounded-lg border text-center ${
                stats.published === stats.total
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30"
                  : "bg-muted/50"
              }`}
            >
              <div className="text-lg">{getLanguageFlag(lang)}</div>
              <div className="text-sm font-medium">{stats.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.published}P / {stats.draft}D
              </div>
            </div>
          ))}
          {missingLanguages.map((lang) => (
            <div
              key={lang}
              className="p-2 rounded-lg border border-dashed border-red-200 text-center bg-red-50/50 dark:bg-red-950/20"
            >
              <div className="text-lg opacity-50">{getLanguageFlag(lang)}</div>
              <div className="text-sm font-medium text-red-500">0</div>
              <div className="text-xs text-red-400">Missing</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 pt-2 border-t">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      {filteredArticles.length > 0 && (
        <ScrollArea className="h-[200px] border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md group"
              >
                <span className="text-lg shrink-0">{getLanguageFlag(article.language)}</span>
                <span className="flex-1 text-sm truncate">{article.headline}</span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {article.funnel_stage}
                </Badge>
                <Badge 
                  variant={article.status === 'published' ? 'default' : 'secondary'}
                  className="shrink-0 text-xs"
                >
                  {article.status}
                </Badge>
                {Array.isArray(article.external_citations) && article.external_citations.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="shrink-0 h-5 px-1.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    title={`${article.external_citations.length} approved citation(s)`}
                  >
                    🔗 {article.external_citations.length}
                  </Badge>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDiscoverCitations(article)}
                    disabled={discoveringArticle === article.id}
                    title="Find Citations"
                  >
                    {discoveringArticle === article.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Link to={`/admin/articles/${article.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  {article.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleViewLive(article)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Warnings */}
      {(sourceInfo.needsMoreSource || incompleteLanguages.length > 0) && (
        <div className="space-y-2">
          {sourceInfo.needsMoreSource && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  Source language ({sourceInfo.sourceLanguage.toUpperCase()}) incomplete:
                </span>
                <span className="text-amber-700 dark:text-amber-400 ml-1">
                  {sourceInfo.sourceCount}/6 articles. Add more before translating.
                </span>
              </div>
            </div>
          )}
          {incompleteLanguages.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  Incomplete translations:
                </span>
                <span className="text-amber-700 dark:text-amber-400 ml-1">
                  {incompleteLanguages.map((l) => `${l.lang.toUpperCase()} (${l.count}/6)`).join(", ")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {sourceInfo.needsMoreSource && (
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateMissing}
            disabled={isGeneratingMissing}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isGeneratingMissing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Generate Missing ({getMissingCount()})
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onPublish}
          disabled={cluster.all_published || isPublishing}
        >
          {isPublishing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Publish All Articles
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onTranslate}
          disabled={(missingLanguages.length === 0 && incompleteLanguages.length === 0) || isTranslating || sourceInfo.needsMoreSource}
        >
          {isTranslating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Globe className="mr-2 h-4 w-4" />
          )}
          Complete Translations ({missingLanguages.length + incompleteLanguages.length} incomplete)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerateLinks}
          disabled={isRegeneratingLinks}
        >
          {isRegeneratingLinks ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          Regenerate Links
        </Button>

        <Link to={`/admin/articles?cluster=${cluster.cluster_id}`}>
          <Button variant="ghost" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            View All Articles
          </Button>
        </Link>
      </div>

      {/* Citations Discovery Modal */}
      <Dialog open={showCitationsModal} onOpenChange={setShowCitationsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Discovered Citations
            </DialogTitle>
            <DialogDescription>
              Found {discoveredCitations.length} authoritative citations for "{currentArticle?.headline}". 
              Select which ones to add.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {discoveredCitations.map((citation, idx) => {
                const isSelected = selectedCitations.has(citation.url);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-start gap-3 ${
                      isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30' : 'bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCitation(citation.url)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{citation.sourceName || 'Source'}</span>
                        {citation.tier && (
                          <Badge variant="outline" className="text-xs">
                            {citation.tier}
                          </Badge>
                        )}
                        {citation.diversityScore !== undefined && (
                          <Badge 
                            variant={citation.diversityScore >= 60 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            Diversity: {citation.diversityScore}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {citation.relevance || citation.suggestedContext}
                      </p>
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {citation.url}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCitationsModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyCitations}
              disabled={selectedCitations.size === 0 || isApplying}
            >
              {isApplying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Add {selectedCitations.size} Citation{selectedCitations.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
