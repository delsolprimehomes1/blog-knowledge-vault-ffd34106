import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  PlayCircle, 
  PauseCircle, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  Layers,
  Zap
} from "lucide-react";

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
  total: number;
}

interface ClusterProgress {
  cluster_id: string;
  cluster_theme: string;
  total_articles_needed: number;
  articles_completed: number;
  english_articles: number;
  translations_completed: number;
  status: string;
  priority_score: number;
  tier: string;
  error_count: number;
  last_updated: string;
}

export default function TranslationQueue() {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processInterval, setProcessInterval] = useState<number | null>(null);

  // Fetch queue stats
  const { data: queueStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: async (): Promise<QueueStats> => {
      const { data, error } = await supabase
        .from('cluster_translation_queue')
        .select('status');
      
      if (error) throw error;

      const stats: QueueStats = { 
        pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0, total: 0 
      };
      
      data?.forEach(item => {
        stats[item.status as keyof Omit<QueueStats, 'total'>]++;
        stats.total++;
      });

      return stats;
    },
    refetchInterval: isProcessing ? 5000 : 30000
  });

  // Fetch cluster progress
  const { data: clusterProgress, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['cluster-progress', selectedTier],
    queryFn: async (): Promise<ClusterProgress[]> => {
      let query = supabase
        .from('cluster_completion_progress')
        .select('*')
        .order('priority_score', { ascending: false })
        .order('last_updated', { ascending: false })
        .limit(50);

      if (selectedTier !== 'all') {
        query = query.eq('tier', selectedTier);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: isProcessing ? 10000 : 60000
  });

  // Populate queue mutation
  const populateMutation = useMutation({
    mutationFn: async (params: { tierFilter?: string; limit?: number; dryRun?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('populate-translation-queue', {
        body: params
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.info(`Dry run: Would create ${data.summary.jobsToCreate} jobs for ${data.summary.clustersProcessed} clusters`);
      } else {
        toast.success(`Created ${data.summary.jobsCreated} queue jobs`);
        queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
        queryClient.invalidateQueries({ queryKey: ['cluster-progress'] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to populate queue: ${error.message}`);
    }
  });

  // Process queue mutation
  const processMutation = useMutation({
    mutationFn: async (batchSize: number = 1) => {
      const { data, error } = await supabase.functions.invoke('process-translation-queue', {
        body: { batchSize }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.processed > 0) {
        toast.success(`Processed ${data.processed} translations`);
      }
      refetchStats();
      refetchProgress();
    },
    onError: (error) => {
      toast.error(`Processing error: ${error.message}`);
    }
  });

  // Reset failed jobs mutation
  const resetFailedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('cluster_translation_queue')
        .update({ 
          status: 'pending', 
          retry_count: 0, 
          error_message: null,
          started_at: null 
        })
        .eq('status', 'failed')
        .select('id');
      
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count) => {
      toast.success(`Reset ${count} failed jobs`);
      refetchStats();
    }
  });

  // Start/stop continuous processing
  const toggleProcessing = () => {
    if (isProcessing && processInterval) {
      clearInterval(processInterval);
      setProcessInterval(null);
      setIsProcessing(false);
      toast.info("Processing stopped");
    } else {
      const interval = window.setInterval(() => {
        processMutation.mutate(1);
      }, 30000); // Process every 30 seconds
      setProcessInterval(interval);
      setIsProcessing(true);
      processMutation.mutate(1); // Start immediately
      toast.success("Started automatic processing (1 job every 30 seconds)");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      queued: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      processing: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      in_progress: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      completed: { variant: "outline", icon: <CheckCircle className="h-3 w-3 text-green-500" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      not_started: { variant: "secondary", icon: <Clock className="h-3 w-3" /> }
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      tier_1: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      tier_2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      tier_3: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    };
    return (
      <Badge className={colors[tier] || colors.tier_3}>
        {tier.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const completionPercentage = queueStats 
    ? Math.round((queueStats.completed / Math.max(queueStats.total, 1)) * 100)
    : 0;

  const estimatedHoursRemaining = queueStats
    ? Math.ceil(queueStats.pending / 120) // 120 jobs/hour at 30 sec each
    : 0;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Translation Queue</h1>
            <p className="text-muted-foreground">
              Batch process translations for all incomplete clusters
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => { refetchStats(); refetchProgress(); }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{queueStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Total Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{queueStats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{queueStats?.processing || 0}</div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{queueStats?.completed || 0}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{queueStats?.failed || 0}</div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{estimatedHoursRemaining}h</div>
              <p className="text-xs text-muted-foreground">Est. Remaining</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Queue Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={toggleProcessing}
                variant={isProcessing ? "destructive" : "default"}
              >
                {isProcessing ? (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Stop Processing
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Auto-Processing
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => processMutation.mutate(1)}
                disabled={processMutation.isPending}
              >
                {processMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Process 1 Job Now
              </Button>

              <Button
                variant="outline"
                onClick={() => processMutation.mutate(5)}
                disabled={processMutation.isPending}
              >
                Process 5 Jobs
              </Button>

              <Button
                variant="outline"
                onClick={() => resetFailedMutation.mutate()}
                disabled={resetFailedMutation.isPending || !queueStats?.failed}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset {queueStats?.failed || 0} Failed
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Populate Queue</h4>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => populateMutation.mutate({ tierFilter: 'tier_1', limit: 50, dryRun: true })}
                  disabled={populateMutation.isPending}
                >
                  Preview Tier 1 (50)
                </Button>
                <Button
                  onClick={() => populateMutation.mutate({ tierFilter: 'tier_1', limit: 50 })}
                  disabled={populateMutation.isPending}
                >
                  {populateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Populate Tier 1 (50 clusters)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => populateMutation.mutate({ limit: 100 })}
                  disabled={populateMutation.isPending}
                >
                  Populate All Tiers (100 clusters)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cluster Progress */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Cluster Progress
              </CardTitle>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="tier_1">Tier 1</SelectItem>
                  <SelectItem value="tier_2">Tier 2</SelectItem>
                  <SelectItem value="tier_3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              {clusterProgress?.length || 0} clusters tracked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster Theme</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>EN</TableHead>
                    <TableHead>Translations</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clusterProgress?.map((cluster) => {
                    const progress = Math.round(
                      (cluster.articles_completed / Math.max(cluster.total_articles_needed, 1)) * 100
                    );
                    return (
                      <TableRow key={cluster.cluster_id}>
                        <TableCell className="max-w-[300px] truncate">
                          {cluster.cluster_theme || cluster.cluster_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{getTierBadge(cluster.tier)}</TableCell>
                        <TableCell>{getStatusBadge(cluster.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-16 h-2" />
                            <span className="text-xs">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{cluster.english_articles}</TableCell>
                        <TableCell>
                          {cluster.translations_completed} / {cluster.total_articles_needed - cluster.english_articles}
                        </TableCell>
                        <TableCell>
                          {cluster.error_count > 0 && (
                            <Badge variant="destructive">{cluster.error_count}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!clusterProgress || clusterProgress.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No clusters in queue. Use "Populate Queue" to add clusters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
