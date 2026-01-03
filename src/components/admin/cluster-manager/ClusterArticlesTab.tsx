import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Globe, Link2, Loader2, AlertTriangle, ExternalLink, Search, Eye, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { ClusterData, getLanguageFlag } from "./types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const totalExpected = 60; // 6 articles × 10 languages
  const completionPercent = Math.round((cluster.total_articles / totalExpected) * 100);

  // Fetch actual articles for this cluster
  const { data: articles = [] } = useQuery({
    queryKey: ['cluster-articles', cluster.cluster_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, slug, language, status, funnel_stage')
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
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
};