import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Globe, 
  FileText, 
  Languages,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface ClusterStats {
  cluster_id: string;
  theme: string;
  category: string;
  total_articles: number;
  english_count: number;
  has_english: boolean;
  languages: string[];
  priority: 'english_only' | 'non_english' | 'partial' | 'complete';
}

interface ClusterSummary {
  english_only_count: number;
  non_english_count: number;
  partial_count: number;
  complete_count: number;
  total_clusters: number;
}

const CompleteIncompleteClusters = () => {
  const queryClient = useQueryClient();
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);

  // Fetch cluster status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['cluster-completion-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('batch-complete-clusters', {
        body: { action: 'status' }
      });
      if (error) throw error;
      return data as { 
        summary: ClusterSummary; 
        clusters: {
          english_only: ClusterStats[];
          non_english: ClusterStats[];
          partial: ClusterStats[];
          complete: ClusterStats[];
        }
      };
    }
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (clusterIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('batch-complete-clusters', {
        body: { action: 'preview', specificClusterIds: clusterIds }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Preview generated for ${data.previews?.length || 0} clusters`);
      console.log('Preview results:', data);
    },
    onError: (error: Error) => {
      toast.error(`Preview failed: ${error.message}`);
    }
  });

  // Start batch mutation
  const startBatchMutation = useMutation({
    mutationFn: async ({ priorityFilter, clusterIds }: { priorityFilter?: string; clusterIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('batch-complete-clusters', {
        body: { 
          action: 'start_batch', 
          batchSize: 5,
          priorityFilter,
          specificClusterIds: clusterIds
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setProcessingResults(data.results || []);
      toast.success(`Processed ${data.batchSize} clusters. ${data.remainingClusters} remaining.`);
      queryClient.invalidateQueries({ queryKey: ['cluster-completion-status'] });
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast.error(`Batch processing failed: ${error.message}`);
    }
  });

  const handleStartBatch = (priorityFilter?: string) => {
    setIsProcessing(true);
    setProcessingResults([]);
    const clusterIds = selectedClusters.size > 0 ? Array.from(selectedClusters) : undefined;
    startBatchMutation.mutate({ priorityFilter, clusterIds });
  };

  const handlePreview = () => {
    if (selectedClusters.size === 0) {
      toast.error('Select at least one cluster to preview');
      return;
    }
    previewMutation.mutate(Array.from(selectedClusters));
  };

  const toggleClusterSelection = (clusterId: string) => {
    setSelectedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const selectAllInCategory = (clusters: ClusterStats[]) => {
    setSelectedClusters(prev => {
      const next = new Set(prev);
      clusters.forEach(c => next.add(c.cluster_id));
      return next;
    });
  };

  const clearSelection = () => setSelectedClusters(new Set());

  const renderClusterTable = (clusters: ClusterStats[], priority: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox 
              checked={clusters.every(c => selectedClusters.has(c.cluster_id))}
              onCheckedChange={() => {
                if (clusters.every(c => selectedClusters.has(c.cluster_id))) {
                  setSelectedClusters(prev => {
                    const next = new Set(prev);
                    clusters.forEach(c => next.delete(c.cluster_id));
                    return next;
                  });
                } else {
                  selectAllInCategory(clusters);
                }
              }}
            />
          </TableHead>
          <TableHead>Theme</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-center">Articles</TableHead>
          <TableHead className="text-center">English</TableHead>
          <TableHead>Languages</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clusters.map((cluster) => (
          <TableRow key={cluster.cluster_id}>
            <TableCell>
              <Checkbox 
                checked={selectedClusters.has(cluster.cluster_id)}
                onCheckedChange={() => toggleClusterSelection(cluster.cluster_id)}
              />
            </TableCell>
            <TableCell className="font-medium max-w-[200px] truncate">
              {cluster.theme || 'Unknown'}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{cluster.category}</Badge>
            </TableCell>
            <TableCell className="text-center">{cluster.total_articles}</TableCell>
            <TableCell className="text-center">
              {cluster.has_english ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {cluster.languages.slice(0, 3).map(lang => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang.toUpperCase()}
                  </Badge>
                ))}
                {cluster.languages.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{cluster.languages.length - 3}
                  </Badge>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const summary = statusData?.summary;
  const clusters = statusData?.clusters;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Complete Incomplete Clusters</h1>
            <p className="text-muted-foreground mt-1">
              Translate and generate articles to complete your content clusters
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">English-Only</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{summary?.english_only_count || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Easiest to complete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Non-English</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{summary?.non_english_count || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Need English first</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Partial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-2xl font-bold">{summary?.partial_count || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{summary?.complete_count || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">All 60 articles</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Actions</CardTitle>
            <CardDescription>
              {selectedClusters.size > 0 
                ? `${selectedClusters.size} clusters selected` 
                : 'Select clusters or use priority-based batch processing'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => handleStartBatch('english_only')} 
                disabled={isProcessing}
              >
                <Play className="w-4 h-4 mr-2" />
                Complete English-Only (5)
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => handleStartBatch('non_english')} 
                disabled={isProcessing}
              >
                <Globe className="w-4 h-4 mr-2" />
                Translate Non-English (5)
              </Button>

              {selectedClusters.size > 0 && (
                <>
                  <Button 
                    variant="secondary"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    Preview Selected
                  </Button>
                  <Button 
                    onClick={() => handleStartBatch()} 
                    disabled={isProcessing}
                  >
                    Process Selected ({selectedClusters.size})
                  </Button>
                  <Button variant="ghost" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </>
              )}
            </div>

            {isProcessing && (
              <div className="mt-4">
                <Progress value={undefined} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">Processing clusters...</p>
              </div>
            )}

            {processingResults.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Processing Results</h4>
                <div className="space-y-2">
                  {processingResults.map((result, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-mono text-xs">{result.clusterId.slice(0, 8)}...</span>
                      {result.success ? (
                        <span className="text-green-600">
                          {result.result?.finalCount || 0} articles
                        </span>
                      ) : (
                        <span className="text-red-600">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cluster Tabs */}
        <Tabs defaultValue="english_only">
          <TabsList>
            <TabsTrigger value="english_only">
              English-Only ({summary?.english_only_count || 0})
            </TabsTrigger>
            <TabsTrigger value="non_english">
              Non-English ({summary?.non_english_count || 0})
            </TabsTrigger>
            <TabsTrigger value="partial">
              Partial ({summary?.partial_count || 0})
            </TabsTrigger>
            <TabsTrigger value="complete">
              Complete ({summary?.complete_count || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="english_only">
            <Card>
              <CardHeader>
                <CardTitle>English-Only Clusters</CardTitle>
                <CardDescription>
                  These clusters only have English articles. Easiest to complete - just translate to 9 languages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {clusters?.english_only && renderClusterTable(clusters.english_only, 'english_only')}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non_english">
            <Card>
              <CardHeader>
                <CardTitle>Non-English Clusters</CardTitle>
                <CardDescription>
                  These clusters have no English articles. Will be translated to English first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {clusters?.non_english && renderClusterTable(clusters.non_english, 'non_english')}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partial">
            <Card>
              <CardHeader>
                <CardTitle>Partial Clusters</CardTitle>
                <CardDescription>
                  These clusters have some translations but are not complete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {clusters?.partial && renderClusterTable(clusters.partial, 'partial')}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complete">
            <Card>
              <CardHeader>
                <CardTitle>Complete Clusters</CardTitle>
                <CardDescription>
                  These clusters have all 60 articles (6 per language × 10 languages).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {clusters?.complete && renderClusterTable(clusters.complete, 'complete')}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CompleteIncompleteClusters;
