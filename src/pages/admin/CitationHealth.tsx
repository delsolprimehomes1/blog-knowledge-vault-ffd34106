import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity, AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw,
  TrendingDown, TrendingUp, XCircle, Clock, ArrowRight, ThumbsUp, ThumbsDown, Play, Undo2
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChangePreviewModal } from "@/components/admin/ChangePreviewModal";
import { BulkReplacementDialog } from "@/components/admin/BulkReplacementDialog";
import { CitationHealthAnalysis } from "@/components/admin/CitationHealthAnalysis";
import { ApprovedDomainsTab } from "@/components/admin/ApprovedDomainsTab";
import { Progress } from "@/components/ui/progress";

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface CitationHealth {
  id: string;
  url: string;
  source_name: string;
  last_checked_at: string | null;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable' | null;
  http_status_code: number | null;
  response_time_ms: number;
  redirect_url: string | null;
  times_verified: number;
  times_failed: number;
}

interface DeadLinkReplacement {
  id: string;
  original_url: string;
  original_source: string;
  replacement_url: string;
  replacement_source: string;
  replacement_reason: string;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'rolled_back';
  created_at: string;
  applied_at?: string;
  applied_to_articles?: string[];
  replacement_count?: number;
}

const CitationHealth = () => {
  const queryClient = useQueryClient();
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixProgress, setAutoFixProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [selectedReplacements, setSelectedReplacements] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<{
    replacement: DeadLinkReplacement;
    affectedArticles: any[];
  } | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [batchSize, setBatchSize] = useState<number>(5);

  // Debounced refetch to avoid excessive updates
  const debouncedRefetch = useMemo(
    () => debounce(() => {
      queryClient.refetchQueries({ queryKey: ["citation-health"] });
      queryClient.refetchQueries({ queryKey: ["citation-health-stats"] });
    }, 500),
    [queryClient]
  );

  // Real-time subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('citation-health-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_citation_health'
        },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedRefetch]);

  // Server-side stats for accurate counts (bypasses 1000 row limit)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["citation-health-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_citation_health_stats");
      if (error) throw error;
      return data as { 
        total: number; 
        healthy: number; 
        broken: number; 
        unreachable: number;
        redirected: number;
        slow: number;
        unchecked: number 
      };
    },
  });

  // Table data with corrected ordering (checked items first)
  const { data: healthData, isLoading, isFetching } = useQuery({
    queryKey: ["citation-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_citation_health")
        .select("*")
        .order("status", { ascending: true, nullsFirst: false })
        .order("last_checked_at", { ascending: false });
      if (error) throw error;
      return data as CitationHealth[];
    },
  });

  const { data: replacements } = useQuery({
    queryKey: ["dead-link-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dead_link_replacements").select("*").in("status", ["pending", "suggested"]).order("confidence_score", { ascending: false });
      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  const { data: approvedReplacements } = useQuery({
    queryKey: ["approved-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dead_link_replacements").select("*").eq("status", "approved").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  const { data: appliedReplacements } = useQuery({
    queryKey: ["applied-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dead_link_replacements").select("*").eq("status", "applied").order("applied_at", { ascending: false });
      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  const syncCitationHealth = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-citation-health', {
        body: {}
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Sync complete! Removed ${data.staleEntriesDeleted} stale entries, added ${data.newHealthRecordsCreated} new records.`
      );
      queryClient.refetchQueries({ queryKey: ['citation-health'] });
      queryClient.refetchQueries({ queryKey: ['citation-health-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dead-link-replacements'] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  const runHealthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-citation-health");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const problemCount = (data?.broken || 0) + (data?.unreachable || 0);
      const remaining = data?.remaining || 0;
      
      if (remaining > 0) {
        toast.success(`Batch complete! ${data.checked} checked, ${remaining} remaining`, { 
          description: `Found ${data.healthy || 0} healthy, ${problemCount} broken. Click again to continue.` 
        });
      } else {
        toast.success("All citations checked!", { 
          description: `Found ${data.healthy || 0} healthy, ${problemCount} broken links.` 
        });
      }
      queryClient.refetchQueries({ queryKey: ["citation-health"] });
      queryClient.refetchQueries({ queryKey: ["citation-health-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Health check failed: ${error.message}`);
    }
  });

  const approveReplacement = useMutation({
    mutationFn: async (replacementId: string) => {
      const { error } = await supabase.from("dead_link_replacements").update({ status: "approved" }).eq("id", replacementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replacement approved");
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
      queryClient.invalidateQueries({ queryKey: ["approved-replacements"] });
    },
  });

  const rejectReplacement = useMutation({
    mutationFn: async (replacementId: string) => {
      const { error } = await supabase.from("dead_link_replacements").update({ status: "rejected" }).eq("id", replacementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replacement rejected");
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
    },
  });

  const applyReplacement = useMutation({
    mutationFn: async (replacementIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("apply-citation-replacement", { body: { replacementIds, preview: false } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Replacements applied!", { description: `Updated ${data.articlesUpdated} articles` });
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements", "approved-replacements", "applied-replacements"] });
      setSelectedReplacements([]);
      setPreviewOpen(false);
    },
  });

  const getPreview = async (replacement: DeadLinkReplacement) => {
    try {
      const { data, error } = await supabase.functions.invoke("apply-citation-replacement", { body: { replacementIds: [replacement.id], preview: true } });
      if (error) throw error;
      setCurrentPreview({ replacement, affectedArticles: data.affectedArticles || [] });
      setPreviewOpen(true);
    } catch (error) {
      toast.error("Failed to generate preview");
    }
  };

  const handleBulkApply = async () => {
    if (selectedReplacements.length === 0) return;
    setBulkDialogOpen(true);
    setBulkProgress(0);
    try {
      const { data } = await supabase.functions.invoke("apply-citation-replacement", { body: { replacementIds: selectedReplacements, preview: false } });
      setBulkResults(data.results || []);
      setBulkProgress(100);
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements", "approved-replacements", "applied-replacements"] });
      queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
      queryClient.invalidateQueries({ queryKey: ['article-revisions'] });
      setSelectedReplacements([]);
    } catch (error) {
      toast.error("Bulk application failed");
    }
  };

  // Auto-fix broken links with intelligent Perplexity-powered placement
  const autoFixBrokenLinks = useMutation({
    mutationFn: async () => {
      setIsAutoFixing(true);
      setAutoFixProgress({ current: 0, total: 100, message: 'Initializing intelligent citation enhancement...' });
      
      const { data, error } = await supabase.functions.invoke('auto-enhance-citations', {
        body: {
          mode: 'fix_broken',
          auto_apply: true,
          use_approved_domains_only: true,
          diversity_threshold: 20,
          max_citations_per_article: 5,
          limit: batchSize,
          max_articles: Math.ceil(batchSize / 2)
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      setIsAutoFixing(false);
      setAutoFixProgress(null);
      
      if (result.success) {
        const remaining = stats.broken - (result.citationsAdded || 0);
        toast.success(`✨ Fixed ${result.citationsAdded || 0} broken links!`, {
          description: `Enhanced ${result.articlesUpdated} articles. ${remaining > 0 ? `${remaining} broken links remaining - run again to fix more.` : 'All broken links fixed!'}`,
          duration: 6000
        });
      }

      queryClient.invalidateQueries({ queryKey: ['citation-health'] });
      queryClient.invalidateQueries({ queryKey: ['dead-link-replacements'] });
      queryClient.invalidateQueries({ queryKey: ['approved-domains'] });
      queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
      queryClient.invalidateQueries({ queryKey: ['article-revisions'] });
    },
    onError: () => {
      setIsAutoFixing(false);
      setAutoFixProgress(null);
      toast.error("Auto-fix failed - try a smaller batch size");
    }
  });

  const handleFindReplacement = async (url: string) => {
    try {
      setIsAutoFixing(true);
      toast.info("Finding approved replacement...", { duration: 2000 });

      // Find article using this citation
      const { data: articles, error: articlesError } = await supabase.rpc('find_articles_with_citation', {
        citation_url: url,
        published_only: true
      });

      if (articlesError) throw articlesError;

      if (!articles || articles.length === 0) {
        toast.error("No published articles found with this citation");
        return;
      }

      const article = articles[0];

      // Call new auto-replace function
      const { data, error } = await supabase.functions.invoke('auto-replace-citation', {
        body: {
          brokenUrl: url,
          articleId: article.id,
          articleHeadline: article.headline,
          articleContent: article.detailed_content,
          articleLanguage: article.language
        }
      });

      if (error) throw error;

      if (!data.success) {
        // Handle domain not approved case specifically
        if (data.error === 'domain_not_approved') {
          toast.error('Domain Not Approved', {
            description: `The AI suggested ${data.suggestedDomain}, but it's not in your approved domains. Please add it to the Approved Domains list first.`,
            duration: 8000
          });
          return;
        }
        throw new Error(data.error || 'Replacement failed');
      }

      // Show success with details
      toast.success('Citation replaced automatically!', {
        description: `Replaced with ${data.replacementDomain} (Trust: ${data.trustScore}/10, Score: ${data.finalScore})`,
        duration: 6000
      });

      // Refresh data - including article content
      queryClient.invalidateQueries({ queryKey: ['citation-health'] });
      queryClient.invalidateQueries({ queryKey: ['domain-usage'] });
      queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
      queryClient.invalidateQueries({ queryKey: ['article-revisions'] });

    } catch (error) {
      console.error('Auto-replace failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to replace citation");
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Use server-side stats for accurate counts
  const stats = statsData || { total: 0, healthy: 0, broken: 0, unchecked: 0 };

  const checkedCount = stats.total - stats.unchecked;
  const healthPercentage = checkedCount > 0 ? Math.round((stats.healthy / checkedCount) * 100) : 0;

  const getStatusBadge = (status: CitationHealth['status']) => {
    if (status === null) return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Unchecked</Badge>;
    if (status === 'healthy') return <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Healthy</Badge>;
    if (status === 'broken') return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Broken</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (isLoading || statsLoading) return <AdminLayout><div className="container mx-auto p-6"><Loader2 className="h-8 w-8 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold">Citation Health</h1>
              <p className="text-muted-foreground">Monitor external citations and manage replacements</p>
            </div>
            {isFetching && !isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Updating...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => syncCitationHealth.mutate()}
              disabled={syncCitationHealth.isPending}
              variant="outline"
            >
              {syncCitationHealth.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-Sync Data
                </>
              )}
            </Button>
            <div className="flex items-center gap-2">
              <Select value={batchSize.toString()} onValueChange={(v) => setBatchSize(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => autoFixBrokenLinks.mutate()}
                disabled={autoFixBrokenLinks.isPending || stats.broken === 0}
                variant="default"
              >
                {autoFixBrokenLinks.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fixing {batchSize}...</>
                ) : (
                  <>🔧 Auto-Fix ({batchSize})</>
                )}
              </Button>
            </div>
            <Button 
              onClick={() => { setIsRunningCheck(true); runHealthCheck.mutateAsync().finally(() => setIsRunningCheck(false)); }} 
              disabled={isRunningCheck}
            >
              {isRunningCheck ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</> : <><RefreshCw className="mr-2 h-4 w-4" />Run Health Check</>}
            </Button>
          </div>
        </div>

        {stats.unchecked > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Citations Need Health Check</AlertTitle>
            <AlertDescription>
              {stats.unchecked.toLocaleString()} citations have never been verified. Click "Run Health Check" to verify their status.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Citations</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total.toLocaleString()}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Unchecked</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{stats.unchecked.toLocaleString()}</div><p className="text-xs text-muted-foreground mt-1">Never verified</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{healthPercentage}%</div><p className="text-xs text-muted-foreground mt-1">{stats.healthy.toLocaleString()} of {checkedCount.toLocaleString()} checked</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Needs Attention</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.broken}</div><p className="text-xs text-muted-foreground mt-1">Broken or unreachable</p></CardContent></Card>
        </div>

        {healthData && healthData.length > 0 && (
          <CitationHealthAnalysis 
            healthData={healthData} 
            onFindReplacement={handleFindReplacement}
            serverStats={statsData}
          />
        )}

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({replacements?.length || 0})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedReplacements?.length || 0})</TabsTrigger>
            <TabsTrigger value="applied">Applied ({appliedReplacements?.length || 0})</TabsTrigger>
            <TabsTrigger value="domains">Approved Domains</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {replacements && replacements.length > 0 ? (
              <Card><CardContent className="pt-6 space-y-4">
                {replacements.map(r => (
                  <Card key={r.id}><CardContent className="pt-4 flex justify-between">
                    <div><p className="text-sm text-red-600 truncate">{r.original_url}</p><p className="text-sm text-green-600">→ {r.replacement_url}</p></div>
                    <div className="flex gap-2"><Button size="sm" onClick={() => approveReplacement.mutate(r.id)}><ThumbsUp className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => rejectReplacement.mutate(r.id)}><ThumbsDown className="h-4 w-4" /></Button></div>
                  </CardContent></Card>
                ))}
              </CardContent></Card>
            ) : <Card><CardContent className="py-12 text-center text-muted-foreground">No pending replacements</CardContent></Card>}
          </TabsContent>

          <TabsContent value="approved">
            {approvedReplacements && approvedReplacements.length > 0 ? (
              <Card>
                <CardHeader><div className="flex justify-between"><CardTitle>Ready to Apply</CardTitle>{selectedReplacements.length > 0 && <Button onClick={handleBulkApply}><Play className="h-4 w-4 mr-2" />Apply ({selectedReplacements.length})</Button>}</div></CardHeader>
                <CardContent className="space-y-4">
                  {approvedReplacements.map(r => (
                    <Card key={r.id}><CardContent className="pt-4 flex gap-3">
                      <Checkbox checked={selectedReplacements.includes(r.id)} onCheckedChange={(c) => setSelectedReplacements(p => c ? [...p, r.id] : p.filter(i => i !== r.id))} />
                      <div className="flex-1"><p className="text-sm truncate">{r.original_url}</p><p className="text-sm text-green-600">→ {r.replacement_url}</p></div>
                      <Button size="sm" onClick={() => getPreview(r)}><Play className="h-4 w-4 mr-1" />Apply</Button>
                    </CardContent></Card>
                  ))}
                </CardContent>
              </Card>
            ) : <Card><CardContent className="py-12 text-center text-muted-foreground">No approved replacements</CardContent></Card>}
          </TabsContent>

          <TabsContent value="applied">
            {appliedReplacements && appliedReplacements.length > 0 ? (
              <Card><CardContent className="pt-6 space-y-4">
                {appliedReplacements.map(r => (
                  <Card key={r.id}><CardContent className="pt-4">
                    <p className="text-sm truncate">{r.original_url}</p>
                    <p className="text-sm text-green-600">→ {r.replacement_url}</p>
                    <div className="flex gap-2 mt-2"><Badge variant="secondary">{r.applied_to_articles?.length || 0} articles</Badge><Badge variant="outline">{r.replacement_count || 0} replacements</Badge></div>
                  </CardContent></Card>
                ))}
              </CardContent></Card>
            ) : <Card><CardContent className="py-12 text-center text-muted-foreground">No applied replacements</CardContent></Card>}
          </TabsContent>

          <TabsContent value="domains">
            <ApprovedDomainsTab />
          </TabsContent>
        </Tabs>

        {currentPreview && (
          <ChangePreviewModal
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            originalUrl={currentPreview.replacement.original_url}
            replacementUrl={currentPreview.replacement.replacement_url}
            confidenceScore={currentPreview.replacement.confidence_score}
            affectedArticles={currentPreview.affectedArticles}
            onConfirm={() => applyReplacement.mutate([currentPreview.replacement.id])}
            isApplying={applyReplacement.isPending}
          />
        )}

        <BulkReplacementDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          selectedCount={selectedReplacements.length}
          isProcessing={bulkProgress > 0 && bulkProgress < 100}
          progress={bulkProgress}
          results={bulkResults}
          onConfirm={handleBulkApply}
        />
      </div>
    </AdminLayout>
  );
};

export default CitationHealth;
