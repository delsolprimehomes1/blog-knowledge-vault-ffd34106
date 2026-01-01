import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ClusterData, getLanguageFlag } from "./types";
import { scanClusterForCompetitors, ClusterScanResult } from "@/lib/competitorDetection";

// Helper to remove a competitor citation from an article
const removeCompetitorFromArticle = async (articleId: string, citationUrl: string) => {
  const { data: article, error: fetchError } = await supabase
    .from("blog_articles")
    .select("external_citations")
    .eq("id", articleId)
    .single();

  if (fetchError) throw fetchError;

  const citations = (article.external_citations as any[]) || [];
  const filtered = citations.filter((c: any) => c.url !== citationUrl);

  const { error: updateError } = await supabase
    .from("blog_articles")
    .update({ external_citations: filtered })
    .eq("id", articleId);

  if (updateError) throw updateError;
};

interface ClusterCitationsTabProps {
  cluster: ClusterData;
}

export const ClusterCitationsTab = ({ cluster }: ClusterCitationsTabProps) => {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ClusterScanResult | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [removingCitations, setRemovingCitations] = useState<Set<string>>(new Set());

  const handleScanCluster = async () => {
    setIsScanning(true);
    try {
      // Fetch all articles in cluster with their citations
      const { data: clusterArticles, error } = await supabase
        .from("blog_articles")
        .select("id, headline, language, external_citations")
        .eq("cluster_id", cluster.cluster_id);

      if (error) throw error;

      const articles = clusterArticles.map((article) => ({
        id: article.id,
        headline: article.headline,
        language: article.language,
        external_citations: article.external_citations as any[] | null,
      }));

      const result = scanClusterForCompetitors(articles);
      setScanResult(result);
      setShowScanModal(true);

      const competitorCount = result.allCompetitors.length;
      if (competitorCount === 0) {
        toast.success("No competitors found in this cluster!");
      } else {
        toast.warning(`Found ${competitorCount} competitor citations`);
      }
    } catch (error: any) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveSingleCitation = async (
    articleId: string,
    citationUrl: string
  ) => {
    const key = `${articleId}-${citationUrl}`;
    setRemovingCitations((prev) => new Set(prev).add(key));

    try {
      await removeCompetitorFromArticle(articleId, citationUrl);
      
      // Update local state
      if (scanResult) {
        const updated = {
          ...scanResult,
          allCompetitors: scanResult.allCompetitors.filter(
            (c) => !(c.articleId === articleId && c.citation.url === citationUrl)
          ),
        };
        setScanResult(updated);
      }

      toast.success("Competitor citation removed");
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    } catch (error: any) {
      toast.error(`Failed to remove: ${error.message}`);
    } finally {
      setRemovingCitations((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRemoveAllCompetitors = async () => {
    if (!scanResult || scanResult.allCompetitors.length === 0) return;

    const toRemove = scanResult.allCompetitors;
    let removed = 0;
    let failed = 0;

    for (const item of toRemove) {
      try {
        await removeCompetitorFromArticle(item.articleId, item.citation.url);
        removed++;
      } catch {
        failed++;
      }
    }

    toast.success(`Removed ${removed} competitor citations${failed > 0 ? `, ${failed} failed` : ""}`);
    
    setScanResult(null);
    setShowScanModal(false);
    queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_articles}</div>
          <div className="text-xs text-muted-foreground">Articles to Scan</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{Object.keys(cluster.languages).length}</div>
          <div className="text-xs text-muted-foreground">Languages</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">
            {scanResult ? scanResult.allCompetitors.length : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Competitors Found</div>
        </div>
      </div>

      {/* Last Scan Result Summary */}
      {scanResult && (
        <div
          className={`p-3 rounded-lg border ${
            scanResult.allCompetitors.length === 0
              ? "bg-green-50 border-green-200 dark:bg-green-950/30"
              : "bg-red-50 border-red-200 dark:bg-red-950/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {scanResult.allCompetitors.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <span className="font-medium">
                {scanResult.allCompetitors.length === 0
                  ? "All clear!"
                  : `${scanResult.allCompetitors.length} competitor citations found`}
              </span>
              <p className="text-sm text-muted-foreground">
                Scanned {scanResult.totalArticles} articles, {scanResult.totalCitations} citations
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="default"
          size="sm"
          onClick={handleScanCluster}
          disabled={isScanning}
          className="bg-amber-500 hover:bg-amber-600"
        >
          {isScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldAlert className="mr-2 h-4 w-4" />
          )}
          Scan All ({cluster.total_articles} Articles)
        </Button>

        {scanResult && scanResult.allCompetitors.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveAllCompetitors}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove All ({scanResult.allCompetitors.length})
          </Button>
        )}
      </div>

      {/* Scan Results Modal */}
      <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Cluster-Wide Competitor Scan
            </DialogTitle>
            <DialogDescription>
              Scanned {scanResult?.totalArticles || 0} articles, {scanResult?.totalCitations || 0} citations
            </DialogDescription>
          </DialogHeader>

          {scanResult && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* By Language Summary */}
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(scanResult.byLanguage).map(([lang, stats]) => (
                    <div
                      key={lang}
                      className={`p-2 rounded-lg border text-center ${
                        stats.competitorCount === 0
                          ? "bg-green-50 border-green-200 dark:bg-green-950/30"
                          : "bg-red-50 border-red-200 dark:bg-red-950/30"
                      }`}
                    >
                      <div className="text-lg">{getLanguageFlag(lang)}</div>
                      <div className="text-sm">
                        {stats.citationCount} citations
                      </div>
                      <div
                        className={`text-xs ${
                          stats.competitorCount === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.competitorCount} competitors
                        {stats.competitorCount === 0 && " ✓"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Competitors List */}
                {scanResult.allCompetitors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        Competitor Citations ({scanResult.allCompetitors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Language</TableHead>
                            <TableHead>Article</TableHead>
                            <TableHead>Competitor Domain</TableHead>
                            <TableHead className="w-[100px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scanResult.allCompetitors.map((item, idx) => {
                            const key = `${item.articleId}-${item.citation.url}`;
                            const isRemoving = removingCitations.has(key);
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Badge variant="outline">
                                    {getLanguageFlag(item.language)} {item.language.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {item.articleHeadline}
                                </TableCell>
                                <TableCell>
                                  <a
                                    href={item.citation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-600 hover:underline flex items-center gap-1"
                                  >
                                    {item.citation.domain}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveSingleCitation(
                                        item.articleId,
                                        item.citation.url
                                      )
                                    }
                                    disabled={isRemoving}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    {isRemoving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {scanResult.allCompetitors.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                    <p className="font-medium">No competitor citations found!</p>
                    <p className="text-sm">This cluster is citation-safe.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
