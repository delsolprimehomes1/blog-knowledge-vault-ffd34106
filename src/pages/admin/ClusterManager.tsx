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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Trash2, CheckCircle, HelpCircle, Copy, Loader2, FolderOpen, RefreshCw, Globe, Languages, Shield, Link, Link2, StopCircle, AlertTriangle, PlayCircle, FileCheck, XCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  qa_pages: Record<string, { total: number; published: number; draft: number }>;
  total_qa_pages: number;
  total_qa_published: number;
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

interface SEOIssue {
  id: string;
  slug: string;
  language: string;
  issue: string;
  expected?: string;
  actual?: string;
}

interface ClusterSEOAuditResult {
  cluster_id: string;
  cluster_theme: string;
  blog_audit: {
    total_articles: number;
    languages_found: string[];
    missing_languages: string[];
    articles_per_language: Record<string, number>;
    missing_canonicals: SEOIssue[];
    invalid_canonicals: SEOIssue[];
    missing_hreflang_group: SEOIssue[];
    missing_translations: SEOIssue[];
    self_reference_errors: SEOIssue[];
    missing_english: SEOIssue[];
    health_score: number;
  };
  qa_audit: {
    total_pages: number;
    languages_found: string[];
    missing_languages: string[];
    per_language: Record<string, number>;
    expected_per_language: Record<string, number>;
    missing_canonicals: SEOIssue[];
    invalid_canonicals: SEOIssue[];
    duplicate_language_groups: { hreflang_group_id: string; language: string; count: number }[];
    language_mismatch: SEOIssue[];
    health_score: number;
  };
  overall_health_score: number;
  issues_count: number;
  is_seo_ready: boolean;
  audited_at: string;
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
  const [clusterToPublishQAs, setClusterToPublishQAs] = useState<string | null>(null);
  const [clusterToTranslate, setClusterToTranslate] = useState<string | null>(null);
  const [translatingCluster, setTranslatingCluster] = useState<string | null>(null);
  const [translationProgress, setTranslationProgress] = useState<{ current: string; remaining: number } | null>(null);
  const [regeneratingLinks, setRegeneratingLinks] = useState<string | null>(null);
  const [regeneratingAllLinks, setRegeneratingAllLinks] = useState(false);
  const [generatingQALanguage, setGeneratingQALanguage] = useState<{ clusterId: string; lang: string } | null>(null);
  const [qaJobProgress, setQaJobProgress] = useState<QAJobProgress | null>(null);
  const [publishingQAs, setPublishingQAs] = useState<string | null>(null);
  const [auditingCluster, setAuditingCluster] = useState<string | null>(null);
  const [seoAuditResult, setSeoAuditResult] = useState<ClusterSEOAuditResult | null>(null);
  const [showSeoAuditModal, setShowSeoAuditModal] = useState(false);
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

  // Fetch QA pages grouped by cluster and language with status
  const { data: qaPages } = useQuery({
    queryKey: ["cluster-qa-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_pages")
        .select("cluster_id, language, status")
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
          total_qa_published: 0,
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

    // Add QA page counts per cluster per language with status breakdown
    qaPages?.forEach((qa) => {
      if (!qa.cluster_id) return;
      const cluster = clusterMap.get(qa.cluster_id);
      if (cluster) {
        if (!cluster.qa_pages[qa.language]) {
          cluster.qa_pages[qa.language] = { total: 0, published: 0, draft: 0 };
        }
        cluster.qa_pages[qa.language].total++;
        cluster.total_qa_pages++;
        
        if (qa.status === 'published') {
          cluster.qa_pages[qa.language].published++;
          cluster.total_qa_published++;
        } else {
          cluster.qa_pages[qa.language].draft++;
        }
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

  // Publish all Q&A pages in cluster
  const publishQAsMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setPublishingQAs(clusterId);
      const { data, error } = await supabase
        .from("qa_pages")
        .update({ 
          status: "published", 
          date_published: new Date().toISOString() 
        })
        .eq("cluster_id", clusterId)
        .eq("status", "draft")
        .select("id");
      
      if (error) throw error;
      return data?.length || 0;
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

  // SEO Audit mutation
  const seoAuditMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setAuditingCluster(clusterId);
      const { data, error } = await supabase.functions.invoke('audit-cluster-seo', {
        body: { cluster_id: clusterId }
      });
      if (error) throw error;
      return data as ClusterSEOAuditResult;
    },
    onSuccess: (result) => {
      setSeoAuditResult(result);
      setShowSeoAuditModal(true);
      setAuditingCluster(null);
    },
    onError: (error) => {
      toast.error(`SEO Audit failed: ${error.message}`);
      setAuditingCluster(null);
    },
  });

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
      
      // Detect stalled job (no update for 2+ minutes)
      if (job.status === 'stalled') {
        queryClient.invalidateQueries({ queryKey: ["stalled-qa-jobs"] });
        toast.warning(`QA generation stalled. Click "Resume Job" to continue.`);
        setTimeout(() => setQaJobProgress(null), 3000);
        return;
      }
    }
  }, [queryClient]);

  // Generate QAs for next pending language in cluster (one at a time, with pagination/continuation support)
  const generateNextLanguageQAMutation = useMutation({
    mutationFn: async ({ clusterId, language, articleIds, offset = 0 }: { clusterId: string; language: string; articleIds: string[]; offset?: number }) => {
      setGeneratingQALanguage({ clusterId, lang: language });
      
      const { data, error } = await supabase.functions.invoke("generate-qa-pages", {
        body: { 
          articleIds,
          singleLanguageMode: true,
          targetLanguage: language,
          clusterId,
          offset, // Pass offset for pagination
        },
      });
      
      if (error) throw error;
      return { ...data, clusterId, language, articleIds };
    },
    onSuccess: (result) => {
      const { language, generatedPages, skippedPages, failedPages, needsContinuation, articlesProcessed, totalArticlesInLanguage, nextOffset, remainingArticles, clusterId, articleIds } = result;
      
      // Check for failures first
      if (failedPages && failedPages > 0) {
        if (generatedPages > 0) {
          toast.warning(`Generated ${generatedPages} QA pages for ${language.toUpperCase()}, but ${failedPages} failed`);
        } else {
          toast.error(`Failed to generate QAs for ${language.toUpperCase()} (${failedPages} failed) - check constraint or logs`);
        }
      } else if (generatedPages > 0) {
        if (needsContinuation) {
          toast.info(`Generated ${generatedPages} QAs for ${language.toUpperCase()} (${nextOffset}/${totalArticlesInLanguage} articles done, ${remainingArticles} left)`);
        } else {
          toast.success(`Generated ${generatedPages} QA pages for ${language.toUpperCase()}`);
        }
      } else if (skippedPages > 0) {
        if (needsContinuation) {
          toast.info(`Skipped ${skippedPages} existing QAs. Continuing to next batch...`);
        } else {
          toast.info(`${language.toUpperCase()} already complete (${skippedPages} pages exist)`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
      setGeneratingQALanguage(null);
      
      // Auto-continue with nextOffset if there are more articles to process
      if (needsContinuation && clusterId && articleIds && nextOffset !== undefined) {
        setTimeout(() => {
          toast.info(`Continuing ${language.toUpperCase()} QA generation (batch ${Math.floor(nextOffset / 3) + 1})...`);
          generateNextLanguageQAMutation.mutate({ clusterId, language, articleIds, offset: nextOffset });
        }, 1500);
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate QAs: ${error.message}`);
      setGeneratingQALanguage(null);
    },
  });

  // Get next language that needs QA generation for a cluster
  const getNextPendingQALanguage = useCallback((cluster: ClusterData) => {
    const expectedLanguages = getAllExpectedLanguages(cluster);
    
    for (const lang of expectedLanguages) {
      const langStats = cluster.languages[lang];
      if (!langStats) continue; // No articles in this language
      
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
    return null; // All languages complete
  }, [getAllExpectedLanguages]);

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
  }, [getAllExpectedLanguages]);

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
    refetchInterval: 30000, // Check every 30 seconds
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
          stalledThresholdMinutes: 1, // Use short threshold since we're manually triggering
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

  // Check for stalled jobs and auto-mark them
  const checkForStalledJobsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-resume-qa-jobs", {
        body: { 
          stalledThresholdMinutes: 10,
          autoResume: false, // Just detect and mark, don't auto-resume
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
    }, 60000); // Check every minute
    
    // Initial check on mount
    checkForStalledJobsMutation.mutate();
    
    return () => clearInterval(interval);
  }, []);

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
                        {/* QA Progress: show published/total with status indicator */}
                        <span className={`font-medium ${
                          cluster.total_qa_published === cluster.total_qa_pages && cluster.qa_completion_percent === 100 
                            ? 'text-green-600 dark:text-green-400' 
                            : cluster.total_qa_published < cluster.total_qa_pages
                              ? 'text-amber-600 dark:text-amber-400'
                              : cluster.qa_completion_percent > 0 
                                ? 'text-amber-600 dark:text-amber-400' 
                                : 'text-muted-foreground'
                        }`}>
                          • QAs: {cluster.total_qa_published}P/{cluster.total_qa_pages}T ({cluster.qa_completion_percent}%)
                          {cluster.total_qa_published === cluster.total_qa_pages && cluster.qa_completion_percent === 100 ? ' ✅' : 
                           cluster.total_qa_published < cluster.total_qa_pages ? ` (${cluster.total_qa_pages - cluster.total_qa_published}D)` :
                           cluster.qa_completion_percent > 0 ? ' ⚠️' : ' ❌'}
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

                  {/* Language breakdown with QA counts (published/total) */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(cluster.languages).map(([lang, stats]) => {
                      const expectedQAs = stats.total * 4;
                      const qaStats = cluster.qa_pages[lang];
                      const totalQAs = qaStats?.total || 0;
                      const publishedQAs = qaStats?.published || 0;
                      const draftQAs = qaStats?.draft || 0;
                      const maxQAs = 24; // Hard cap: 6 articles × 4 types
                      const isOverCap = totalQAs > maxQAs;
                      const missingQAs = Math.max(0, expectedQAs - totalQAs);
                      const langPercent = expectedQAs > 0 ? Math.round((Math.min(totalQAs, expectedQAs) / expectedQAs) * 100) : 0;
                      const isGenerating = generatingQALanguage?.clusterId === cluster.cluster_id && generatingQALanguage?.lang === lang;
                      const hasUnpublished = draftQAs > 0;
                      
                      return (
                        <div key={lang} className="flex items-center gap-1">
                          <Badge variant="outline" className={`text-sm ${isOverCap ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : hasUnpublished ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                            {getLanguageFlag(lang)} {stats.total}
                            <span className={`ml-1 ${
                              isOverCap
                                ? 'text-red-600 dark:text-red-400'
                                : hasUnpublished
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : langPercent === 100 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : langPercent > 0 
                                      ? 'text-amber-600 dark:text-amber-400' 
                                      : 'text-muted-foreground'
                            }`}>
                              | {publishedQAs}P/{totalQAs}T
                              {isOverCap ? ' ⚠️' : hasUnpublished ? ` (${draftQAs}D)` : langPercent === 100 ? ' ✅' : ''}
                            </span>
                            {stats.draft > 0 && stats.published > 0 && (
                              <span className="text-muted-foreground ml-1">
                                ({stats.published}✓ {stats.draft}○)
                              </span>
                            )}
                          </Badge>
                          {missingQAs > 0 && !isOverCap && (
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
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950"
                      onClick={() => seoAuditMutation.mutate(cluster.cluster_id)}
                      disabled={auditingCluster === cluster.cluster_id}
                    >
                      {auditingCluster === cluster.cluster_id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Auditing...
                        </>
                      ) : (
                        <>
                          <FileCheck className="mr-2 h-4 w-4" />
                          SEO Audit
                        </>
                      )}
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
                    {/* Publish All Q&As Button */}
                    {cluster.total_qa_pages > cluster.total_qa_published && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
                        onClick={() => setClusterToPublishQAs(cluster.cluster_id)}
                        disabled={publishingQAs === cluster.cluster_id || publishQAsMutation.isPending}
                      >
                        {publishingQAs === cluster.cluster_id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Publish {cluster.total_qa_pages - cluster.total_qa_published} QAs
                          </>
                        )}
                      </Button>
                    )}
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
                    {/* Generate Next Language QAs Button */}
                    {(() => {
                      const nextPending = getNextPendingQALanguage(cluster);
                      const qaStatuses = getQALanguageStatus(cluster);
                      const isGenerating = generatingQALanguage?.clusterId === cluster.cluster_id;
                      const completedCount = qaStatuses.filter(s => s.status === 'complete').length;
                      const totalLangs = qaStatuses.length;
                      
                      if (!nextPending && !isGenerating) return null;
                      
                      // Get article IDs for the next pending language
                      const getArticleIdsForLanguage = async () => {
                        const { data } = await supabase
                          .from("blog_articles")
                          .select("id")
                          .eq("cluster_id", cluster.cluster_id)
                          .eq("language", nextPending!.language)
                          .in("status", ["draft", "published"]);
                        return data?.map(a => a.id) || [];
                      };
                      
                      return (
                        <div className="flex flex-col gap-2">
                          {/* Language progress bar */}
                          <div className="flex items-center gap-1 text-xs">
                            {qaStatuses.map(({ lang, status, count, expected }) => (
                              <Badge
                                key={lang}
                                variant="outline"
                                className={`text-[10px] px-1 py-0 h-5 ${
                                  status === 'complete'
                                    ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-700'
                                    : status === 'partial'
                                      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700'
                                      : 'bg-muted text-muted-foreground'
                                } ${isGenerating && generatingQALanguage?.lang === lang ? 'ring-2 ring-purple-400' : ''}`}
                              >
                                {getLanguageFlag(lang)}
                                {status === 'complete' ? '✓' : status === 'partial' ? `${count}/${expected}` : '○'}
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Generate next language button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950"
                            onClick={async () => {
                              if (!nextPending) return;
                              const articleIds = await getArticleIdsForLanguage();
                              if (articleIds.length === 0) {
                                toast.error(`No articles found for ${nextPending.language.toUpperCase()}`);
                                return;
                              }
                              generateNextLanguageQAMutation.mutate({
                                clusterId: cluster.cluster_id,
                                language: nextPending.language,
                                articleIds,
                              });
                            }}
                            disabled={isGenerating || generateNextLanguageQAMutation.isPending || !nextPending}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating {getLanguageFlag(generatingQALanguage?.lang || '')} QAs...
                              </>
                            ) : nextPending ? (
                              <>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Generate {getLanguageFlag(nextPending.language)} QAs ({nextPending.missing} needed)
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                All QAs Complete
                              </>
                            )}
                          </Button>
                          
                          {/* Progress indicator */}
                          <p className="text-xs text-muted-foreground">
                            {completedCount}/{totalLangs} languages complete
                          </p>
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

        {/* Publish Q&As Confirmation Dialog */}
        <AlertDialog open={!!clusterToPublishQAs} onOpenChange={() => setClusterToPublishQAs(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-600" />
                Publish all Q&A pages?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {clusterToPublishQAs && (() => {
                  const cluster = clusters.find(c => c.cluster_id === clusterToPublishQAs);
                  const draftCount = cluster ? (cluster.total_qa_pages - cluster.total_qa_published) : 0;
                  return (
                    <>
                      This will publish <strong>{draftCount} draft Q&A pages</strong> in this cluster.
                      They will become publicly visible on the website.
                    </>
                  );
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
                {publishQAsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish All QAs"
                )}
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

        {/* SEO Audit Results Modal */}
        <Dialog open={showSeoAuditModal} onOpenChange={setShowSeoAuditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <FileCheck className="h-5 w-5 text-blue-600" />
                SEO Audit Results
                {seoAuditResult && (
                  <Badge 
                    className={`ml-2 ${
                      seoAuditResult.overall_health_score >= 95 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : seoAuditResult.overall_health_score >= 80
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {seoAuditResult.overall_health_score}% Health
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {seoAuditResult?.cluster_theme || 'Unknown Cluster'} • {seoAuditResult?.issues_count || 0} issues found
              </DialogDescription>
            </DialogHeader>
            
            {seoAuditResult && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {/* Overall Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className={seoAuditResult.is_seo_ready ? 'border-green-300 bg-green-50 dark:bg-green-950/30' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'}>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">{seoAuditResult.overall_health_score}%</div>
                        <div className="text-sm text-muted-foreground">Overall Health</div>
                        {seoAuditResult.is_seo_ready ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mt-2" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mt-2" />
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">{seoAuditResult.blog_audit.health_score}%</div>
                        <div className="text-sm text-muted-foreground">Blog Articles</div>
                        <div className="text-xs text-muted-foreground mt-1">{seoAuditResult.blog_audit.total_articles} total</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-3xl font-bold">{seoAuditResult.qa_audit.health_score}%</div>
                        <div className="text-sm text-muted-foreground">Q&A Pages</div>
                        <div className="text-xs text-muted-foreground mt-1">{seoAuditResult.qa_audit.total_pages} total</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Blog Audit Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Blog Articles Audit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Languages */}
                      <div>
                        <p className="text-sm font-medium mb-2">Languages Found ({seoAuditResult.blog_audit.languages_found.length}/10):</p>
                        <div className="flex flex-wrap gap-2">
                          {seoAuditResult.blog_audit.languages_found.map(lang => (
                            <Badge key={lang} variant="outline" className="bg-green-50 dark:bg-green-950/30">
                              {getLanguageFlag(lang)} {lang.toUpperCase()} ({seoAuditResult.blog_audit.articles_per_language[lang] || 0})
                            </Badge>
                          ))}
                          {seoAuditResult.blog_audit.missing_languages.map(lang => (
                            <Badge key={lang} variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-600">
                              {getLanguageFlag(lang)} {lang.toUpperCase()} (0)
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Issues */}
                      {seoAuditResult.blog_audit.missing_canonicals.length > 0 && (
                        <div className="border-l-4 border-red-400 pl-3">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Missing Canonicals ({seoAuditResult.blog_audit.missing_canonicals.length})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seoAuditResult.blog_audit.missing_canonicals.slice(0, 3).map(i => `${i.language}/${i.slug}`).join(', ')}
                            {seoAuditResult.blog_audit.missing_canonicals.length > 3 && ` +${seoAuditResult.blog_audit.missing_canonicals.length - 3} more`}
                          </p>
                        </div>
                      )}
                      
                      {seoAuditResult.blog_audit.invalid_canonicals.length > 0 && (
                        <div className="border-l-4 border-amber-400 pl-3">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Invalid Canonicals ({seoAuditResult.blog_audit.invalid_canonicals.length})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seoAuditResult.blog_audit.invalid_canonicals.slice(0, 3).map(i => `${i.language}/${i.slug}`).join(', ')}
                            {seoAuditResult.blog_audit.invalid_canonicals.length > 3 && ` +${seoAuditResult.blog_audit.invalid_canonicals.length - 3} more`}
                          </p>
                        </div>
                      )}

                      {seoAuditResult.blog_audit.missing_hreflang_group.length > 0 && (
                        <div className="border-l-4 border-red-400 pl-3">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Missing Hreflang Group ({seoAuditResult.blog_audit.missing_hreflang_group.length})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seoAuditResult.blog_audit.missing_hreflang_group.slice(0, 3).map(i => `${i.language}/${i.slug}`).join(', ')}
                            {seoAuditResult.blog_audit.missing_hreflang_group.length > 3 && ` +${seoAuditResult.blog_audit.missing_hreflang_group.length - 3} more`}
                          </p>
                        </div>
                      )}

                      {seoAuditResult.blog_audit.missing_translations.length > 0 && (
                        <div className="border-l-4 border-amber-400 pl-3">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Incomplete Translations ({seoAuditResult.blog_audit.missing_translations.length})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seoAuditResult.blog_audit.missing_translations.slice(0, 3).map(i => `${i.language}/${i.slug}: ${i.actual}`).join(', ')}
                            {seoAuditResult.blog_audit.missing_translations.length > 3 && ` +${seoAuditResult.blog_audit.missing_translations.length - 3} more`}
                          </p>
                        </div>
                      )}

                      {seoAuditResult.blog_audit.missing_english.length > 0 && (
                        <div className="border-l-4 border-red-400 pl-3">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Missing English (x-default) ({seoAuditResult.blog_audit.missing_english.length})
                          </p>
                        </div>
                      )}

                      {seoAuditResult.blog_audit.health_score === 100 && (
                        <div className="border-l-4 border-green-400 pl-3">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 inline mr-1" />
                            All blog articles pass SEO checks!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Q&A Audit Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Q&A Pages Audit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Languages */}
                      <div>
                        <p className="text-sm font-medium mb-2">Q&A Pages per Language:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(seoAuditResult.qa_audit.per_language).map(([lang, count]) => {
                            const expected = seoAuditResult.qa_audit.expected_per_language[lang] || 0;
                            const isComplete = count >= expected;
                            return (
                              <Badge 
                                key={lang} 
                                variant="outline" 
                                className={isComplete ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}
                              >
                                {getLanguageFlag(lang)} {count}/{expected}
                                {isComplete && ' ✓'}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Issues */}
                      {seoAuditResult.qa_audit.missing_canonicals.length > 0 && (
                        <div className="border-l-4 border-red-400 pl-3">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Missing Canonicals ({seoAuditResult.qa_audit.missing_canonicals.length})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seoAuditResult.qa_audit.missing_canonicals.slice(0, 3).map(i => `${i.language}/${i.slug}`).join(', ')}
                            {seoAuditResult.qa_audit.missing_canonicals.length > 3 && ` +${seoAuditResult.qa_audit.missing_canonicals.length - 3} more`}
                          </p>
                        </div>
                      )}

                      {seoAuditResult.qa_audit.duplicate_language_groups.length > 0 && (
                        <div className="border-l-4 border-red-400 pl-3">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Duplicate Languages in Hreflang Groups ({seoAuditResult.qa_audit.duplicate_language_groups.length})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seoAuditResult.qa_audit.duplicate_language_groups.slice(0, 3).map(d => `${d.language}: ${d.count} pages`).join(', ')}
                            {seoAuditResult.qa_audit.duplicate_language_groups.length > 3 && ` +${seoAuditResult.qa_audit.duplicate_language_groups.length - 3} more`}
                          </p>
                        </div>
                      )}

                      {seoAuditResult.qa_audit.language_mismatch.length > 0 && (
                        <div className="border-l-4 border-amber-400 pl-3">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Language Mismatch ({seoAuditResult.qa_audit.language_mismatch.length})
                          </p>
                          <p className="text-xs text-muted-foreground">Q&A language doesn't match source article language</p>
                        </div>
                      )}

                      {seoAuditResult.qa_audit.health_score === 100 && (
                        <div className="border-l-4 border-green-400 pl-3">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 inline mr-1" />
                            All Q&A pages pass SEO checks!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ClusterManager;
