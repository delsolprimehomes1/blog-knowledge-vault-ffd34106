import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Eye, Trash2, CheckCircle, Loader2, Globe, Link2, Shield, HelpCircle, FileCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ClusterData, getLanguageFlag, getMissingLanguages, getSourceLanguageInfo, getIncompleteLanguages } from "./types";
import { ClusterArticlesTab } from "./ClusterArticlesTab";
import { ClusterQATab } from "./ClusterQATab";
import { ClusterCitationsTab } from "./ClusterCitationsTab";
import { ClusterSEOTab } from "./ClusterSEOTab";
import { ClusterHreflangTab } from "./ClusterHreflangTab";

interface TranslationProgress {
  current: string;
  remaining: number;
  articlesCompleted?: number;
  totalArticles?: number;
}

interface ClusterCardProps {
  cluster: ClusterData;
  onPublish: (clusterId: string) => void;
  onDelete: (clusterId: string) => void;
  onPublishQAs: (clusterId: string) => void;
  onTranslate: (clusterId: string) => void;
  onRegenerateLinks: (clusterId: string) => void;
  onSEOAudit: (clusterId: string) => void;
  onGenerateQAs: (clusterId: string, lang: string) => void;
  isPublishing: boolean;
  isDeleting: boolean;
  isTranslating: boolean;
  isRegeneratingLinks: boolean;
  isAuditing: boolean;
  generatingQALanguage: { clusterId: string; lang: string } | null;
  publishingQAs: string | null;
  translationProgress?: TranslationProgress | null;
}

export const ClusterCard = ({
  cluster,
  onPublish,
  onDelete,
  onPublishQAs,
  onTranslate,
  onRegenerateLinks,
  onSEOAudit,
  onGenerateQAs,
  isPublishing,
  isDeleting,
  isTranslating,
  isRegeneratingLinks,
  isAuditing,
  generatingQALanguage,
  publishingQAs,
  translationProgress,
}: ClusterCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("articles");
  const navigate = useNavigate();

  const copyClusterId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Cluster ID copied to clipboard");
  };

  const getStatusBadge = () => {
    if (cluster.all_published) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Published</Badge>;
    }
    if (cluster.all_draft) {
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Mixed</Badge>;
  };

  const getJobStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
      case "partial":
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Partial</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-600 border-red-600">Failed</Badge>;
      case "generating":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Generating</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const missingLanguages = getMissingLanguages(cluster);
  const incompleteLanguages = getIncompleteLanguages(cluster);
  const sourceInfo = getSourceLanguageInfo(cluster);

  return (
    <Card className="transition-all hover:shadow-md">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Collapsed Header */}
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Expand icon + Theme + Status */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="pt-1">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate max-w-[400px]">
                        {cluster.cluster_theme || "Untitled Cluster"}
                      </h3>
                      {getStatusBadge()}
                      {getJobStatusBadge(cluster.job_status)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{cluster.cluster_id.slice(0, 8)}...</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyClusterId(cluster.cluster_id);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <span>•</span>
                      <span>{cluster.total_articles} articles</span>
                      <span>•</span>
                      <span>QAs: {cluster.total_qa_published}P/{cluster.total_qa_pages}T ({cluster.qa_completion_percent}%)</span>
                      <span>•</span>
                      <span>{new Date(cluster.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSEOAudit(cluster.cluster_id)}
                    disabled={isAuditing}
                  >
                    {isAuditing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileCheck className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/clusters/${cluster.cluster_id}/audit`)}
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPublish(cluster.cluster_id)}
                    disabled={cluster.all_published || isPublishing}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(cluster.cluster_id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Language Grid (always visible) */}
              <div className="flex flex-wrap gap-2 mt-3 pl-8">
                {Object.entries(cluster.languages).map(([lang, stats]) => {
                  const qaStats = cluster.qa_pages[lang];
                  const expectedQAs = stats.total * 4;
                  const qaComplete = qaStats && qaStats.total >= expectedQAs;
                  
                  return (
                    <Badge
                      key={lang}
                      variant="outline"
                      className={`text-xs ${
                        stats.published === stats.total && qaComplete
                          ? "bg-green-50 border-green-300 dark:bg-green-950/30"
                          : stats.published > 0
                          ? "bg-amber-50 border-amber-300 dark:bg-amber-950/30"
                          : "bg-gray-50 border-gray-300 dark:bg-gray-800"
                      }`}
                    >
                      {getLanguageFlag(lang)} {stats.total}
                      {qaStats && (
                        <span className="ml-1 text-muted-foreground">
                          |{qaStats.published}P/{qaStats.total}T
                        </span>
                      )}
                      {stats.published === stats.total && qaComplete && " ✓"}
                    </Badge>
                  );
                })}
                {missingLanguages.slice(0, 3).map((lang) => (
                  <Badge
                    key={lang}
                    variant="outline"
                    className="text-xs bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30"
                  >
                    {getLanguageFlag(lang)} 0
                  </Badge>
                ))}
                {missingLanguages.length > 3 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{missingLanguages.length - 3} missing
                  </Badge>
                )}
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="border-t">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-3 border-b bg-muted/30">
                <TabsList className="grid w-full grid-cols-5 h-9">
                  <TabsTrigger value="articles" className="text-xs">
                    📝 Articles
                  </TabsTrigger>
                  <TabsTrigger value="qa" className="text-xs">
                    ❓ Q&A
                  </TabsTrigger>
                  <TabsTrigger value="citations" className="text-xs">
                    🔗 Citations
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="text-xs">
                    📊 SEO
                  </TabsTrigger>
                  <TabsTrigger value="hreflang" className="text-xs">
                    🌐 Hreflang
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4">
                <TabsContent value="articles" className="mt-0">
                  <ClusterArticlesTab
                    cluster={cluster}
                    onPublish={() => onPublish(cluster.cluster_id)}
                    onTranslate={() => onTranslate(cluster.cluster_id)}
                    onRegenerateLinks={() => onRegenerateLinks(cluster.cluster_id)}
                    isPublishing={isPublishing}
                    isTranslating={isTranslating}
                    isRegeneratingLinks={isRegeneratingLinks}
                    missingLanguages={missingLanguages}
                    incompleteLanguages={incompleteLanguages}
                    sourceInfo={sourceInfo}
                    translationProgress={translationProgress}
                  />
                </TabsContent>

                <TabsContent value="qa" className="mt-0">
                  <ClusterQATab
                    cluster={cluster}
                    onPublishQAs={() => onPublishQAs(cluster.cluster_id)}
                    onGenerateQAs={(lang) => onGenerateQAs(cluster.cluster_id, lang)}
                    publishingQAs={publishingQAs}
                    generatingQALanguage={generatingQALanguage}
                  />
                </TabsContent>

                <TabsContent value="citations" className="mt-0">
                  <ClusterCitationsTab cluster={cluster} />
                </TabsContent>

                <TabsContent value="seo" className="mt-0">
                  <ClusterSEOTab
                    cluster={cluster}
                    onAudit={() => onSEOAudit(cluster.cluster_id)}
                    isAuditing={isAuditing}
                  />
                </TabsContent>

                <TabsContent value="hreflang" className="mt-0">
                  <ClusterHreflangTab cluster={cluster} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
