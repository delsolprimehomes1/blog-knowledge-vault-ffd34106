import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Eye, Trash2, CheckCircle, HelpCircle, Copy, Loader2, FolderOpen, RefreshCw, Globe, Languages } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ClusterData {
  cluster_id: string;
  cluster_theme: string | null;
  languages: Record<string, { total: number; draft: number; published: number }>;
  total_articles: number;
  all_draft: boolean;
  all_published: boolean;
  created_at: string;
  job_status?: string;
  languages_queue?: string[] | null;
  job_error?: string | null;
  job_progress?: any;
}

// Backend default translation languages (English + these = 10 languages total)
const DEFAULT_TRANSLATION_LANGUAGES = ["de", "nl", "fr", "pl", "sv", "da", "hu", "fi", "no"];

const ClusterManager = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clusterToDelete, setClusterToDelete] = useState<string | null>(null);
  const [clusterToPublish, setClusterToPublish] = useState<string | null>(null);
  const [clusterToTranslate, setClusterToTranslate] = useState<string | null>(null);
  const [translatingCluster, setTranslatingCluster] = useState<string | null>(null);
  const [translationProgress, setTranslationProgress] = useState<{ current: string; remaining: number } | null>(null);

  const getAllExpectedLanguages = (cluster?: Pick<ClusterData, "languages_queue">) => {
    const queue =
      cluster?.languages_queue && cluster.languages_queue.length > 0
        ? cluster.languages_queue
        : DEFAULT_TRANSLATION_LANGUAGES;

    return ["en", ...queue.filter((l) => l !== "en")];
  };

  // Fetch articles grouped by cluster
  const { data: articles, isLoading } = useQuery({
    queryKey: ["cluster-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, cluster_id, cluster_theme, language, status, created_at")
        .not("cluster_id", "is", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch cluster generation jobs for status info
  const { data: clusterJobs } = useQuery({
    queryKey: ["cluster-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cluster_generations")
        .select("id, status, topic, created_at, languages_queue, error, progress");
      
      if (error) throw error;
      return data;
    },
  });

  // Process articles into cluster groups
  const clusters = useMemo(() => {
    if (!articles) return [];

    const clusterMap = new Map<string, ClusterData>();

    articles.forEach((article) => {
      if (!article.cluster_id) return;

      if (!clusterMap.has(article.cluster_id)) {
        clusterMap.set(article.cluster_id, {
          cluster_id: article.cluster_id,
          cluster_theme: article.cluster_theme,
          languages: {},
          total_articles: 0,
          all_draft: true,
          all_published: true,
          created_at: article.created_at,
        });
      }

      const cluster = clusterMap.get(article.cluster_id)!;
      cluster.total_articles++;

      if (!cluster.languages[article.language]) {
        cluster.languages[article.language] = { total: 0, draft: 0, published: 0 };
      }
      cluster.languages[article.language].total++;
      
      if (article.status === "draft") {
        cluster.languages[article.language].draft++;
        cluster.all_published = false;
      } else if (article.status === "published") {
        cluster.languages[article.language].published++;
        cluster.all_draft = false;
      } else {
        cluster.all_draft = false;
        cluster.all_published = false;
      }

      // Keep earliest created_at
      if (new Date(article.created_at) < new Date(cluster.created_at)) {
        cluster.created_at = article.created_at;
      }
    });

    // Add job status info
    const clustersArray = Array.from(clusterMap.values());
    clustersArray.forEach((cluster) => {
      const job = clusterJobs?.find((j) => j.id === cluster.cluster_id);
      if (job) {
        cluster.job_status = job.status;
        cluster.languages_queue = job.languages_queue ?? null;
        cluster.job_error = job.error ?? null;
        cluster.job_progress = job.progress ?? null;
      }
    });

    // Sort by created_at descending
    return clustersArray.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [articles, clusterJobs]);

  // Filter clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter((cluster) => {
      const matchesSearch =
        searchQuery === "" ||
        cluster.cluster_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cluster.cluster_theme?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      let matchesStatus = true;
      if (statusFilter === "draft") {
        matchesStatus = cluster.all_draft;
      } else if (statusFilter === "published") {
        matchesStatus = cluster.all_published;
      } else if (statusFilter === "mixed") {
        matchesStatus = !cluster.all_draft && !cluster.all_published;
      } else if (statusFilter === "partial") {
        matchesStatus = cluster.job_status === "partial" || cluster.job_status === "failed";
      }

      return matchesSearch && matchesStatus;
    });
  }, [clusters, searchQuery, statusFilter]);

  // Publish all articles in cluster
  const publishMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const { error } = await supabase
        .from("blog_articles")
        .update({ 
          status: "published", 
          date_published: new Date().toISOString() 
        })
        .eq("cluster_id", clusterId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      toast.success("All articles in cluster published successfully");
      setClusterToPublish(null);
    },
    onError: (error) => {
      toast.error(`Failed to publish: ${error.message}`);
    },
  });

  // Delete all articles in cluster
  const deleteMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const { error } = await supabase
        .from("blog_articles")
        .delete()
        .eq("cluster_id", clusterId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      toast.success("All articles in cluster deleted successfully");
      setClusterToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Generate QA for cluster
  const generateQAMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      // Get all article IDs in the cluster
      const { data: clusterArticles, error: fetchError } = await supabase
        .from("blog_articles")
        .select("id")
        .eq("cluster_id", clusterId);
      
      if (fetchError) throw fetchError;
      
      const articleIds = clusterArticles.map((a) => a.id);
      
      // Invoke QA generation edge function
      const { error } = await supabase.functions.invoke("generate-qa-pages", {
        body: { articleIds },
      });
      
      if (error) throw error;
      return articleIds.length;
    },
    onSuccess: (count) => {
      toast.success(`QA generation started for ${count} articles`);
    },
    onError: (error) => {
      toast.error(`Failed to start QA generation: ${error.message}`);
    },
  });

  // Poll job status after network disconnect
  const pollJobStatus = async (clusterId: string, maxAttempts = 15): Promise<{ status: string; error?: string; progress?: any }> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: job } = await supabase
        .from("cluster_generations")
        .select("status, error, progress")
        .eq("id", clusterId)
        .single();
      
      if (job) {
        if (job.status === "completed") {
          return { status: "completed", progress: job.progress };
        }
        if (job.status === "partial" || job.status === "failed") {
          return { status: job.status, error: job.error, progress: job.progress };
        }
        // Still in progress, continue polling
      }
    }
    return { status: "timeout", error: "Job status check timed out" };
  };

  // Complete translations for cluster
  const completeTranslationsMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setTranslatingCluster(clusterId);

      try {
        const { data, error } = await supabase.functions.invoke("translate-cluster", {
          body: { jobId: clusterId },
        });

        if (error) {
          const errorMsg = error.message || String(error);
          // Check for network errors that might be false negatives
          if (errorMsg.includes("Failed to fetch") || errorMsg.includes("network") || errorMsg.includes("timeout")) {
            toast.info("Connection lost — checking job status...");
            const polledResult = await pollJobStatus(clusterId);
            
            if (polledResult.status === "completed") {
              return { status: "completed", totalArticles: polledResult.progress?.generated_articles };
            } else if (polledResult.status === "partial" || polledResult.status === "failed") {
              throw new Error(polledResult.error || `Job ${polledResult.status}`);
            } else {
              throw new Error("Connection lost and job status unclear. Try again.");
            }
          }
          
          const resp = (error as any)?.context?.response as Response | undefined;
          if (resp) {
            try {
              const payload = await resp.clone().json();
              const msg = payload?.error || payload?.message;
              if (msg) throw new Error(msg);
            } catch {
              // fall through to generic error below
            }
          }
          throw error;
        }

        return data;
      } catch (err: any) {
        // Double-check for network errors in catch block
        const errorMsg = err.message || String(err);
        if (errorMsg.includes("Failed to fetch") || errorMsg.includes("network")) {
          toast.info("Connection lost — checking job status...");
          const polledResult = await pollJobStatus(clusterId);
          
          if (polledResult.status === "completed") {
            return { status: "completed", totalArticles: polledResult.progress?.generated_articles };
          } else if (polledResult.status === "partial" || polledResult.status === "failed") {
            throw new Error(polledResult.error || `Job ${polledResult.status}`);
          }
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-jobs"] });
      
      if (data.status === "completed") {
        toast.success(`All translations complete! ${data.totalArticles || 'All'} articles translated.`);
        setTranslatingCluster(null);
        setTranslationProgress(null);
      } else if (data.status === "partial" || data.language) {
        const remainingCount = data.remainingLanguages?.length || 0;
        setTranslationProgress({
          current: data.language || "Unknown",
          remaining: remainingCount,
        });
        toast.info(`${data.language} translation complete! ${remainingCount} languages remaining. Click again to continue.`);
        setTranslatingCluster(null);
      } else {
        toast.info("Translation progress updated. Click again to continue.");
        setTranslatingCluster(null);
      }
      setClusterToTranslate(null);
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-jobs"] });
      toast.error(`Translation failed: ${error.message}`);
      setTranslatingCluster(null);
      setTranslationProgress(null);
    },
  });

  const getMissingLanguages = (cluster: ClusterData) => {
    const existingLanguages = new Set(Object.keys(cluster.languages));
    return getAllExpectedLanguages(cluster).filter((lang) => !existingLanguages.has(lang));
  };

  const copyClusterId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Cluster ID copied to clipboard");
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      en: "🇬🇧",
      de: "🇩🇪",
      nl: "🇳🇱",
      fr: "🇫🇷",
      es: "🇪🇸",
      pl: "🇵🇱",
      sv: "🇸🇪",
      da: "🇩🇰",
      hu: "🇭🇺",
      fi: "🇫🇮",
      no: "🇳🇴",
    };
    return flags[lang] || lang.toUpperCase();
  };

  const getStatusBadge = (cluster: ClusterData) => {
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

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cluster Manager</h1>
            <p className="text-muted-foreground">
              Manage article clusters ({clusters.length} clusters, {articles?.length || 0} total articles)
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["cluster-articles"] })}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Cluster ID or Theme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clusters</SelectItem>
                  <SelectItem value="draft">All Draft</SelectItem>
                  <SelectItem value="published">All Published</SelectItem>
                  <SelectItem value="mixed">Mixed Status</SelectItem>
                  <SelectItem value="partial">Partial/Failed Generation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cluster List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading clusters...</p>
            </CardContent>
          </Card>
        ) : filteredClusters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No clusters found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Generate some article clusters to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredClusters.map((cluster) => (
              <Card key={cluster.cluster_id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg truncate">
                          {cluster.cluster_theme || "Untitled Cluster"}
                        </CardTitle>
                        {getStatusBadge(cluster)}
                        {getJobStatusBadge(cluster.job_status)}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                          {cluster.cluster_id.slice(0, 8)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyClusterId(cluster.cluster_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <span className="text-muted-foreground">
                          • {cluster.total_articles} articles
                        </span>
                        <span className="text-muted-foreground">
                          • Created {new Date(cluster.created_at).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Error display for failed/partial jobs */}
                  {(cluster.job_status === "partial" || cluster.job_status === "failed") && cluster.job_error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        ❌ Translation failed
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                        {cluster.job_error.length > 150 
                          ? `${cluster.job_error.slice(0, 150)}...` 
                          : cluster.job_error}
                      </p>
                      {cluster.job_progress?.error_info && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Failed on {cluster.job_progress.error_info.failed_language?.toUpperCase() || "unknown"} 
                          {cluster.job_progress.error_info.failed_article_index 
                            ? ` article #${cluster.job_progress.error_info.failed_article_index}` 
                            : ""}
                          {" — click Complete Translations to retry"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Language breakdown */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(cluster.languages).map(([lang, stats]) => (
                      <Badge key={lang} variant="outline" className="text-sm">
                        {getLanguageFlag(lang)} {stats.total}
                        {stats.draft > 0 && stats.published > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({stats.published}✓ {stats.draft}○)
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/articles?cluster=${cluster.cluster_id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Articles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClusterToPublish(cluster.cluster_id)}
                      disabled={cluster.all_published || publishMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Publish All
                    </Button>
                    {/* Complete Translations Button - show if missing languages or partial status */}
                    {(getMissingLanguages(cluster).length > 0 || cluster.job_status === "partial") && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => setClusterToTranslate(cluster.cluster_id)}
                        disabled={translatingCluster === cluster.cluster_id || completeTranslationsMutation.isPending}
                      >
                        {translatingCluster === cluster.cluster_id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="mr-2 h-4 w-4" />
                            Complete Translations ({getMissingLanguages(cluster).length} remaining)
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateQAMutation.mutate(cluster.cluster_id)}
                      disabled={generateQAMutation.isPending}
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      {generateQAMutation.isPending ? "Starting..." : "Generate QA"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setClusterToDelete(cluster.cluster_id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Publish Confirmation Dialog */}
        <AlertDialog open={!!clusterToPublish} onOpenChange={() => setClusterToPublish(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish all articles?</AlertDialogTitle>
              <AlertDialogDescription>
                This will set all articles in this cluster to "published" status.
                They will become publicly visible on the website.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clusterToPublish && publishMutation.mutate(clusterToPublish)}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? "Publishing..." : "Publish All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!clusterToDelete} onOpenChange={() => setClusterToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all articles in cluster?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All articles in this cluster will be
                permanently deleted from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clusterToDelete && deleteMutation.mutate(clusterToDelete)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Complete Translations Confirmation Dialog */}
        <AlertDialog open={!!clusterToTranslate} onOpenChange={() => setClusterToTranslate(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-amber-600" />
                Complete Translations
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    This will translate the 6 English articles into remaining languages.
                  </p>
                  
                  {clusterToTranslate && (
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">Missing languages:</p>
                      <div className="flex flex-wrap gap-2">
                        {getMissingLanguages(clusters.find(c => c.cluster_id === clusterToTranslate) || { languages: {} } as ClusterData).map(lang => (
                          <Badge key={lang} variant="outline">
                            {getLanguageFlag(lang)} {lang.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {translationProgress && (
                    <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Last translated: {translationProgress.current}
                      </p>
                      {(() => {
                        const selectedCluster = clusters.find((c) => c.cluster_id === clusterToTranslate);
                        const totalTranslationLanguages = getAllExpectedLanguages(selectedCluster).length - 1; // exclude English
                        const completed = Math.max(0, totalTranslationLanguages - translationProgress.remaining);
                        const percent = totalTranslationLanguages > 0 ? (completed / totalTranslationLanguages) * 100 : 0;
                        return <Progress value={percent} />;
                      })()}
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {translationProgress.remaining} languages remaining
                      </p>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Each click translates <strong>1 language</strong> (6 articles)</p>
                    <p>• Takes approximately 3-5 minutes per language</p>
                    <p>• You may need to click multiple times</p>
                    <p>• Uses same images as English articles</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={completeTranslationsMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clusterToTranslate && completeTranslationsMutation.mutate(clusterToTranslate)}
                disabled={completeTranslationsMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {completeTranslationsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Start Translation
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default ClusterManager;
