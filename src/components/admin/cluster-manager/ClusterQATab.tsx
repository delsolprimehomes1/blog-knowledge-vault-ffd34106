import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, HelpCircle, Loader2, PlayCircle, AlertTriangle, FileText, RotateCcw, XCircle, Wrench, RefreshCw } from "lucide-react";
import { ClusterData, getLanguageFlag, getAllExpectedLanguages } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ClusterQATabProps {
  cluster: ClusterData;
  onPublishQAs: () => void;
  onGenerateQAs: (articleId?: string) => void;
  publishingQAs: string | null;
  generatingQALanguage: { clusterId: string; lang: string } | null;
}

// Use database schema fields directly
interface QAJob {
  id: string;
  status: string;
  total_articles: number | null;
  articles_completed: number | null;
  total_qas_created: number | null;
  total_qas_failed: number | null;
  current_article_index: number | null;
  current_article_headline: string | null;
  completion_percent: number | null;
  error: string | null;
  updated_at: string | null;
  resume_from_qa_type: string | null;
}

// Correct architecture: 6 articles × 4 Q&A types × 10 languages = 240 Q&As per cluster
// Per language: 6 articles × 4 Q&A types = 24 Q&As
const QAS_PER_ARTICLE = 4;
const ARTICLES_PER_LANGUAGE = 6;
const EXPECTED_QAS_PER_LANGUAGE = QAS_PER_ARTICLE * ARTICLES_PER_LANGUAGE; // 24
const TOTAL_LANGUAGES = 10;
const EXPECTED_QAS_PER_CLUSTER = EXPECTED_QAS_PER_LANGUAGE * TOTAL_LANGUAGES; // 240

// Stalled threshold: 5 minutes without update
const STALLED_THRESHOLD_MS = 5 * 60 * 1000;

interface MismatchInfo {
  hasMismatch: boolean;
  maxCount: number;
  mismatched: { lang: string; actual: number; missing: number }[];
  total: number;
}

export const ClusterQATab = ({
  cluster,
  onPublishQAs,
  onGenerateQAs,
  publishingQAs,
  generatingQALanguage,
}: ClusterQATabProps) => {
  const queryClient = useQueryClient();
  const [activeJob, setActiveJob] = useState<QAJob | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isResumingJob, setIsResumingJob] = useState(false);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairProgress, setRepairProgress] = useState<{ batch: number; created: number } | null>(null);
  const [isGeneratingCleanSlate, setIsGeneratingCleanSlate] = useState(false);
  const [cleanSlateProgress, setCleanSlateProgress] = useState<{ current: number; total: number; created: number } | null>(null);
  
  const isPublishing = publishingQAs === cluster.cluster_id;
  const isGenerating = generatingQALanguage?.clusterId === cluster.cluster_id;
  const isJobRunning = activeJob?.status === 'running';
  
  // Detect stalled jobs: status='stalled' OR running but no update for 5+ minutes
  const isJobStalled = activeJob?.status === 'stalled' || 
    (activeJob?.status === 'running' && activeJob?.updated_at && 
     new Date(activeJob.updated_at).getTime() < Date.now() - STALLED_THRESHOLD_MS);

  // Poll for active job status
  useEffect(() => {
    if (!activeJob || (activeJob.status !== 'running' && activeJob.status !== 'stalled')) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('id', activeJob.id)
        .single();

      if (error) {
        console.error('Error polling job:', error);
        return;
      }

      if (data) {
        const jobData = data as unknown as QAJob;
        setActiveJob(jobData);
        
        if (jobData.status === 'completed') {
          toast.success(`Q&A generation complete! Created ${jobData.total_qas_created || 0} Q&As`);
          clearInterval(interval);
        } else if (jobData.status === 'failed') {
          toast.error(`Q&A generation failed: ${jobData.error}`);
          clearInterval(interval);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  // Check for existing running/stalled job on mount
  useEffect(() => {
    const checkExistingJob = async () => {
      const { data } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('cluster_id', cluster.cluster_id)
        .in('status', ['running', 'stalled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveJob(data as unknown as QAJob);
      }
    };
    
    checkExistingJob();
  }, [cluster.cluster_id]);

  const handleGenerateQAs = async () => {
    setIsStartingJob(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-cluster-qas', {
        body: { clusterId: cluster.cluster_id },
      });

      if (error) throw error;

      if (data?.jobId) {
        toast.success('Q&A generation started in background');
        
        // Fetch the job to start polling
        const { data: jobResult } = await supabase
          .from('qa_generation_jobs')
          .select('*')
          .eq('id', data.jobId)
          .single();
          
        if (jobResult) {
          setActiveJob(jobResult as unknown as QAJob);
        }
      }
    } catch (error) {
      console.error('Error starting Q&A generation:', error);
      toast.error('Failed to start Q&A generation');
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleResumeJob = async () => {
    if (!activeJob) return;
    
    setIsResumingJob(true);
    
    try {
      // Call auto-resume edge function
      const { data, error } = await supabase.functions.invoke('auto-resume-qa-jobs', {
        body: { 
          stalledThresholdMinutes: 0, // Resume immediately
          autoResume: true,
          specificJobId: activeJob.id,
        },
      });

      if (error) throw error;

      toast.success('Job resumed! Check progress above.');
      
      // Update local state to running
      setActiveJob(prev => prev ? { ...prev, status: 'running', updated_at: new Date().toISOString() } : null);
      
    } catch (error) {
      console.error('Error resuming job:', error);
      toast.error('Failed to resume job');
    } finally {
      setIsResumingJob(false);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    
    setIsCancellingJob(true);
    
    try {
      // Mark job as failed/cancelled
      const { error } = await supabase
        .from('qa_generation_jobs')
        .update({
          status: 'failed',
          error: 'Manually cancelled by user',
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeJob.id);

      if (error) throw error;

      toast.success('Job cancelled');
      setActiveJob(prev => prev ? { ...prev, status: 'failed', error: 'Manually cancelled by user' } : null);
      
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel job');
    } finally {
      setIsCancellingJob(false);
    }
  };

  // Calculate correct totals based on actual articles per language
  const getQAStatusForLanguage = (lang: string) => {
    const articleCount = cluster.languages[lang]?.total || 0;
    // Expected: 4 Q&As per article in that language
    const expectedQAs = articleCount * QAS_PER_ARTICLE;
    const actualQAs = cluster.qa_pages[lang]?.total || 0;
    const publishedQAs = cluster.qa_pages[lang]?.published || 0;

    return {
      articleCount,
      expectedQAs,
      actualQAs,
      publishedQAs,
      isComplete: actualQAs >= expectedQAs && expectedQAs > 0,
      allPublished: publishedQAs >= actualQAs && actualQAs > 0,
    };
  };

  // Calculate cluster-wide expectations
  const totalExpectedQAs = Object.values(cluster.languages).reduce(
    (sum, lang) => sum + (lang.total * QAS_PER_ARTICLE), 
    0
  );
  const completionPercent = totalExpectedQAs > 0 
    ? Math.round((cluster.total_qa_pages / totalExpectedQAs) * 100) 
    : 0;

  const expectedLanguages = getAllExpectedLanguages(cluster);
  const languagesNeedingQAs = expectedLanguages.filter((lang) => {
    const status = getQAStatusForLanguage(lang);
    return status.articleCount > 0 && !status.isComplete;
  });

  const draftQAsCount = cluster.total_qa_pages - cluster.total_qa_published;

  // FIX 6: Detect Q&A count mismatches using English as reference
  const mismatchInfo = useMemo((): MismatchInfo => {
    const languageCounts: { lang: string; actual: number; expected: number }[] = [];
    
    // Get counts for all languages that have articles
    expectedLanguages.forEach((lang) => {
      const status = getQAStatusForLanguage(lang);
      if (status.articleCount > 0) {
        languageCounts.push({
          lang,
          actual: status.actualQAs,
          expected: status.expectedQAs,
        });
      }
    });
    
    if (languageCounts.length === 0) {
      return { hasMismatch: false, maxCount: 0, mismatched: [], total: 0 };
    }
    
    // FIX 6: Use English count as reference (matches English-first architecture)
    const enCount = languageCounts.find(l => l.lang === 'en')?.actual || 0;
    const referenceCount = enCount > 0 ? enCount : Math.max(...languageCounts.map(l => l.actual));
    
    // Find languages that are behind the reference (only when there are Q&As generated)
    const mismatched = languageCounts
      .filter(l => l.actual < referenceCount && referenceCount > 0)
      .map(l => ({
        lang: l.lang,
        actual: l.actual,
        missing: referenceCount - l.actual,
      }));
    
    return {
      hasMismatch: mismatched.length > 0,
      maxCount: referenceCount,
      mismatched,
      total: languageCounts.length,
    };
  }, [expectedLanguages, cluster.qa_pages, cluster.languages]);

  // FIX 5: Handle repair with auto-retry loop
  const handleRepairMissingQAs = async () => {
    if (!mismatchInfo.hasMismatch) return;
    
    setIsRepairing(true);
    setRepairProgress({ batch: 0, created: 0 });
    
    let totalRepaired = 0;
    const maxAttempts = 10; // Max 10 batches (5 Q&As each = 50 max)
    
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[Repair] Batch ${attempt}/${maxAttempts}`);
        setRepairProgress({ batch: attempt, created: totalRepaired });
        
        const { data, error } = await supabase.functions.invoke('repair-missing-qas', {
          body: { 
            clusterId: cluster.cluster_id,
            languages: mismatchInfo.mismatched.map(m => m.lang),
          },
        });

        if (error) {
          console.error('[Repair] Error in batch:', error);
          // Show error but continue - some Q&As may have been created
          toast.error(`Batch ${attempt} failed. Retrying...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        if (!data) break;
        
        totalRepaired += data.repaired || 0;
        
        // Show progress
        toast.success(data.partial 
          ? `Progress: ${data.repaired} created (batch ${attempt})`
          : `Repair complete! ${data.repaired} created`
        );
        
        // If complete or no progress, stop
        if (!data.partial || data.repaired === 0) {
          console.log(`[Repair] Complete after ${attempt} batches`);
          break;
        }
        
        // Small delay before next batch
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Final message
      if (totalRepaired > 0) {
        toast.success(`Repair finished! Total: ${totalRepaired} Q&As created`);
      } else {
        toast.info('No Q&As were created - all may already exist');
      }
      
    } catch (error) {
      console.error('[Repair] Fatal error:', error);
      toast.error('Repair encountered an error. Some Q&As may have been created.');
    } finally {
      setIsRepairing(false);
      setRepairProgress(null);
      
      // Force refresh via React Query instead of page reload
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      await queryClient.invalidateQueries({ queryKey: ['qa-pages'] });
    }
  };

  // CLEAN SLATE: Delete all Q&As and regenerate for all 6 articles
  const handleGenerateCleanSlate = async () => {
    // Get English articles for this cluster
    const { data: englishArticles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline')
      .eq('cluster_id', cluster.cluster_id)
      .eq('language', 'en')
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    if (articlesError || !englishArticles || englishArticles.length === 0) {
      toast.error('No English articles found for this cluster');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ CLEAN SLATE GENERATION\n\n` +
      `This will DELETE all existing Q&As for this cluster and regenerate from scratch.\n\n` +
      `Found ${englishArticles.length} English articles.\n` +
      `Will generate: ${englishArticles.length} × 4 types × 10 languages = ${englishArticles.length * 40} Q&As\n\n` +
      `Estimated time: ${englishArticles.length * 5}-${englishArticles.length * 8} minutes.\n\n` +
      `Continue?`
    );
    
    if (!confirmed) return;
    
    setIsGeneratingCleanSlate(true);
    setCleanSlateProgress({ current: 0, total: englishArticles.length, created: 0 });
    
    let totalCreated = 0;
    
    try {
      // Step 1: Delete ALL existing Q&As for this cluster
      toast.info('Deleting existing Q&As...');
      const { error: deleteError } = await supabase
        .from('qa_pages')
        .delete()
        .eq('cluster_id', cluster.cluster_id);
      
      if (deleteError) {
        console.error('Delete error:', deleteError);
        toast.error(`Failed to delete Q&As: ${deleteError.message}`);
        return;
      }
      toast.success('Existing Q&As deleted');
      
      // Step 2: Generate for each English article sequentially
      for (let i = 0; i < englishArticles.length; i++) {
        const article = englishArticles[i];
        
        setCleanSlateProgress({
          current: i + 1,
          total: englishArticles.length,
          created: totalCreated,
        });
        
        toast.info(`Article ${i + 1}/${englishArticles.length}: ${article.headline.substring(0, 40)}...`);
        console.log(`[CleanSlate] Starting article ${i + 1}/${englishArticles.length}: ${article.id}`);
        
        const { data, error } = await supabase.functions.invoke('generate-article-qas', {
          body: { englishArticleId: article.id },
        });
        
        if (error) {
          console.error(`Error for article ${i + 1}:`, error);
          toast.error(`Article ${i + 1} failed: ${error.message}. Continuing...`);
          continue;
        }
        
        const created = data?.created || 0;
        totalCreated += created;
        
        console.log(`[CleanSlate] Article ${i + 1} complete: ${created} Q&As created`);
        toast.success(`Article ${i + 1}/${englishArticles.length} done! +${created} Q&As`);
        
        // Update progress
        setCleanSlateProgress({
          current: i + 1,
          total: englishArticles.length,
          created: totalCreated,
        });
        
        // Wait between articles to avoid rate limits
        if (i < englishArticles.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      // Final message
      const expectedTotal = englishArticles.length * 40;
      toast.success(`🎉 Clean slate complete! ${totalCreated}/${expectedTotal} Q&As created`);
      
    } catch (error) {
      console.error('[CleanSlate] Fatal error:', error);
      toast.error(`Generation failed: ${error}`);
    } finally {
      setIsGeneratingCleanSlate(false);
      setCleanSlateProgress(null);
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      await queryClient.invalidateQueries({ queryKey: ['qa-pages'] });
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_qa_pages}</div>
          <div className="text-xs text-muted-foreground">Total Q&As</div>
          <div className="text-xs text-muted-foreground/70">of {totalExpectedQAs} expected</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{cluster.total_qa_published}</div>
          <div className="text-xs text-muted-foreground">Published</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">{draftQAsCount}</div>
          <div className="text-xs text-muted-foreground">Draft</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{completionPercent}%</div>
          <div className="text-xs text-muted-foreground">Complete</div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Q&A Generation Progress</span>
          <span className="font-medium">
            {cluster.total_qa_pages}/{totalExpectedQAs} Q&As
          </span>
        </div>
        <Progress value={completionPercent} className="h-2" />
        <p className="text-xs text-muted-foreground">
          Architecture: {Object.keys(cluster.languages).length} languages × {Object.values(cluster.languages)[0]?.total || 0} articles × 4 Q&A types
        </p>
      </div>

      {/* Stalled Job Warning */}
      {isJobStalled && activeJob && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-300">
              Job Stalled
            </span>
          </div>
          
          <div className="space-y-2 text-sm text-amber-700 dark:text-amber-400">
            <p>
              Article {(activeJob.current_article_index || 0) + 1} of {activeJob.total_articles} • 
              {activeJob.total_qas_created || 0} Q&As created so far
            </p>
            {activeJob.current_article_headline && (
              <p className="text-xs">
                Last processing: {activeJob.current_article_headline}
              </p>
            )}
            {activeJob.resume_from_qa_type && (
              <p className="text-xs">
                Will resume from: {activeJob.resume_from_qa_type}
              </p>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResumeJob}
              disabled={isResumingJob}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {isResumingJob ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Resume Job
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelJob}
              disabled={isCancellingJob}
              className="text-red-600 hover:bg-red-50"
            >
              {isCancellingJob ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                await handleCancelJob();
                setTimeout(() => handleGenerateQAs(), 500);
              }}
              disabled={isCancellingJob || isStartingJob}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Fresh
            </Button>
          </div>
        </div>
      )}

      {/* Active Job Progress (not stalled) */}
      {isJobRunning && activeJob && !isJobStalled && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              Q&A Generation in Progress
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Article {(activeJob.current_article_index || 0) + 1} of {activeJob.total_articles}</span>
              <span className="font-medium">{activeJob.total_qas_created} Q&As created</span>
            </div>
            <Progress 
              value={((activeJob.articles_completed || 0) / (activeJob.total_articles || 1)) * 100} 
              className="h-2" 
            />
            {activeJob.current_article_headline && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Processing: {activeJob.current_article_headline}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Job Completed Message */}
      {activeJob?.status === 'completed' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/30">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <span>
              Last generation completed: {activeJob.total_qas_created} Q&As created
              {(activeJob.total_qas_failed || 0) > 0 && ` (${activeJob.total_qas_failed} failed)`}
            </span>
          </div>
        </div>
      )}

      {/* Job Failed Message */}
      {activeJob?.status === 'failed' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <span>Last generation failed: {activeJob.error}</span>
          </div>
        </div>
      )}

      {/* Q&A Count Mismatch Warning */}
      {mismatchInfo.hasMismatch && !isJobRunning && !isJobStalled && (
        <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg dark:bg-orange-950/30 dark:border-orange-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800 dark:text-orange-300">
              Q&A Count Mismatch Detected
            </span>
          </div>
          
          <p className="text-sm text-orange-700 dark:text-orange-400 mb-2">
            Some languages have fewer Q&As than others. Expected {mismatchInfo.maxCount} per language:
          </p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {mismatchInfo.mismatched.map(({ lang, actual, missing }) => (
              <Badge 
                key={lang} 
                variant="outline" 
                className="border-orange-400 text-orange-700 dark:text-orange-300"
              >
                {getLanguageFlag(lang)} {lang.toUpperCase()}: {actual}/{mismatchInfo.maxCount} 
                (missing {missing})
              </Badge>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="border-orange-400 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
            onClick={handleRepairMissingQAs}
            disabled={isRepairing}
          >
            {isRepairing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {repairProgress ? `Batch ${repairProgress.batch} (${repairProgress.created} created)...` : 'Starting...'}
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                Repair Missing Q&As
              </>
            )}
          </Button>
        </div>
      )}

      {/* Language-by-Language Q&A Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Q&As by Language (expected: 24 per language)</h4>
        <div className="grid grid-cols-5 gap-2">
          {expectedLanguages.map((lang) => {
            const status = getQAStatusForLanguage(lang);
            const isMismatched = mismatchInfo.mismatched.some(m => m.lang === lang);

            return (
              <div
                key={lang}
                className={`p-2 rounded-lg border text-center relative ${
                  isMismatched
                    ? "bg-orange-50 border-orange-400 border-2 dark:bg-orange-950/30"
                    : status.allPublished
                    ? "bg-green-50 border-green-200 dark:bg-green-950/30"
                    : status.isComplete
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30"
                    : status.articleCount === 0
                    ? "bg-gray-50 border-dashed border-gray-200 dark:bg-gray-800/50"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/30"
                }`}
              >
                <div className="text-lg">{getLanguageFlag(lang)}</div>
                <div className="text-sm font-medium">
                  {status.actualQAs}/{status.expectedQAs}
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.publishedQAs}P
                  {status.allPublished && " ✓"}
                </div>
                
                {/* Status indicator */}
                {status.isComplete && status.allPublished && (
                  <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500" />
                )}
                {isMismatched && (
                  <AlertTriangle className="absolute -top-1 -right-1 h-4 w-4 text-orange-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {languagesNeedingQAs.length > 0 && !isJobRunning && !isJobStalled && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              {languagesNeedingQAs.length} language(s) incomplete:
            </span>
            <span className="text-amber-700 dark:text-amber-400 ml-1">
              {languagesNeedingQAs.map((l) => l.toUpperCase()).join(", ")}
            </span>
            <div className="text-xs text-amber-600 mt-1">
              Generate English Q&As first, then auto-translate to 9 languages (4 types × 10 languages = 40 per article)
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onPublishQAs}
          disabled={draftQAsCount === 0 || isPublishing}
        >
          {isPublishing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Publish All Q&As ({draftQAsCount} drafts)
        </Button>

        {cluster.total_qa_pages < totalExpectedQAs && (
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateQAs}
            disabled={isStartingJob || isJobRunning || isGeneratingCleanSlate}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isStartingJob || isJobRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {isJobRunning ? 'Generating...' : 'Generate & Translate Q&As'}
          </Button>
        )}

        {/* Clean Slate Button - Generate All 6 Articles Sequentially */}
        <Button
          variant="default"
          size="sm"
          onClick={handleGenerateCleanSlate}
          disabled={isStartingJob || isJobRunning || isGeneratingCleanSlate || isRepairing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isGeneratingCleanSlate ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {cleanSlateProgress 
                ? `Article ${cleanSlateProgress.current}/${cleanSlateProgress.total} (${cleanSlateProgress.created} created)`
                : 'Starting...'
              }
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate All Q&As (Clean Slate)
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
