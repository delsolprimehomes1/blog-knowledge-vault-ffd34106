import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle2, Trash2, ExternalLink, Search, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ClusterData, getLanguageFlag } from "./types";
import { scanClusterForCompetitors, ClusterScanResult } from "@/lib/competitorDetection";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

interface DiscoveredCitation {
  url: string;
  source: string;
  context: string;
  verified: boolean;
  approved: boolean;
}

interface DiscoveryResult {
  articleId: string;
  headline: string;
  language: string;
  existingCitations: number;
  discoveredCitations: DiscoveredCitation[];
  error?: string;
}

interface DiscoveryResponse {
  success: boolean;
  articlesProcessed: number;
  totalDiscovered: number;
  totalVerified: number;
  totalApproved: number;
  duration: number;
  results: DiscoveryResult[];
}

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

// Helper to add citations to an article
const addCitationsToArticle = async (articleId: string, newCitations: Array<{ url: string; source: string; text: string }>) => {
  const { data: article, error: fetchError } = await supabase
    .from("blog_articles")
    .select("external_citations")
    .eq("id", articleId)
    .single();

  if (fetchError) throw fetchError;

  const existingCitations = (article.external_citations as any[]) || [];
  const combined = [...existingCitations, ...newCitations];

  const { error: updateError } = await supabase
    .from("blog_articles")
    .update({ external_citations: combined })
    .eq("id", articleId);

  if (updateError) throw updateError;
};

interface ClusterCitationsTabProps {
  cluster: ClusterData;
}

export const ClusterCitationsTab = ({ cluster }: ClusterCitationsTabProps) => {
  const queryClient = useQueryClient();
  
  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ClusterScanResult | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [removingCitations, setRemovingCitations] = useState<Set<string>>(new Set());
  
  // Discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResponse | null>(null);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState<Map<string, Set<string>>>(new Map());
  const [isApplying, setIsApplying] = useState(false);

  const handleScanCluster = async () => {
    setIsScanning(true);
    try {
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

      if (result.allCompetitors.length === 0) {
        toast.success("No competitors found in this cluster!");
      } else {
        toast.warning(`Found ${result.allCompetitors.length} competitor citations`);
      }
    } catch (error: any) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDiscoverCitations = async () => {
    setIsDiscovering(true);
    setDiscoveryResult(null);
    
    try {
      toast.info("Discovering citations via AI... This may take 1-2 minutes.");
      
      const { data, error } = await supabase.functions.invoke('discover-cluster-citations', {
        body: { cluster_id: cluster.cluster_id }
      });

      if (error) throw error;

      if (data.success) {
        setDiscoveryResult(data);
        setShowDiscoveryModal(true);
        
        // Initialize all verified+approved citations as selected
        const selections = new Map<string, Set<string>>();
        data.results.forEach((result: DiscoveryResult) => {
          const articleSelections = new Set<string>();
          result.discoveredCitations.forEach(citation => {
            if (citation.verified && citation.approved) {
              articleSelections.add(citation.url);
            }
          });
          if (articleSelections.size > 0) {
            selections.set(result.articleId, articleSelections);
          }
        });
        setSelectedCitations(selections);
        
        toast.success(`Discovered ${data.totalDiscovered} citations across ${data.articlesProcessed} articles`);
      } else {
        throw new Error(data.message || 'Discovery failed');
      }
    } catch (error: any) {
      toast.error(`Discovery failed: ${error.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleCitation = (articleId: string, url: string) => {
    setSelectedCitations(prev => {
      const next = new Map(prev);
      const articleSet = new Set(next.get(articleId) || []);
      
      if (articleSet.has(url)) {
        articleSet.delete(url);
      } else {
        articleSet.add(url);
      }
      
      if (articleSet.size > 0) {
        next.set(articleId, articleSet);
      } else {
        next.delete(articleId);
      }
      
      return next;
    });
  };

  const handleApplySelected = async () => {
    if (!discoveryResult) return;
    
    setIsApplying(true);
    let applied = 0;
    let failed = 0;
    
    try {
      for (const result of discoveryResult.results) {
        const selectedUrls = selectedCitations.get(result.articleId);
        if (!selectedUrls || selectedUrls.size === 0) continue;
        
        const citationsToAdd = result.discoveredCitations
          .filter(c => selectedUrls.has(c.url))
          .map(c => ({
            url: c.url,
            source: c.source,
            text: c.context,
          }));
        
        if (citationsToAdd.length > 0) {
          try {
            await addCitationsToArticle(result.articleId, citationsToAdd);
            applied += citationsToAdd.length;
          } catch {
            failed += citationsToAdd.length;
          }
        }
      }
      
      toast.success(`Applied ${applied} citations${failed > 0 ? `, ${failed} failed` : ""}`);
      setShowDiscoveryModal(false);
      setDiscoveryResult(null);
      setSelectedCitations(new Map());
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    } catch (error: any) {
      toast.error(`Failed to apply citations: ${error.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveSingleCitation = async (articleId: string, citationUrl: string) => {
    const key = `${articleId}-${citationUrl}`;
    setRemovingCitations((prev) => new Set(prev).add(key));

    try {
      await removeCompetitorFromArticle(articleId, citationUrl);
      
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

  const totalSelected = Array.from(selectedCitations.values()).reduce((sum, set) => sum + set.size, 0);

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_articles}</div>
          <div className="text-xs text-muted-foreground">Articles</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{Object.keys(cluster.languages).length}</div>
          <div className="text-xs text-muted-foreground">Languages</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">
            {scanResult ? scanResult.allCompetitors.length : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Competitors</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {discoveryResult ? discoveryResult.totalDiscovered : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Discovered</div>
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

      {/* Discovery Result Summary */}
      {discoveryResult && !showDiscoveryModal && (
        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <div>
              <span className="font-medium">
                {discoveryResult.totalDiscovered} citations discovered
              </span>
              <p className="text-sm text-muted-foreground">
                {discoveryResult.totalVerified} verified, {discoveryResult.totalApproved} from approved domains
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setShowDiscoveryModal(true)}
            >
              Review & Apply
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="default"
          size="sm"
          onClick={handleDiscoverCitations}
          disabled={isDiscovering || isScanning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isDiscovering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isDiscovering ? "Discovering..." : `Discover Citations (${cluster.total_articles} Articles)`}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleScanCluster}
          disabled={isScanning || isDiscovering}
        >
          {isScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldAlert className="mr-2 h-4 w-4" />
          )}
          Scan for Competitors
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

      {/* Discovery Modal */}
      <Dialog open={showDiscoveryModal} onOpenChange={setShowDiscoveryModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Citation Discovery Results
            </DialogTitle>
            <DialogDescription>
              Found {discoveryResult?.totalDiscovered || 0} citations across {discoveryResult?.articlesProcessed || 0} articles. 
              Select which citations to add.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {discoveryResult?.results.map((result) => (
                <Card key={result.articleId}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="outline">{getLanguageFlag(result.language)} {result.language.toUpperCase()}</Badge>
                      <span className="truncate">{result.headline}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {result.existingCitations} existing
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {result.discoveredCitations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No new citations found</p>
                    ) : (
                      <div className="space-y-2">
                        {result.discoveredCitations.map((citation, idx) => {
                          const isSelected = selectedCitations.get(result.articleId)?.has(citation.url) || false;
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border flex items-start gap-3 ${
                                isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30' : 'bg-muted/30'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCitation(result.articleId, citation.url)}
                                disabled={!citation.verified}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{citation.source}</span>
                                  {citation.verified ? (
                                    <Badge variant="outline" className="text-green-600 border-green-300">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> Unreachable
                                    </Badge>
                                  )}
                                  {citation.approved && (
                                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                                      Approved Domain
                                    </Badge>
                                  )}
                                </div>
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline truncate block"
                                >
                                  {citation.url}
                                </a>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {citation.context}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600 mt-2">Error: {result.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center gap-4 w-full">
              <span className="text-sm text-muted-foreground">
                {totalSelected} citations selected
              </span>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setShowDiscoveryModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplySelected}
                disabled={totalSelected === 0 || isApplying}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApplying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Apply {totalSelected} Citations
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
