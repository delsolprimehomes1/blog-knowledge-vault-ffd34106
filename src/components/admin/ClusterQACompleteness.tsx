import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Play, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', de: '🇩🇪', nl: '🇳🇱', fr: '🇫🇷', pl: '🇵🇱',
  sv: '🇸🇪', da: '🇩🇰', hu: '🇭🇺', fi: '🇫🇮', no: '🇳🇴',
};

interface ClusterLanguageStatus {
  language: string;
  count: number;
  missing: number;
  status: 'complete' | 'partial' | 'missing';
}

interface ClusterStatus {
  cluster_id: string;
  cluster_theme: string | null;
  total_qa_pages: number;
  expected_total: number;
  languages: ClusterLanguageStatus[];
  incomplete_languages: string[];
  completeness_percent: number;
}

interface AnalysisResult {
  success: boolean;
  clusters: ClusterStatus[];
  summary: {
    total_clusters: number;
    incomplete_clusters: number;
    complete_clusters: number;
    total_missing_qa_pages: number;
    languages_analyzed: string[];
  };
}

export function ClusterQACompleteness() {
  const queryClient = useQueryClient();
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  // Fetch cluster completeness data
  const { data: analysis, isLoading, refetch } = useQuery<AnalysisResult>({
    queryKey: ['cluster-qa-completeness'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('backfill-qa-languages', {
        body: { action: 'analyze-all' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Backfill mutation
  const backfillMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const { data, error } = await supabase.functions.invoke('backfill-qa-languages', {
        body: { 
          action: 'backfill',
          clusterId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Backfill started: ${data.articles_queued} articles queued for ${data.languages_to_backfill?.length || 0} languages`);
      queryClient.invalidateQueries({ queryKey: ['cluster-qa-completeness'] });
    },
    onError: (error) => {
      toast.error(`Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const getStatusIcon = (percent: number) => {
    if (percent >= 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (percent >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getLanguageStatusBadge = (status: ClusterLanguageStatus) => {
    if (status.status === 'complete') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{status.count}</Badge>;
    }
    if (status.status === 'partial') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{status.count}/{24}</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">0</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Analyzing cluster completeness...</span>
        </CardContent>
      </Card>
    );
  }

  const incompleteClustersList = analysis?.clusters.filter(c => c.completeness_percent < 100) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis?.summary.total_clusters || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analysis?.summary.complete_clusters || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analysis?.summary.incomplete_clusters || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Missing Q&As</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analysis?.summary.total_missing_qa_pages || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Incomplete Clusters Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Incomplete Q&A Clusters</CardTitle>
            <CardDescription>
              Clusters missing Q&A pages in one or more languages (24 Q&As per language expected)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {incompleteClustersList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>All clusters are complete!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-center">Languages</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incompleteClustersList.map((cluster) => (
                  <>
                    <TableRow 
                      key={cluster.cluster_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedCluster(expandedCluster === cluster.cluster_id ? null : cluster.cluster_id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cluster.completeness_percent)}
                          <div>
                            <div className="font-medium truncate max-w-[200px]">
                              {cluster.cluster_theme || cluster.cluster_id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {cluster.total_qa_pages}/{cluster.expected_total} Q&As
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Progress value={cluster.completeness_percent} className="h-2" />
                          <span className="text-xs text-muted-foreground">{cluster.completeness_percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {cluster.languages.map((lang) => (
                            <div key={lang.language} className="flex items-center gap-0.5" title={`${lang.language}: ${lang.count}/24`}>
                              <span className="text-sm">{LANGUAGE_FLAGS[lang.language]}</span>
                              {getLanguageStatusBadge(lang)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            backfillMutation.mutate(cluster.cluster_id);
                          }}
                          disabled={backfillMutation.isPending}
                        >
                          {backfillMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Backfill
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedCluster === cluster.cluster_id && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/30">
                          <div className="p-4">
                            <h4 className="font-medium mb-2">Missing Languages Details:</h4>
                            <div className="grid grid-cols-5 gap-2">
                              {cluster.languages.filter(l => l.status !== 'complete').map((lang) => (
                                <div key={lang.language} className="p-2 rounded bg-background border">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span>{LANGUAGE_FLAGS[lang.language]}</span>
                                    <span className="font-medium uppercase">{lang.language}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Has: {lang.count} / Needs: {lang.missing} more
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Cluster ID: {cluster.cluster_id}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
