import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Loader2, FolderOpen, RefreshCw, Link2, AlertTriangle, PlayCircle, Plus, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ClusterCard } from "@/components/admin/cluster-manager/ClusterCard";
import { CreateClusterDialog } from "@/components/admin/cluster-manager/CreateClusterDialog";
import { BulkImageRegenerationDialog } from "@/components/admin/cluster-manager/BulkImageRegenerationDialog";
import { ImageSharingFixDialog } from "@/components/admin/cluster-manager/ImageSharingFixDialog";
import { ImageSharingProgress } from "@/components/admin/cluster-manager/ImageSharingProgress";
import { 
  ClusterData, 
  QAJobProgress,
  getAllExpectedLanguages,
  getLanguageFlag,
  getMissingLanguages,
  getSourceLanguageInfo,
  getIncompleteLanguages 
} from "@/components/admin/cluster-manager/types";

const ClusterManager = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clusterToDelete, setClusterToDelete] = useState<string | null>(null);
  const [clusterToPublish, setClusterToPublish] = useState<string | null>(null);
  const [clusterToPublishQAs, setClusterToPublishQAs] = useState<string | null>(null);
  const [clusterToTranslate, setClusterToTranslate] = useState<string | null>(null);
  const [translatingCluster, setTranslatingCluster] = useState<string | null>(null);
  const [translationProgress, setTranslationProgress] = useState<{ 
    current: string; 
    remaining: number;
    articlesCompleted?: number;
    totalArticles?: number;
  } | null>(null);
  const [regeneratingLinks, setRegeneratingLinks] = useState<string | null>(null);
  const [regeneratingAllLinks, setRegeneratingAllLinks] = useState(false);
  const [generatingQALanguage, setGeneratingQALanguage] = useState<{ clusterId: string; lang: string } | null>(null);
  const [qaJobProgress, setQaJobProgress] = useState<QAJobProgress | null>(null);
  const [publishingQAs, setPublishingQAs] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkImageDialog, setShowBulkImageDialog] = useState(false);
  
  // Image sharing fix state
  const [clusterToFixImages, setClusterToFixImages] = useState<ClusterData | null>(null);
  const [showImageFixConfirm, setShowImageFixConfirm] = useState(false);
  const [imageFixProgress, setImageFixProgress] = useState<{
    isProcessing: boolean;
    elapsedSeconds: number;
  } | null>(null);
  const imageFixIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Realtime subscription ref
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Fetch QA counts aggregated by cluster and language (server-side aggregation)
  const { data: qaCounts } = useQuery({
    queryKey: ["cluster-qa-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cluster_qa_counts");
      
      if (error) throw error;
      return data as { cluster_id: string; language: string; total_count: number; published_count: number }[];
    },
  });

  // Fetch image health data per cluster
  const { data: imageHealthData } = useQuery({
    queryKey: ["cluster-image-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cluster_image_health");
      if (error) throw error;
      return data as { cluster_id: string; unique_images: number; total_images: number; health_percent: number }[];
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
          cluster_theme: article.cluster_theme || null,
          languages: {},
          total_articles: 0,
          all_draft: true,
          all_published: true,
          created_at: article.created_at,
          qa_pages: {},
          total_qa_pages: 0,
          total_qa_published: 0,
          expected_qa_pages: 0,
          qa_completion_percent: 0,
        });
      }

      const cluster = clusterMap.get(article.cluster_id)!;
      
      // Pick first non-null cluster_theme from any article
      if (!cluster.cluster_theme && article.cluster_theme) {
        cluster.cluster_theme = article.cluster_theme;
      }
      
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

    // Add QA page counts per cluster per language from pre-aggregated data
    qaCounts?.forEach((qa) => {
      if (!qa.cluster_id) return;
      const cluster = clusterMap.get(qa.cluster_id);
      if (cluster) {
        const total = Number(qa.total_count);
        const published = Number(qa.published_count);
        cluster.qa_pages[qa.language] = { 
          total, 
          published, 
          draft: total - published 
        };
        cluster.total_qa_pages += total;
        cluster.total_qa_published += published;
      }
    });

    // Calculate expected QA pages (4 QAs per article per language)
    // Correct: Each article gets 4 Q&A types, so total = articles × 4
    clustersArray.forEach((cluster) => {
      // Total expected = sum of (articles per language × 4)
      cluster.expected_qa_pages = cluster.total_articles * 4;
      cluster.qa_completion_percent = cluster.expected_qa_pages > 0 
        ? Math.round((cluster.total_qa_pages / cluster.expected_qa_pages) * 100)
        : 0;
    });

    // Add image health data
    imageHealthData?.forEach((health) => {
      const cluster = clusterMap.get(health.cluster_id);
      if (cluster) {
        cluster.image_health = health.health_percent;
        cluster.unique_images = Number(health.unique_images);
        cluster.total_images = Number(health.total_images);
      }
    });

    // Sort by created_at descending
    return clustersArray.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [articles, clusterJobs, qaCounts, imageHealthData]);

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
      const now = new Date().toISOString();
      
      // Phase 1: Update articles that DON'T have date_published yet
      const { error: error1 } = await supabase
        .from("blog_articles")
        .update({ 
          status: "published", 
          date_published: now 
        })
        .eq("cluster_id", clusterId)
        .is("date_published", null);
      
      if (error1) throw error1;
      
      // Phase 2: Update articles that ALREADY have date_published (only set status)
      const { error: error2 } = await supabase
        .from("blog_articles")
        .update({ status: "published" })
        .eq("cluster_id", clusterId)
        .not("date_published", "is", null);
      
      if (error2) throw error2;
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

  // Fix image sharing for a cluster
  const fixImageSharingMutation = useMutation({
    mutationFn: async (cluster: ClusterData) => {
      // Start elapsed time counter
      setImageFixProgress({ isProcessing: true, elapsedSeconds: 0 });
      imageFixIntervalRef.current = setInterval(() => {
        setImageFixProgress(prev => prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null);
      }, 1000);
      
      const { data, error } = await supabase.functions.invoke('regenerate-cluster-images', {
        body: {
          clusterId: cluster.cluster_id,
          dryRun: false,
          preserveEnglishImages: true
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Clear interval
      if (imageFixIntervalRef.current) {
        clearInterval(imageFixIntervalRef.current);
        imageFixIntervalRef.current = null;
      }
      
      toast.success(`✅ Fixed! ${data.imagesPreserved || 6} preserved, ${data.imagesShared || 54} shared`);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["cluster-image-health"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      
      // Reset after short delay
      setTimeout(() => {
        setImageFixProgress(null);
        setClusterToFixImages(null);
      }, 1500);
    },
    onError: (error) => {
      // Clear interval
      if (imageFixIntervalRef.current) {
        clearInterval(imageFixIntervalRef.current);
        imageFixIntervalRef.current = null;
      }
      
      toast.error(`Failed to fix images: ${error.message}`);
      setImageFixProgress(null);
      setClusterToFixImages(null);
    }
  });

  // Handlers for image sharing fix
  const handleFixImageSharing = (cluster: ClusterData) => {
    setClusterToFixImages(cluster);
    setShowImageFixConfirm(true);
  };

  const confirmFixImageSharing = () => {
    if (clusterToFixImages) {
      setShowImageFixConfirm(false);
      fixImageSharingMutation.mutate(clusterToFixImages);
    }
  };

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

  // Publish all Q&A pages in cluster
  const publishQAsMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setPublishingQAs(clusterId);
      const now = new Date().toISOString();
      
      // Phase 1: Update Q&As that DON'T have date_published yet
      const { data: data1, error: error1 } = await supabase
        .from("qa_pages")
        .update({ 
          status: "published", 
          date_published: now 
        })
        .eq("cluster_id", clusterId)
        .eq("status", "draft")
        .is("date_published", null)
        .select("id");
      
      if (error1) throw error1;
      
      // Phase 2: Update Q&As that ALREADY have date_published (only set status)
      const { data: data2, error: error2 } = await supabase
        .from("qa_pages")
        .update({ status: "published" })
        .eq("cluster_id", clusterId)
        .eq("status", "draft")
        .not("date_published", "is", null)
        .select("id");
      
      if (error2) throw error2;
      
      return (data1?.length || 0) + (data2?.length || 0);
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
      toast.success(`Published ${count} Q&A pages successfully`);
      setClusterToPublishQAs(null);
      setPublishingQAs(null);
    },
    onError: (error) => {
      toast.error(`Failed to publish Q&As: ${error.message}`);
      setPublishingQAs(null);
    },
  });

  // Generate QAs for article using new generate-article-qas function
  // This generates 40 Q&As per article (4 types × 10 languages)
  const generateQAsForArticleMutation = useMutation({
    mutationFn: async ({ clusterId, englishArticleId }: { clusterId: string; englishArticleId?: string }) => {
      setGeneratingQALanguage({ clusterId, lang: 'all' });
      
      if (englishArticleId) {
        // Generate for a single article
        const { data, error } = await supabase.functions.invoke("generate-article-qas", {
          body: { englishArticleId },
        });
        
        if (error) throw error;
        return { ...data, mode: 'single' };
      } else {
        // Generate for entire cluster using orchestrator
        const { data, error } = await supabase.functions.invoke("generate-cluster-qas", {
          body: { clusterId },
        });
        
        if (error) throw error;
        return { ...data, mode: 'cluster' };
      }
    },
    onSuccess: (result) => {
      if (result.mode === 'single') {
        toast.success(`Generated ${result.created} Q&As for article: ${result.articleHeadline}`);
      } else {
        toast.success(`Generated ${result.totalQAsCreated}/${result.expectedTotal} Q&As for cluster`);
        if (result.totalQAsFailed > 0) {
          toast.warning(`${result.totalQAsFailed} Q&As failed to generate`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
      setGeneratingQALanguage(null);
    },
    onError: (error) => {
      toast.error(`Failed to generate Q&As: ${error.message}`);
      setGeneratingQALanguage(null);
    },
  });

  // Poll QA job status
  const pollQAJobStatus = useCallback(async (jobId: string, clusterId: string) => {
    const maxAttempts = 600;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { data: job } = await supabase
        .from('qa_generation_jobs')
        .select('status, processed_articles, total_articles, generated_faq_pages, total_faq_pages, current_article_headline, current_language, error')
        .eq('id', jobId)
        .maybeSingle();
      
      if (!job) continue;
      
      setQaJobProgress({
        jobId,
        clusterId,
        status: job.status,
        processedArticles: job.processed_articles || 0,
        totalArticles: job.total_articles || 0,
        generatedPages: job.generated_faq_pages || 0,
        totalExpected: job.total_faq_pages || 0,
        currentArticle: job.current_article_headline || undefined,
        currentLanguage: job.current_language || undefined,
      });
      
      if (job.status === 'completed' || job.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
        queryClient.invalidateQueries({ queryKey: ["stalled-qa-jobs"] });
        if (job.status === 'completed') {
          toast.success(`Generated ${job.generated_faq_pages} QA pages!`);
        } else {
          toast.error(`QA generation failed: ${job.error || 'Unknown error'}`);
        }
        setTimeout(() => setQaJobProgress(null), 3000);
        return;
      }
      
      if (job.status === 'stalled') {
        queryClient.invalidateQueries({ queryKey: ["stalled-qa-jobs"] });
        toast.warning(`QA generation stalled. Click "Resume Job" to continue.`);
        setTimeout(() => setQaJobProgress(null), 3000);
        return;
      }
    }
  }, [queryClient]);

  // Generate QAs for next pending language in cluster
  const generateNextLanguageQAMutation = useMutation({
    mutationFn: async ({ clusterId, language, articleIds, offset = 0 }: { clusterId: string; language: string; articleIds: string[]; offset?: number }) => {
      setGeneratingQALanguage({ clusterId, lang: language });
      
      const { data, error } = await supabase.functions.invoke("generate-qa-pages", {
        body: { 
          articleIds,
          singleLanguageMode: true,
          targetLanguage: language,
          clusterId,
          offset,
        },
      });
      
      if (error) throw error;
      return { ...data, clusterId, language, articleIds };
    },
    onSuccess: (result) => {
      const { language, generatedPages, skippedPages, failedPages, needsContinuation, nextOffset, remainingArticles, clusterId, articleIds, totalArticlesInLanguage } = result;
      
      if (failedPages && failedPages > 0) {
        if (generatedPages > 0) {
          toast.warning(`Generated ${generatedPages} QA pages for ${language.toUpperCase()}, but ${failedPages} failed`);
        } else {
          toast.error(`Failed to generate QAs for ${language.toUpperCase()} (${failedPages} failed)`);
        }
      } else if (generatedPages > 0) {
        if (needsContinuation) {
          toast.info(`Generated ${generatedPages} QAs for ${language.toUpperCase()} (${nextOffset}/${totalArticlesInLanguage} articles done)`);
        } else {
          toast.success(`Generated ${generatedPages} QA pages for ${language.toUpperCase()}`);
        }
      } else if (skippedPages > 0) {
        if (needsContinuation) {
          toast.info(`Skipped ${skippedPages} existing QAs. Continuing...`);
        } else {
          toast.info(`${language.toUpperCase()} already complete`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
      setGeneratingQALanguage(null);
      
      if (needsContinuation && clusterId && articleIds && nextOffset !== undefined) {
        setTimeout(() => {
          toast.info(`Continuing ${language.toUpperCase()} QA generation...`);
          generateNextLanguageQAMutation.mutate({ clusterId, language, articleIds, offset: nextOffset });
        }, 1500);
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate QAs: ${error.message}`);
      setGeneratingQALanguage(null);
    },
  });

  // Get next language that needs QA generation
  const getNextPendingQALanguage = useCallback((cluster: ClusterData) => {
    const expectedLanguages = getAllExpectedLanguages(cluster);
    
    for (const lang of expectedLanguages) {
      const langStats = cluster.languages[lang];
      if (!langStats) continue;
      
      const expectedQAs = langStats.total * 4;
      const qaStats = cluster.qa_pages[lang];
      const actualQAs = qaStats?.total || 0;
      
      if (actualQAs < expectedQAs) {
        return {
          language: lang,
          missing: expectedQAs - actualQAs,
          expected: expectedQAs,
          actual: actualQAs,
        };
      }
    }
    return null;
  }, []);

  // Get QA language status for a cluster
  const getQALanguageStatus = useCallback((cluster: ClusterData) => {
    const expectedLanguages = getAllExpectedLanguages(cluster);
    const statuses: { lang: string; status: 'complete' | 'partial' | 'none'; count: number; published: number; expected: number }[] = [];
    
    for (const lang of expectedLanguages) {
      const langStats = cluster.languages[lang];
      if (!langStats) continue;
      
      const expectedQAs = langStats.total * 4;
      const qaStats = cluster.qa_pages[lang];
      const actualQAs = qaStats?.total || 0;
      const publishedQAs = qaStats?.published || 0;
      
      let status: 'complete' | 'partial' | 'none' = 'none';
      if (actualQAs >= expectedQAs) {
        status = 'complete';
      } else if (actualQAs > 0) {
        status = 'partial';
      }
      
      statuses.push({ lang, status, count: actualQAs, published: publishedQAs, expected: expectedQAs });
    }
    
    return statuses;
  }, []);

  // Query for stalled QA jobs
  const { data: stalledQAJobs } = useQuery({
    queryKey: ["stalled-qa-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_generation_jobs")
        .select("id, cluster_id, status, generated_faq_pages, total_faq_pages, current_article_headline, resume_from_article_index")
        .eq("status", "stalled")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Resume stalled QA job mutation
  const resumeQAJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-qa-pages", {
        body: { resumeJobId: jobId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Resumed job from article ${data.resumeFromArticle || 0}`);
      queryClient.invalidateQueries({ queryKey: ["stalled-qa-jobs"] });
      
      setQaJobProgress({
        jobId: data.jobId,
        clusterId: data.clusterId || '',
        status: 'running',
        processedArticles: data.resumeFromArticle || 0,
        totalArticles: 6,
        generatedPages: data.actualPages || 0,
        totalExpected: data.totalExpected || 240,
        currentArticle: 'Resuming...',
      });
      
      pollQAJobStatus(data.jobId, data.clusterId || '');
    },
    onError: (error) => {
      toast.error(`Failed to resume job: ${error.message}`);
    },
  });

  // Resume ALL stalled jobs at once
  const resumeAllStalledJobsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-resume-qa-jobs", {
        body: { 
          stalledThresholdMinutes: 1,
          autoResume: true,
          dryRun: false,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.resumedJobs > 0) {
        toast.success(`Resumed ${data.resumedJobs} stalled job(s)`);
      } else if (data.stalledJobsFound === 0) {
        toast.info("No stalled jobs found");
      } else {
        toast.warning(`Found ${data.stalledJobsFound} stalled jobs but couldn't resume any`);
      }
      queryClient.invalidateQueries({ queryKey: ["stalled-qa-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
    },
    onError: (error) => {
      toast.error(`Failed to resume jobs: ${error.message}`);
    },
  });

  // Check for stalled jobs
  const checkForStalledJobsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-resume-qa-jobs", {
        body: { 
          stalledThresholdMinutes: 10,
          autoResume: false,
          dryRun: false,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.stalledJobsFound > 0) {
        toast.info(`Found ${data.stalledJobsFound} stalled job(s). Click "Resume All" to continue.`);
        queryClient.invalidateQueries({ queryKey: ["stalled-qa-jobs"] });
      }
    },
  });

  // Periodically check for stalled jobs
  useEffect(() => {
    const interval = setInterval(() => {
      checkForStalledJobsMutation.mutate();
    }, 60000);
    
    checkForStalledJobsMutation.mutate();
    
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription for translation progress updates
  useEffect(() => {
    if (!translatingCluster) {
      // Clean up subscription when not translating
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    console.log(`[Realtime] Subscribing to translation updates for ${translatingCluster}`);

    const channel = supabase
      .channel(`translation-${translatingCluster}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cluster_generations',
          filter: `id=eq.${translatingCluster}`,
        },
        (payload: any) => {
          console.log('[Realtime] Received update:', payload.new?.progress);
          const progress = payload.new?.progress;
          if (progress) {
            setTranslationProgress({
              current: progress.current_language?.toUpperCase() || 'Processing',
              remaining: progress.remaining_languages?.length || 0,
              articlesCompleted: progress.generated_articles || 0,
              totalArticles: progress.total_articles || 60,
            });
          }

          // Refresh article list for live grid updates
          queryClient.invalidateQueries({ 
            queryKey: ["cluster-articles", translatingCluster] 
          });
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status: ${status}`);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log(`[Realtime] Cleaning up subscription for ${translatingCluster}`);
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [translatingCluster, queryClient]);

  // Poll job status with quick intervals for responsive UI
  const pollJobStatus = async (clusterId: string): Promise<{ 
    status: string; 
    error?: string; 
    progress?: any; 
    languages_queue?: string[]; 
    completed_languages?: string[];
    updated_at?: string;
  }> => {
    const { data: job } = await supabase
      .from("cluster_generations")
      .select("status, error, progress, languages_queue, completed_languages, updated_at")
      .eq("id", clusterId)
      .single();
    
    if (job) {
      return { 
        status: job.status, 
        error: job.error, 
        progress: job.progress, 
        languages_queue: job.languages_queue, 
        completed_languages: job.completed_languages,
        updated_at: job.updated_at 
      };
    }
    return { status: "unknown" };
  };

  // Complete translations with robust polling-based approach
  const completeTranslationsMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setTranslatingCluster(clusterId);

      const clusterData = clusters.find(c => c.cluster_id === clusterId);
      const sourceInfo = clusterData ? getSourceLanguageInfo(clusterData) : { needsMoreSource: false };
      
      const functionName = sourceInfo.needsMoreSource 
        ? "complete-incomplete-cluster" 
        : "translate-cluster";
      
      const bodyParam = sourceInfo.needsMoreSource 
        ? { clusterId, dryRun: false }
        : { jobId: clusterId };

      const MAX_ELAPSED_MS = 30 * 60 * 1000; // 30 minutes max
      const MAX_INVOCATIONS = 300; // Safety limit
      const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds when waiting
      const STUCK_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - consider stuck
      
      const startTime = Date.now();
      let invocations = 0;
      let lastResult: any = null;

      // Main loop: invoke function, then poll until ready for next invoke
      while (Date.now() - startTime < MAX_ELAPSED_MS && invocations < MAX_INVOCATIONS) {
        invocations++;
        
        // Check current status before invoking
        const currentStatus = await pollJobStatus(clusterId);
        
        // If completed, verify actual article count before trusting status
        if (currentStatus.status === "completed") {
          const { count } = await supabase
            .from('blog_articles')
            .select('*', { count: 'exact', head: true })
            .eq('cluster_id', clusterId);
          
          // If we have 60 articles (6 × 10 languages), truly complete
          if (count && count >= 60) {
            console.log(`[Translation] Verified complete with ${count} articles`);
            return { status: "completed", totalArticles: count };
          }
          
          // Otherwise, status is stale - continue translation
          console.log(`[Translation] Status says complete but only ${count} articles. Continuing...`);
        }
        
        // If generating and recently updated, wait and poll instead of invoking
        if (currentStatus.status === "generating" && currentStatus.updated_at) {
          const timeSinceUpdate = Date.now() - new Date(currentStatus.updated_at).getTime();
          if (timeSinceUpdate < STUCK_THRESHOLD_MS) {
            console.log(`[Translation] Job generating (${Math.round(timeSinceUpdate / 1000)}s ago), polling...`);
            const completedLangs = currentStatus.completed_languages?.length || 0;
            setTranslationProgress({ 
              current: currentStatus.progress?.current_language?.toUpperCase() || 'Processing', 
              remaining: currentStatus.languages_queue?.filter((l: string) => 
                !currentStatus.completed_languages?.includes(l)
              ).length || 0,
              articlesCompleted: completedLangs * 6 + (currentStatus.progress?.generated_articles || 0),
              totalArticles: 60
            });
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            continue;
          }
        }
        
        // Invoke the translation function
        try {
          console.log(`[Translation] Invoking ${functionName} (invocation ${invocations})...`);
          const { data, error } = await supabase.functions.invoke(functionName, {
            body: bodyParam,
          });

          if (error) {
            const errorMsg = error.message || String(error);
            if (errorMsg.includes("Failed to fetch") || errorMsg.includes("network") || errorMsg.includes("timeout") || errorMsg.includes("shutdown")) {
              // Network error - wait and poll status
              console.log(`[Translation] Network error, polling status...`);
              toast.info(`Connection issue — checking status... (${invocations})`);
              await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
              continue;
            }
            throw error;
          }

          lastResult = data;
          console.log(`[Translation] Response:`, data?.status, data?.message);
          
          // Handle response status
          if (data.status === "completed") {
            return data;
          }
          
          if (data.status === "generating") {
            // Backend said it's already running - poll and wait
            console.log(`[Translation] Backend says already running, polling...`);
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            continue;
          }
          
          if (data.status === "partial") {
            // More work to do - update progress and continue
            const remaining = data.remainingLanguages || [];
            const completedCount = data.completedLanguages?.length || 0;
setTranslationProgress({ 
  current: data.language?.toUpperCase() || 'Processing', 
  remaining: remaining.length,
  articlesCompleted: data.articlesTranslated || 0,
  totalArticles: data.totalArticles || 60
});
            
            if (remaining.length === 0) {
              // Actually complete
              return { ...data, status: "completed" };
            }
            
            // Brief delay before next invoke
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          
          // Unknown status - poll and continue
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
          
        } catch (err: any) {
          const errorMsg = err.message || String(err);
          if (errorMsg.includes("Failed to fetch") || errorMsg.includes("network") || errorMsg.includes("timeout") || errorMsg.includes("shutdown")) {
            // Network error - wait and continue
            console.log(`[Translation] Caught network error, polling...`);
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            continue;
          }
          throw err;
        }
      }
      
      // Time or invocation limit reached - check final status
      const finalStatus = await pollJobStatus(clusterId);
      if (finalStatus.status === "completed") {
        return { status: "completed", totalArticles: finalStatus.progress?.generated_articles || 60 };
      }
      
      return lastResult || { 
        status: "partial", 
        message: `Stopped after ${invocations} invocations / ${Math.round((Date.now() - startTime) / 60000)} min. Click again to continue.` 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-jobs"] });
      
      if (result.status === "completed") {
        toast.success(`All translations completed! Total: ${result.totalArticles || 60} articles`);
        setTranslationProgress(null);
      } else if (result.status === "partial" || result.language) {
        const remaining = result.remainingLanguages || [];
        toast.success(`Translated ${result.language?.toUpperCase() || 'language'}`, {
          description: remaining.length > 0 
            ? `${remaining.length} languages left: ${remaining.map((l: string) => getLanguageFlag(l)).join(' ')}`
            : 'All languages complete!'
        });
        if (remaining.length > 0) {
          setTranslationProgress({ 
            current: result.language?.toUpperCase() || 'Unknown', 
            remaining: remaining.length 
          });
        } else {
          setTranslationProgress(null);
        }
      } else {
        toast.success("Translation batch completed");
        setTranslationProgress(null);
      }
      
      setTranslatingCluster(null);
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

  // Regenerate strategic internal links for cluster
  const regenerateLinksMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setRegeneratingLinks(clusterId);
      const { data, error } = await supabase.functions.invoke('regenerate-cluster-links', {
        body: { clusterId, dryRun: false }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Regenerated links for ${data.summary?.totalArticles || 0} articles`);
      setRegeneratingLinks(null);
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to regenerate links: ${error.message}`);
      setRegeneratingLinks(null);
    }
  });

  // Bulk regenerate strategic internal links for ALL clusters
  const regenerateAllLinksMutation = useMutation({
    mutationFn: async () => {
      setRegeneratingAllLinks(true);
      const { data, error } = await supabase.functions.invoke('regenerate-all-cluster-links', {
        body: { batchSize: 50, dryRun: false }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const summary = data.summary;
      toast.success(`Regenerated links for ${summary?.totalArticles || 0} articles across ${summary?.totalClusters || 0} clusters`);
      setRegeneratingAllLinks(false);
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to regenerate all links: ${error.message}`);
      setRegeneratingAllLinks(false);
    }
  });

  const copyClusterId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Cluster ID copied to clipboard");
  };

  // Calculate image health summary
  const imageHealthSummary = useMemo(() => {
    const healthy = clusters.filter(c => c.unique_images === 6).length;
    const needsFix = clusters.filter(c => c.unique_images !== undefined && c.unique_images !== 6).length;
    const unknown = clusters.filter(c => c.unique_images === undefined).length;
    return { healthy, needsFix, unknown, total: clusters.length };
  }, [clusters]);

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cluster Control Center</h1>
            <p className="text-muted-foreground">
              Manage article clusters ({clusters.length} clusters, {articles?.length || 0} total articles)
            </p>
            {/* Image Health Summary */}
            {(imageHealthSummary.healthy > 0 || imageHealthSummary.needsFix > 0) && (
              <div className="flex gap-3 mt-2 text-sm">
                {imageHealthSummary.healthy > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ {imageHealthSummary.healthy} images healthy
                  </span>
                )}
                {imageHealthSummary.needsFix > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    ⚠️ {imageHealthSummary.needsFix} need fix
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Cluster
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowBulkImageDialog(true)}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Bulk Regenerate Images
            </Button>
            <Button 
              variant="outline"
              onClick={() => regenerateAllLinksMutation.mutate()}
              disabled={regeneratingAllLinks}
            >
              {regeneratingAllLinks ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating All...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Regenerate All Links
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["cluster-articles"] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
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

        {/* Stalled QA Jobs Alert */}
        {stalledQAJobs && stalledQAJobs.length > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      {stalledQAJobs.length} stalled QA generation job{stalledQAJobs.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Total progress: {stalledQAJobs.reduce((sum, j) => sum + (j.generated_faq_pages || 0), 0)}/
                      {stalledQAJobs.reduce((sum, j) => sum + (j.total_faq_pages || 0), 0)} pages
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {stalledQAJobs.length === 1 ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => resumeQAJobMutation.mutate(stalledQAJobs[0].id)}
                      disabled={resumeQAJobMutation.isPending}
                    >
                      {resumeQAJobMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resuming...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Resume Job
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => resumeAllStalledJobsMutation.mutate()}
                      disabled={resumeAllStalledJobsMutation.isPending}
                    >
                      {resumeAllStalledJobsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resuming All...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Resume All ({stalledQAJobs.length} jobs)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <ClusterCard
                key={cluster.cluster_id}
                cluster={cluster}
                onPublish={() => setClusterToPublish(cluster.cluster_id)}
                onDelete={() => setClusterToDelete(cluster.cluster_id)}
                onPublishQAs={() => setClusterToPublishQAs(cluster.cluster_id)}
                onTranslate={() => setClusterToTranslate(cluster.cluster_id)}
                onRegenerateLinks={() => regenerateLinksMutation.mutate(cluster.cluster_id)}
                onSEOAudit={() => {}}
                onGenerateQAs={() => {
                  generateQAsForArticleMutation.mutate({ clusterId: cluster.cluster_id });
                }}
                onFixImageSharing={handleFixImageSharing}
                isPublishing={clusterToPublish === cluster.cluster_id && publishMutation.isPending}
                isDeleting={clusterToDelete === cluster.cluster_id && deleteMutation.isPending}
                isTranslating={translatingCluster === cluster.cluster_id}
                translationProgress={translatingCluster === cluster.cluster_id ? translationProgress : null}
                isRegeneratingLinks={regeneratingLinks === cluster.cluster_id}
                isAuditing={false}
                isFixingImages={fixImageSharingMutation.isPending}
                fixingClusterId={clusterToFixImages?.cluster_id || null}
                generatingQALanguage={generatingQALanguage?.clusterId === cluster.cluster_id ? generatingQALanguage : null}
                publishingQAs={publishingQAs === cluster.cluster_id ? cluster.cluster_id : null}
              />
            ))}
          </div>
        )}

        {/* Publish Articles Confirmation Dialog */}
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

        {/* Publish Q&As Confirmation Dialog */}
        <AlertDialog open={!!clusterToPublishQAs} onOpenChange={() => setClusterToPublishQAs(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish all Q&A pages?</AlertDialogTitle>
              <AlertDialogDescription>
                {clusterToPublishQAs && (() => {
                  const cluster = clusters.find(c => c.cluster_id === clusterToPublishQAs);
                  const draftCount = cluster ? (cluster.total_qa_pages - cluster.total_qa_published) : 0;
                  return `This will publish ${draftCount} draft Q&A pages in this cluster.`;
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clusterToPublishQAs && publishQAsMutation.mutate(clusterToPublishQAs)}
                disabled={publishQAsMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {publishQAsMutation.isPending ? "Publishing..." : "Publish All QAs"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Complete Translations Confirmation Dialog */}
        <AlertDialog open={!!clusterToTranslate} onOpenChange={() => setClusterToTranslate(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Translations</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>This will translate the 6 English articles into remaining languages.</p>
                  
                  {clusterToTranslate && (
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <p className="text-sm font-medium">Missing languages:</p>
                      <div className="flex flex-wrap gap-2">
                        {getMissingLanguages(clusters.find(c => c.cluster_id === clusterToTranslate) || { languages: {} } as ClusterData).map(lang => (
                          <span key={lang} className="text-sm">
                            {getLanguageFlag(lang)} {lang.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Each click translates 1 language (6 articles)</p>
                    <p>• Takes approximately 3-5 minutes per language</p>
                  </div>
                  
                  {completeTranslationsMutation.isPending && (
                    <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-sm text-blue-700 dark:text-blue-300">
                      Translation is running in the background. You can close this dialog and check the Articles tab for progress.
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {completeTranslationsMutation.isPending ? 'Hide (continues in background)' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clusterToTranslate && completeTranslationsMutation.mutate(clusterToTranslate)}
                disabled={completeTranslationsMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {completeTranslationsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translationProgress ? (
                      `Translating ${translationProgress.current}... (${translationProgress.articlesCompleted || 0}/${translationProgress.totalArticles || 60})`
                    ) : (
                      'Starting translation...'
                    )}
                  </>
                ) : (
                  "Start Translation"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Cluster Dialog */}
        <CreateClusterDialog 
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onClusterCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
            queryClient.invalidateQueries({ queryKey: ["cluster-jobs"] });
          }}
        />

        {/* Bulk Image Regeneration Dialog */}
        <BulkImageRegenerationDialog
          open={showBulkImageDialog}
          onOpenChange={setShowBulkImageDialog}
          clusters={clusters}
          imageHealthData={imageHealthData}
        />

        {/* Image Sharing Fix Confirmation Dialog */}
        <ImageSharingFixDialog
          cluster={clusterToFixImages}
          isOpen={showImageFixConfirm}
          onConfirm={confirmFixImageSharing}
          onCancel={() => {
            setShowImageFixConfirm(false);
            setClusterToFixImages(null);
          }}
        />

        {/* Image Sharing Progress Overlay */}
        <ImageSharingProgress
          cluster={clusterToFixImages}
          isOpen={!!imageFixProgress?.isProcessing}
          elapsedSeconds={imageFixProgress?.elapsedSeconds}
        />
      </div>
    </AdminLayout>
  );
};

export default ClusterManager;
