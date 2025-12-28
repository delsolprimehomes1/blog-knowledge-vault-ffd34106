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
  RefreshCw, 
  Globe, 
  FileText, 
  Languages,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { LanguageStatusGrid } from "@/components/admin/LanguageStatusGrid";
import { TranslateDropdown } from "@/components/admin/TranslateDropdown";
import { TranslationProgressModal } from "@/components/admin/TranslationProgressModal";

interface ClusterStats {
  cluster_id: string;
  theme: string;
  category: string;
  total_articles: number;
  english_count: number;
  has_english: boolean;
  languages: string[];
  language_counts?: Record<string, number>;
  priority: 'english_only' | 'non_english' | 'partial' | 'complete';
}

interface ClusterSummary {
  english_only_count: number;
  non_english_count: number;
  partial_count: number;
  complete_count: number;
  total_clusters: number;
}

interface TranslationState {
  isOpen: boolean;
  clusterId: string;
  clusterTheme: string;
  targetLanguage: string;
  languageName: string;
  languageFlag: string;
  isTranslating: boolean;
  progress: { current: number; total: number; currentHeadline?: string };
  results: { success: boolean; headline?: string; error?: string }[];
  error: string | null;
  duration?: string;
}

const LANGUAGE_INFO: Record<string, { name: string; flag: string }> = {
  'en': { name: 'English', flag: '🇬🇧' },
  'de': { name: 'German', flag: '🇩🇪' },
  'nl': { name: 'Dutch', flag: '🇳🇱' },
  'fr': { name: 'French', flag: '🇫🇷' },
  'pl': { name: 'Polish', flag: '🇵🇱' },
  'sv': { name: 'Swedish', flag: '🇸🇪' },
  'da': { name: 'Danish', flag: '🇩🇰' },
  'hu': { name: 'Hungarian', flag: '🇭🇺' },
  'fi': { name: 'Finnish', flag: '🇫🇮' },
  'no': { name: 'Norwegian', flag: '🇳🇴' },
};

const CompleteIncompleteClusters = () => {
  const queryClient = useQueryClient();
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const [translationState, setTranslationState] = useState<TranslationState>({
    isOpen: false,
    clusterId: '',
    clusterTheme: '',
    targetLanguage: '',
    languageName: '',
    languageFlag: '',
    isTranslating: false,
    progress: { current: 0, total: 0 },
    results: [],
    error: null,
  });

  // Fetch cluster status with language breakdown
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['cluster-completion-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('batch-complete-clusters', {
        body: { action: 'status' }
      });
      if (error) throw error;
      
      // Fetch language counts for each cluster
      const allClusters = [
        ...(data.clusters?.english_only || []),
        ...(data.clusters?.non_english || []),
        ...(data.clusters?.partial || []),
        ...(data.clusters?.complete || []),
      ];
      
      if (allClusters.length > 0) {
        const clusterIds = allClusters.map(c => c.cluster_id);
        
        // Get article counts per language per cluster
        const { data: articles } = await supabase
          .from('blog_articles')
          .select('cluster_id, language')
          .in('cluster_id', clusterIds)
          .eq('status', 'published');
        
        // Build language counts map
        const languageCountsMap: Record<string, Record<string, number>> = {};
        (articles || []).forEach(article => {
          if (!languageCountsMap[article.cluster_id]) {
            languageCountsMap[article.cluster_id] = {};
          }
          const lang = article.language;
          languageCountsMap[article.cluster_id][lang] = 
            (languageCountsMap[article.cluster_id][lang] || 0) + 1;
        });
        
        // Attach language counts to clusters
        const enrichCluster = (cluster: ClusterStats): ClusterStats => ({
          ...cluster,
          language_counts: languageCountsMap[cluster.cluster_id] || {}
        });
        
        return {
          summary: data.summary,
          clusters: {
            english_only: (data.clusters?.english_only || []).map(enrichCluster),
            non_english: (data.clusters?.non_english || []).map(enrichCluster),
            partial: (data.clusters?.partial || []).map(enrichCluster),
            complete: (data.clusters?.complete || []).map(enrichCluster),
          }
        };
      }
      
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

  // Translate to specific language mutation
  const translateMutation = useMutation({
    mutationFn: async ({ clusterId, targetLanguage }: { clusterId: string; targetLanguage: string }) => {
      const { data, error } = await supabase.functions.invoke('translate-cluster-to-language', {
        body: { clusterId, targetLanguage }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTranslationState(prev => ({
        ...prev,
        isTranslating: false,
        progress: { current: data.articlesTranslated + data.articlesSkipped, total: data.totalEnglishArticles || 6 },
        results: data.results || [],
        error: null,
        duration: data.duration,
      }));
      
      if (data.articlesFailed > 0) {
        toast.warning(`Translation completed with ${data.articlesFailed} error(s)`);
      } else {
        toast.success(`${data.languageFlag} ${data.articlesTranslated} articles translated to ${data.languageName}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['cluster-completion-status'] });
    },
    onError: (error: Error) => {
      setTranslationState(prev => ({
        ...prev,
        isTranslating: false,
        error: error.message,
      }));
      toast.error(`Translation failed: ${error.message}`);
    }
  });

  // Start batch mutation (legacy)
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

  const handleTranslate = (cluster: ClusterStats, targetLanguage: string) => {
    const langInfo = LANGUAGE_INFO[targetLanguage];
    const englishCount = cluster.language_counts?.['en'] || cluster.english_count || 6;
    
    setTranslationState({
      isOpen: true,
      clusterId: cluster.cluster_id,
      clusterTheme: cluster.theme || 'Unknown Cluster',
      targetLanguage,
      languageName: langInfo.name,
      languageFlag: langInfo.flag,
      isTranslating: true,
      progress: { current: 0, total: englishCount },
      results: [],
      error: null,
    });

    translateMutation.mutate({ 
      clusterId: cluster.cluster_id, 
      targetLanguage 
    });
  };

  const handleCloseTranslationModal = () => {
    setTranslationState(prev => ({ ...prev, isOpen: false }));
  };

  const handleStartBatch = (priorityFilter?: string) => {
    setIsProcessing(true);
    setProcessingResults([]);
    const clusterIds = selectedClusters.size > 0 ? Array.from(selectedClusters) : undefined;
    startBatchMutation.mutate({ priorityFilter, clusterIds });
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
              checked={clusters.length > 0 && clusters.every(c => selectedClusters.has(c.cluster_id))}
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
          <TableHead className="min-w-[200px]">Theme</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-center">EN</TableHead>
          <TableHead className="min-w-[300px]">Languages</TableHead>
          <TableHead className="text-right">Actions</TableHead>
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
            <TableCell className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm">{cluster.language_counts?.['en'] || cluster.english_count || 0}</span>
                {cluster.has_english ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </TableCell>
            <TableCell>
              <LanguageStatusGrid
                languageCounts={cluster.language_counts || {}}
                englishCount={cluster.english_count || 6}
                onTranslate={(lang) => handleTranslate(cluster, lang)}
                isTranslating={translationState.isTranslating && translationState.clusterId === cluster.cluster_id}
                currentlyTranslating={translationState.clusterId === cluster.cluster_id ? translationState.targetLanguage : null}
                compact={false}
              />
            </TableCell>
            <TableCell className="text-right">
              <TranslateDropdown
                languageCounts={cluster.language_counts || {}}
                englishCount={cluster.english_count || 6}
                onTranslate={(lang) => handleTranslate(cluster, lang)}
                isTranslating={translationState.isTranslating && translationState.clusterId === cluster.cluster_id}
                currentlyTranslating={translationState.clusterId === cluster.cluster_id ? translationState.targetLanguage : null}
                disabled={!cluster.has_english}
              />
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
              Translate clusters one language at a time for full control
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
              <p className="text-xs text-muted-foreground mt-1">Ready to translate</p>
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
                : 'Select clusters or click language buttons to translate one-by-one'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => handleStartBatch('english_only')} 
                disabled={isProcessing}
                variant="outline"
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
                  Click any language flag to translate. Each translation takes ~3 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
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
                  These clusters have no English articles. Create English versions first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
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
                  These clusters have some translations. Continue translating to complete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
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
                <ScrollArea className="h-[500px]">
                  {clusters?.complete && renderClusterTable(clusters.complete, 'complete')}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Translation Progress Modal */}
      <TranslationProgressModal
        open={translationState.isOpen}
        onClose={handleCloseTranslationModal}
        clusterTheme={translationState.clusterTheme}
        targetLanguage={translationState.targetLanguage}
        languageName={translationState.languageName}
        languageFlag={translationState.languageFlag}
        isTranslating={translationState.isTranslating}
        progress={translationState.progress}
        results={translationState.results}
        error={translationState.error}
        duration={translationState.duration}
        onRetry={() => {
          if (translationState.clusterId && translationState.targetLanguage) {
            translateMutation.mutate({
              clusterId: translationState.clusterId,
              targetLanguage: translationState.targetLanguage
            });
            setTranslationState(prev => ({ ...prev, isTranslating: true, error: null }));
          }
        }}
      />
    </AdminLayout>
  );
};

export default CompleteIncompleteClusters;
