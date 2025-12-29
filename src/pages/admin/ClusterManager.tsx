import { useState, useMemo, useEffect, useCallback } from "react";
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
import { Search, Eye, Trash2, CheckCircle, HelpCircle, Copy, Loader2, FolderOpen, RefreshCw, Globe, Languages, Shield, Link, Link2, StopCircle } from "lucide-react";
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
  qa_pages: Record<string, number>;
  total_qa_pages: number;
  expected_qa_pages: number; // articles × 4 QAs per article
  qa_completion_percent: number;
}

interface QAJobProgress {
  jobId: string;
  clusterId: string;
  status: string;
  processedArticles: number;
  totalArticles: number;
  generatedPages: number;
  totalExpected: number;
  currentArticle?: string;
  currentLanguage?: string;
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
  const [regeneratingLinks, setRegeneratingLinks] = useState<string | null>(null);
  const [regeneratingAllLinks, setRegeneratingAllLinks] = useState(false);
  const [generatingQALanguage, setGeneratingQALanguage] = useState<{ clusterId: string; lang: string } | null>(null);
  const [qaJobProgress, setQaJobProgress] = useState<QAJobProgress | null>(null);

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

  // Fetch QA pages grouped by cluster and language
  const { data: qaPages } = useQuery({
    queryKey: ["cluster-qa-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_pages")
        .select("cluster_id, language")
        .not("cluster_id", "is", null);
      
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
          qa_pages: {},
          total_qa_pages: 0,
          expected_qa_pages: 0,
          qa_completion_percent: 0,
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

    // Add QA page counts per cluster per language
    qaPages?.forEach((qa) => {
      if (!qa.cluster_id) return;
      const cluster = clusterMap.get(qa.cluster_id);
      if (cluster) {
        cluster.qa_pages[qa.language] = (cluster.qa_pages[qa.language] || 0) + 1;
        cluster.total_qa_pages++;
      }
    });

    // Calculate expected QA pages (4 QAs per article) and completion percent
    clustersArray.forEach((cluster) => {
      cluster.expected_qa_pages = cluster.total_articles * 4;
      cluster.qa_completion_percent = cluster.expected_qa_pages > 0 
        ? Math.round((cluster.total_qa_pages / cluster.expected_qa_pages) * 100)
        : 0;
    });

    // Sort by created_at descending
    return clustersArray.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [articles, clusterJobs, qaPages]);

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
      // Get English article IDs in the cluster (both draft and published)
      const { data: clusterArticles, error: fetchError } = await supabase
        .from("blog_articles")
        .select("id")
        .eq("cluster_id", clusterId)
        .eq("language", "en")
        .in("status", ["draft", "published"]);
      
      if (fetchError) throw fetchError;
      
      if (!clusterArticles || clusterArticles.length === 0) {
        throw new Error("No English articles found in this cluster");
      }
      
      const articleIds = clusterArticles.map((a) => a.id);
      
      // Invoke QA generation edge function with proper parameters
      const { error } = await supabase.functions.invoke("generate-qa-pages", {
        body: { 
          articleIds,
          languages: ['all'],
          mode: 'bulk'
        },
      });
      
      if (error) throw error;
      return articleIds.length;
    },
    onSuccess: (count) => {
      toast.success(`QA generation started for ${count} articles`);
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
    },
    onError: (error) => {
      toast.error(`Failed to start QA generation: ${error.message}`);
    },
  });

  // Generate QAs for specific language in cluster
  const generateQAsForLanguageMutation = useMutation({
    mutationFn: async ({ clusterId, language }: { clusterId: string; language: string }) => {
      setGeneratingQALanguage({ clusterId, lang: language });
      
      // Get articles in this cluster and language (both draft and published)
      const { data: clusterArticles, error: fetchError } = await supabase
        .from("blog_articles")
        .select("id")
        .eq("cluster_id", clusterId)
        .eq("language", language)
        .in("status", ["draft", "published"]);
      
      if (fetchError) throw fetchError;
      if (!clusterArticles || clusterArticles.length === 0) {
        throw new Error(`No ${language.toUpperCase()} articles found in this cluster`);
      }
      
      let totalGenerated = 0;
      
      // For each article, call completeMissing mode to fill in gaps
      for (const article of clusterArticles) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-qa-pages", {
            body: { 
              articleIds: [article.id],
              languages: [language],
              completeMissing: true
            },
          });
          
          if (error) {
            console.error(`Failed to generate QAs for article ${article.id}:`, error);
          } else {
            totalGenerated += data?.generatedPages || 0;
          }
        } catch (err) {
          console.error(`Error generating QAs for article ${article.id}:`, err);
        }
      }
      
      return { language, totalGenerated, articleCount: clusterArticles.length };
    },
    onSuccess: ({ language, totalGenerated }) => {
      toast.success(`Generated ${totalGenerated} QA pages for ${language.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
      setGeneratingQALanguage(null);
    },
    onError: (error) => {
      toast.error(`Failed to generate QAs: ${error.message}`);
      setGeneratingQALanguage(null);
    },
  });

  // Poll QA job status
  const pollQAJobStatus = useCallback(async (jobId: string, clusterId: string) => {
    const maxAttempts = 600; // 50 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      
      const { data: job } = await supabase
        .from('qa_generation_jobs')
        .select('status, processed_articles, total_articles, generated_faq_pages, total_faq_pages, current_article_headline, current_language, error')
        .eq('id', jobId)
        .single();
      
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
        if (job.status === 'completed') {
          toast.success(`Generated ${job.generated_faq_pages} QA pages!`);
        } else {
          toast.error(`QA generation failed: ${job.error || 'Unknown error'}`);
        }
        setTimeout(() => setQaJobProgress(null), 3000);
        return;
      }
    }
  }, [queryClient]);

  // Generate ALL missing QAs for entire cluster (background mode)
  const generateAllMissingQAsMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      // Get all English articles in cluster
      const { data: englishArticles, error: fetchError } = await supabase
        .from("blog_articles")
        .select("id")
        .eq("cluster_id", clusterId)
        .eq("language", "en")
        .in("status", ["draft", "published"]);
      
      if (fetchError) throw fetchError;
      if (!englishArticles || englishArticles.length === 0) {
        throw new Error("No English articles found in this cluster");
      }
      
      const articleIds = englishArticles.map((a) => a.id);
      
      // Call with backgroundMode for immediate return
      const { data, error } = await supabase.functions.invoke("generate-qa-pages", {
        body: { 
          articleIds,
          languages: ['all'],
          completeMissing: true,
          backgroundMode: true,
          clusterId
        },
      });
      
      if (error) throw error;
      return { ...data, clusterId, articleCount: englishArticles.length };
    },
    onSuccess: ({ jobId, clusterId, totalExpected, articleCount }) => {
      toast.success(`Background QA generation started for ${articleCount} articles`);
      setQaJobProgress({
        jobId,
        clusterId,
        status: 'running',
        processedArticles: 0,
        totalArticles: articleCount,
        generatedPages: 0,
        totalExpected: totalExpected || articleCount * 40,
        currentArticle: 'Starting...',
      });
      // Start polling in background
      pollQAJobStatus(jobId, clusterId);
    },
    onError: (error) => {
      toast.error(`Failed to start QA generation: ${error.message}`);
    },
  });

  // Poll job status after network disconnect
  const pollJobStatus = async (clusterId: string, maxAttempts = 15): Promise<{ status: string; error?: string; progress?: any; languages_queue?: string[]; completed_languages?: string[] }> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: job } = await supabase
        .from("cluster_generations")
        .select("status, error, progress, languages_queue, completed_languages")
        .eq("id", clusterId)
        .single();
      
      if (job) {
        if (job.status === "completed") {
          return { status: "completed", progress: job.progress, languages_queue: job.languages_queue, completed_languages: job.completed_languages };
        }
        if (job.status === "partial" || job.status === "generating" || job.status === "failed") {
          return { status: job.status, error: job.error, progress: job.progress, languages_queue: job.languages_queue, completed_languages: job.completed_languages };
        }
        // Still in progress, continue polling
      }
    }
    return { status: "timeout", error: "Job status check timed out" };
  };

  // Complete translations for cluster (or complete cluster if < 6 source articles)
  const completeTranslationsMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setTranslatingCluster(clusterId);

      // Check if cluster needs more source articles first
      const clusterData = clusters.find(c => c.cluster_id === clusterId);
      const sourceInfo = clusterData ? getSourceLanguageInfo(clusterData) : { needsMoreSource: false };
      
      // Use complete-incomplete-cluster if source articles < 6, otherwise translate-cluster
      const functionName = sourceInfo.needsMoreSource 
        ? "complete-incomplete-cluster" 
        : "translate-cluster";
      
      const bodyParam = sourceInfo.needsMoreSource 
        ? { clusterId, dryRun: false }
        : { jobId: clusterId };

      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: bodyParam,
        });

        if (error) {
          const errorMsg = error.message || String(error);
          // Check for network errors that might be false negatives
          if (errorMsg.includes("Failed to fetch") || errorMsg.includes("network") || errorMsg.includes("timeout")) {
            toast.info("Connection lost — checking job status...");
            const polledResult = await pollJobStatus(clusterId);
            
            if (polledResult.status === "completed") {
              return { status: "completed", totalArticles: polledResult.progress?.generated_articles };
            } else if (polledResult.status === "partial" || polledResult.status === "generating") {
              // Partial/generating means translations are in progress - this is success, not error
              return { 
                status: "partial", 
                language: polledResult.progress?.current_language,
                remainingLanguages: polledResult.languages_queue?.filter((l: string) => !polledResult.completed_languages?.includes(l)),
                totalArticles: polledResult.progress?.generated_articles 
              };
            } else if (polledResult.status === "failed") {
              throw new Error(polledResult.error || "Translation job failed");
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
          } else if (polledResult.status === "partial" || polledResult.status === "generating") {
            // Partial/generating means translations are in progress - this is success, not error
            return { 
              status: "partial", 
              language: polledResult.progress?.current_language,
              remainingLanguages: polledResult.languages_queue?.filter((l: string) => !polledResult.completed_languages?.includes(l)),
              totalArticles: polledResult.progress?.generated_articles 
            };
          } else if (polledResult.status === "failed") {
            throw new Error(polledResult.error || "Translation job failed");
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
      toast.success(`Regenerated links for ${data.summary?.totalArticles || 0} articles`, {
        description: `Strategic funnel-based linking applied (max 3 links per article)`
      });
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
      toast.success(`Regenerated links for ${summary?.totalArticles || 0} articles across ${summary?.totalClusters || 0} clusters`, {
        description: `Strategic funnel-based linking applied (max 3 links per article)`
      });
      setRegeneratingAllLinks(false);
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to regenerate all links: ${error.message}`);
      setRegeneratingAllLinks(false);
    }
  });

  const getMissingLanguages = (cluster: ClusterData) => {
    const existingLanguages = new Set(Object.keys(cluster.languages));
    return getAllExpectedLanguages(cluster).filter((lang) => !existingLanguages.has(lang));
  };

  // Detect if cluster needs more source articles (< 6 in any single language)
  const getSourceLanguageInfo = (cluster: ClusterData) => {
    // Find the "source" language - the one with articles (preferring 'en' if exists)
    const langCounts = Object.entries(cluster.languages).map(([lang, stats]) => ({
      lang,
      count: stats.total
    }));
    
    // Sort by count desc, prefer English if equal
    langCounts.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.lang === 'en') return -1;
      if (b.lang === 'en') return 1;
      return 0;
    });
    
    const sourceInfo = langCounts[0];
    if (!sourceInfo) return { sourceLanguage: 'en', sourceCount: 0, needsMoreSource: true };
    
    return {
      sourceLanguage: sourceInfo.lang,
      sourceCount: sourceInfo.count,
      needsMoreSource: sourceInfo.count < 6
    };
  };

  // Detect languages with incomplete translations (1-5 articles instead of 6)
  const getIncompleteLanguages = (cluster: ClusterData) => {
    return Object.entries(cluster.languages)
      .filter(([lang, stats]) => stats.total > 0 && stats.total < 6)
      .map(([lang, stats]) => ({ lang, count: stats.total }));
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
          <div className="flex gap-2">
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
                        {/* QA Progress: show expected vs actual */}
                        <span className={`font-medium ${
                          cluster.qa_completion_percent === 100 
                            ? 'text-green-600 dark:text-green-400' 
                            : cluster.qa_completion_percent > 0 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : 'text-muted-foreground'
                        }`}>
                          • QAs: {cluster.total_qa_pages}/{cluster.expected_qa_pages} ({cluster.qa_completion_percent}%)
                          {cluster.qa_completion_percent === 100 ? ' ✅' : cluster.qa_completion_percent > 0 ? ' ⚠️' : ' ❌'}
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

                  {/* Language breakdown with QA counts */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(cluster.languages).map(([lang, stats]) => {
                      const expectedQAs = stats.total * 4;
                      const actualQAs = cluster.qa_pages[lang] || 0;
                      const missingQAs = expectedQAs - actualQAs;
                      const langPercent = expectedQAs > 0 ? Math.round((actualQAs / expectedQAs) * 100) : 0;
                      const isGenerating = generatingQALanguage?.clusterId === cluster.cluster_id && generatingQALanguage?.lang === lang;
                      
                      return (
                        <div key={lang} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-sm">
                            {getLanguageFlag(lang)} {stats.total}
                            <span className={`ml-1 ${
                              langPercent === 100 
                                ? 'text-green-600 dark:text-green-400' 
                                : langPercent > 0 
                                  ? 'text-amber-600 dark:text-amber-400' 
                                  : 'text-muted-foreground'
                            }`}>
                              | {actualQAs}/{expectedQAs}Q
                              {langPercent === 100 ? ' ✅' : langPercent > 0 ? ' ⚠️' : ''}
                            </span>
                            {stats.draft > 0 && stats.published > 0 && (
                              <span className="text-muted-foreground ml-1">
                                ({stats.published}✓ {stats.draft}○)
                              </span>
                            )}
                          </Badge>
                          {missingQAs > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"
                              onClick={() => generateQAsForLanguageMutation.mutate({ clusterId: cluster.cluster_id, language: lang })}
                              disabled={isGenerating || qaJobProgress?.clusterId === cluster.cluster_id}
                            >
                              {isGenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                `+${missingQAs}`
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/clusters/${cluster.cluster_id}/audit`)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      AEO Audit
                    </Button>
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
                    {/* Complete Cluster / Translations Button */}
                    {(() => {
                      const sourceInfo = getSourceLanguageInfo(cluster);
                      const missingLangs = getMissingLanguages(cluster);
                      const incompleteLangs = getIncompleteLanguages(cluster);
                      const showButton = sourceInfo.needsMoreSource || missingLangs.length > 0 || incompleteLangs.length > 0 || cluster.job_status === "partial";
                      
                      if (!showButton) return null;
                      
                      // Show "Complete Cluster" if source articles < 6, otherwise "Complete Translations"
                      const isCompleteCluster = sourceInfo.needsMoreSource;
                      
                      // Build label for incomplete languages
                      const getButtonLabel = () => {
                        if (isCompleteCluster) {
                          return `Complete Cluster (${sourceInfo.sourceCount}/6 ${getLanguageFlag(sourceInfo.sourceLanguage)})`;
                        }
                        if (missingLangs.length > 0) {
                          return `Complete Translations (${missingLangs.length} missing)`;
                        }
                        if (incompleteLangs.length > 0) {
                          const incompleteInfo = incompleteLangs.map(l => `${getLanguageFlag(l.lang)}${l.count}/6`).join(", ");
                          return `Complete Translations (${incompleteInfo})`;
                        }
                        return "Complete Translations";
                      };
                      
                      return (
                        <Button
                          variant="default"
                          size="sm"
                          className={isCompleteCluster 
                            ? "bg-blue-600 hover:bg-blue-700 text-white" 
                            : "bg-amber-600 hover:bg-amber-700 text-white"}
                          onClick={() => setClusterToTranslate(cluster.cluster_id)}
                          disabled={translatingCluster === cluster.cluster_id || completeTranslationsMutation.isPending}
                        >
                          {translatingCluster === cluster.cluster_id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {isCompleteCluster ? "Completing..." : "Translating..."}
                            </>
                          ) : (
                            <>
                              {isCompleteCluster ? <Globe className="mr-2 h-4 w-4" /> : <Languages className="mr-2 h-4 w-4" />}
                              {getButtonLabel()}
                            </>
                          )}
                        </Button>
                      );
                    })()}
                    {/* Generate All Missing QAs Button */}
                    {(() => {
                      const missingQAs = cluster.expected_qa_pages - cluster.total_qa_pages;
                      const isGenerating = qaJobProgress?.clusterId === cluster.cluster_id;
                      
                      if (missingQAs <= 0 && !isGenerating) return null;
                      
                      return (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950"
                            onClick={() => generateAllMissingQAsMutation.mutate(cluster.cluster_id)}
                            disabled={isGenerating || generateAllMissingQAsMutation.isPending}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {qaJobProgress?.generatedPages || 0}/{qaJobProgress?.totalExpected || '?'} QAs
                              </>
                            ) : (
                              <>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Generate All QAs ({missingQAs} needed)
                              </>
                            )}
                          </Button>
                          {isGenerating && qaJobProgress && (
                            <div className="text-xs text-muted-foreground space-y-1 px-1">
                              <Progress value={(qaJobProgress.generatedPages / (qaJobProgress.totalExpected || 1)) * 100} className="h-1" />
                              <p className="truncate max-w-[200px]">
                                📝 {qaJobProgress.currentArticle || 'Processing...'}
                                {qaJobProgress.currentLanguage && ` (${qaJobProgress.currentLanguage.toUpperCase()})`}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateLinksMutation.mutate(cluster.cluster_id)}
                      disabled={regenerateLinksMutation.isPending || regeneratingLinks === cluster.cluster_id}
                    >
                      {regeneratingLinks === cluster.cluster_id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Link className="mr-2 h-4 w-4" />
                          Regenerate Links
                        </>
                      )}
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
