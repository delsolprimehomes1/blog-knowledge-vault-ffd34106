import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Globe, Link2, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { ClusterData, getLanguageFlag } from "./types";

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
  const totalExpected = 60; // 6 articles × 10 languages
  const completionPercent = Math.round((cluster.total_articles / totalExpected) * 100);

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
          disabled={missingLanguages.length === 0 || isTranslating || sourceInfo.needsMoreSource}
        >
          {isTranslating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Globe className="mr-2 h-4 w-4" />
          )}
          Complete Translations ({missingLanguages.length} missing)
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
