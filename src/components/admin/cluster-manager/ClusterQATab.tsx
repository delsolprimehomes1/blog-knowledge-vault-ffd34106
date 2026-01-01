import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, HelpCircle, Loader2, PlayCircle, AlertTriangle } from "lucide-react";
import { ClusterData, getLanguageFlag, getAllExpectedLanguages } from "./types";

interface ClusterQATabProps {
  cluster: ClusterData;
  onPublishQAs: () => void;
  onGenerateQAs: (lang: string) => void;
  publishingQAs: string | null;
  generatingQALanguage: { clusterId: string; lang: string } | null;
}

export const ClusterQATab = ({
  cluster,
  onPublishQAs,
  onGenerateQAs,
  publishingQAs,
  generatingQALanguage,
}: ClusterQATabProps) => {
  const expectedLanguages = getAllExpectedLanguages(cluster);
  const totalExpectedQAs = cluster.total_articles * 4; // 4 QAs per article
  const isPublishing = publishingQAs === cluster.cluster_id;

  const getQAStatusForLanguage = (lang: string) => {
    const articleCount = cluster.languages[lang]?.total || 0;
    const expectedQAs = articleCount * 4;
    const actualQAs = cluster.qa_pages[lang]?.total || 0;
    const publishedQAs = cluster.qa_pages[lang]?.published || 0;

    return {
      articleCount,
      expectedQAs,
      actualQAs,
      publishedQAs,
      isComplete: actualQAs >= expectedQAs,
      allPublished: publishedQAs >= actualQAs && actualQAs > 0,
    };
  };

  const languagesNeedingQAs = expectedLanguages.filter((lang) => {
    const status = getQAStatusForLanguage(lang);
    return status.articleCount > 0 && !status.isComplete;
  });

  const draftQAsCount = cluster.total_qa_pages - cluster.total_qa_published;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_qa_pages}</div>
          <div className="text-xs text-muted-foreground">Total Q&As</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{cluster.total_qa_published}</div>
          <div className="text-xs text-muted-foreground">Published</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">{draftQAsCount}</div>
          <div className="text-xs text-muted-foreground">Draft</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.qa_completion_percent}%</div>
          <div className="text-xs text-muted-foreground">Complete</div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Q&A Generation Progress</span>
          <span className="font-medium">
            {cluster.total_qa_pages}/{totalExpectedQAs} Q&As
          </span>
        </div>
        <Progress value={cluster.qa_completion_percent} className="h-2" />
      </div>

      {/* Language-by-Language Q&A Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Q&As by Language</h4>
        <div className="grid grid-cols-5 gap-2">
          {expectedLanguages.map((lang) => {
            const status = getQAStatusForLanguage(lang);
            const isGenerating =
              generatingQALanguage?.clusterId === cluster.cluster_id &&
              generatingQALanguage?.lang === lang;

            return (
              <div
                key={lang}
                className={`p-2 rounded-lg border text-center relative ${
                  status.allPublished
                    ? "bg-green-50 border-green-200 dark:bg-green-950/30"
                    : status.isComplete
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30"
                    : status.articleCount === 0
                    ? "bg-gray-50 border-dashed border-gray-200 dark:bg-gray-800/50"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/30"
                }`}
              >
                <div className="text-lg">{getLanguageFlag(lang)}</div>
                <div className="text-sm font-medium">
                  {status.actualQAs}/{status.expectedQAs}
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.publishedQAs}P
                  {status.allPublished && " ✓"}
                </div>
                
                {/* Generate button for incomplete languages */}
                {status.articleCount > 0 && !status.isComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-1 -right-1 h-6 w-6 p-0 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => onGenerateQAs(lang)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <PlayCircle className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {languagesNeedingQAs.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              {languagesNeedingQAs.length} language(s) need Q&A generation:
            </span>
            <span className="text-amber-700 dark:text-amber-400 ml-1">
              {languagesNeedingQAs.map((l) => l.toUpperCase()).join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onPublishQAs}
          disabled={draftQAsCount === 0 || isPublishing}
        >
          {isPublishing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Publish All Q&As ({draftQAsCount} drafts)
        </Button>

        {languagesNeedingQAs.length > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={() => onGenerateQAs(languagesNeedingQAs[0])}
            disabled={generatingQALanguage !== null}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {generatingQALanguage ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <HelpCircle className="mr-2 h-4 w-4" />
            )}
            Generate Missing Q&As
          </Button>
        )}
      </div>
    </div>
  );
};
