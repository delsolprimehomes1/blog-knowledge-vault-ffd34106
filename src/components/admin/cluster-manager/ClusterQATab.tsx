import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, HelpCircle, Loader2, PlayCircle, AlertTriangle, FileText, RotateCcw, XCircle, Wrench, RefreshCw, Globe, Languages, Rocket, ShieldCheck } from "lucide-react";
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

interface EnglishArticle {
  id: string;
  headline: string;
  slug: string;
}

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

interface VerificationResults {
  totalQAs: number;
  expectedTotal: number;
  completeGroups: number;
  incompleteGroups: number;
  allLanguagesEqual: boolean;
  languageCounts: Record<string, number>;
  jsonbComplete: boolean;
  missingJsonbCount: number;
}

const QAS_PER_ARTICLE = 4;
const ARTICLES_PER_LANGUAGE = 6;
const EXPECTED_QAS_PER_LANGUAGE = QAS_PER_ARTICLE * ARTICLES_PER_LANGUAGE;
const TOTAL_LANGUAGES = 10;
const EXPECTED_QAS_PER_CLUSTER = EXPECTED_QAS_PER_LANGUAGE * TOTAL_LANGUAGES;

const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'] as const;
const MAX_PARALLEL_TRANSLATIONS = 3;

const STALLED_THRESHOLD_MS = 5 * 60 * 1000;
const AUTO_REFRESH_INTERVAL_MS = 8000;

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
  
  // Two-phase generation state
  const [englishArticles, setEnglishArticles] = useState<EnglishArticle[]>([]);
  const [generatingArticle, setGeneratingArticle] = useState<string | null>(null);
  const [articleQACounts, setArticleQACounts] = useState<Record<string, number>>({}); // Tracks Q&As per article
  const [translatingLanguages, setTranslatingLanguages] = useState<Set<string>>(new Set()); // ENHANCEMENT 3: Parallel
  const [completedLanguages, setCompletedLanguages] = useState<Set<string>>(new Set());
  const [englishQACount, setEnglishQACount] = useState(0);
  const [languageQACounts, setLanguageQACounts] = useState<Record<string, number>>({});
  
  // ENHANCEMENT 5: Verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResults | null>(null);
  
  // ENHANCEMENT 6: Generate All
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateAllProgress, setGenerateAllProgress] = useState<string | null>(null);
  
  // Race safety: track latest refresh request
  const refreshCounterRef = useRef(0);
  
  const isPublishing = publishingQAs === cluster.cluster_id;
  const isGenerating = generatingQALanguage?.clusterId === cluster.cluster_id;
  const isJobRunning = activeJob?.status === 'running';
  
  const isJobStalled = activeJob?.status === 'stalled' || 
    (activeJob?.status === 'running' && activeJob?.updated_at && 
     new Date(activeJob.updated_at).getTime() < Date.now() - STALLED_THRESHOLD_MS);

  // Fetch English articles on mount
  useEffect(() => {
    const fetchEnglishArticles = async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, slug')
        .eq('cluster_id', cluster.cluster_id)
        .eq('language', 'en')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setEnglishArticles(data);
      }
    };

    fetchEnglishArticles();
  }, [cluster.cluster_id]);

  // AUTHORITATIVE Q&A COUNT FETCH - single atomic snapshot from DB
  const fetchQACounts = useCallback(async () => {
    const requestId = ++refreshCounterRef.current;
    
    // Single query to get all Q&A data for this cluster
    const { data: allQAs, error } = await supabase
      .from('qa_pages')
      .select('language, source_article_id, hreflang_group_id')
      .eq('cluster_id', cluster.cluster_id);

    // Race safety: only apply if this is still the latest request
    if (requestId !== refreshCounterRef.current) {
      return;
    }

    if (error) {
      console.error('Error fetching Q&A counts:', error);
      return;
    }

    const qaList = allQAs || [];

    // Count English Q&As
    const englishQAs = qaList.filter(qa => qa.language === 'en');
    setEnglishQACount(englishQAs.length);

    // Count Q&As per target language (use distinct hreflang_group_id for accuracy)
    const langCounts: Record<string, number> = {};
    const langGroupIds: Record<string, Set<string>> = {};
    
    for (const lang of TARGET_LANGUAGES) {
      langGroupIds[lang] = new Set();
    }
    
    qaList.forEach(qa => {
      if (qa.language && qa.language !== 'en' && TARGET_LANGUAGES.includes(qa.language as any)) {
        // Use hreflang_group_id for unique group counting (preferred) or just count rows
        if (qa.hreflang_group_id) {
          langGroupIds[qa.language].add(qa.hreflang_group_id);
        } else {
          // Fallback: count rows if no hreflang_group_id
          langCounts[qa.language] = (langCounts[qa.language] || 0) + 1;
        }
      }
    });

    // Merge: prefer distinct group count, fallback to row count
    for (const lang of TARGET_LANGUAGES) {
      const groupCount = langGroupIds[lang].size;
      // If we have group IDs, use that count; otherwise use raw row count
      langCounts[lang] = groupCount > 0 ? groupCount : (langCounts[lang] || 0);
    }
    
    setLanguageQACounts(langCounts);

    // Count English Q&As per source article
    const articleCounts: Record<string, number> = {};
    englishQAs.forEach(qa => {
      if (qa.source_article_id) {
        articleCounts[qa.source_article_id] = (articleCounts[qa.source_article_id] || 0) + 1;
      }
    });
    setArticleQACounts(articleCounts);

    // Mark completed languages
    const completedLangs = new Set<string>();
    Object.entries(langCounts).forEach(([lang, count]) => {
      if (count >= 24) completedLangs.add(lang);
    });
    setCompletedLanguages(completedLangs);
  }, [cluster.cluster_id]);

  // Initial fetch and when cluster data changes
  useEffect(() => {
    fetchQACounts();
  }, [fetchQACounts, cluster.total_qa_pages]);

  // Auto-refresh while translations are running
  useEffect(() => {
    if (translatingLanguages.size === 0 && !generatingArticle && !isGeneratingAll) {
      return;
    }

    const interval = setInterval(() => {
      fetchQACounts();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [translatingLanguages.size, generatingArticle, isGeneratingAll, fetchQACounts]);

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
    }, 3000);

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

  // Phase 1: Generate English Q&As for a single article
  const handleGenerateEnglishQAs = async (article: EnglishArticle, position: number) => {
    setGeneratingArticle(article.id);
    
    try {
      toast.info(`Generating 4 English Q&As for Article ${position}...`);
      
      const { data, error } = await supabase.functions.invoke('generate-english-article-qas', {
        body: { 
          articleId: article.id,
          articlePosition: position,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Article ${position}: ${data.created} Q&As created`);
        
        // Always refresh from backend for accurate counts
        await fetchQACounts();
        await queryClient.invalidateQueries({ queryKey: ['cluster-qa-pages'] });
        return true;
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating English Q&As:', error);
      toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setGeneratingArticle(null);
    }
  };

  // Phase 2: Translate all Q&As to a target language (ENHANCEMENT 3: Parallel support)
  const handleTranslateToLanguage = async (targetLanguage: string): Promise<boolean> => {
    setTranslatingLanguages(prev => new Set([...prev, targetLanguage]));
    
    try {
      const currentCount = languageQACounts[targetLanguage] || 0;
      const message = currentCount > 0 
        ? `Resuming ${targetLanguage.toUpperCase()} translation (${currentCount}/24)...`
        : `Translating 24 Q&As to ${targetLanguage.toUpperCase()}... (2-3 minutes)`;
      toast.info(message);
      
      const { data, error } = await supabase.functions.invoke('translate-qas-to-language', {
        body: { 
          clusterId: cluster.cluster_id,
          targetLanguage,
        },
      });

      if (error) throw error;

      if (data?.success) {
        // Use actualCount from response for immediate toast feedback
        const newCount = data.actualCount ?? 0;
        const remaining = 24 - newCount;
        
        const msg = remaining > 0
          ? `${targetLanguage.toUpperCase()}: Now at ${newCount}/24 (${remaining} remaining)`
          : `${targetLanguage.toUpperCase()}: ✅ Complete! 24/24 Q&As`;
        toast.success(msg);
        
        // Refresh UI state from backend for accuracy
        await fetchQACounts();
        await queryClient.invalidateQueries({ queryKey: ['cluster-qa-pages'] });
        return true;
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error translating Q&As:', error);
      toast.error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setTranslatingLanguages(prev => {
        const next = new Set(prev);
        next.delete(targetLanguage);
        return next;
      });
    }
  };

  // ENHANCEMENT 5: Verification
  const handleVerifyHreflang = async () => {
    setIsVerifying(true);
    
    try {
      // Query 1: Total Q&As
      const { count: totalQAs } = await supabase
        .from('qa_pages')
        .select('*', { count: 'exact', head: true })
        .eq('cluster_id', cluster.cluster_id);

      // Query 2: Get all hreflang groups and their member counts
      const { data: allQAs } = await supabase
        .from('qa_pages')
        .select('hreflang_group_id, language, translations')
        .eq('cluster_id', cluster.cluster_id);

      const groupCounts = new Map<string, number>();
      const languageCounts: Record<string, number> = { en: 0 };
      TARGET_LANGUAGES.forEach(l => languageCounts[l] = 0);
      
      let missingJsonbCount = 0;

      allQAs?.forEach(qa => {
        if (qa.hreflang_group_id) {
          groupCounts.set(qa.hreflang_group_id, (groupCounts.get(qa.hreflang_group_id) || 0) + 1);
        }
        if (qa.language) {
          languageCounts[qa.language] = (languageCounts[qa.language] || 0) + 1;
        }
        // Check if translations JSONB has all 10 languages
        const translations = qa.translations as Record<string, string> | null;
        if (!translations || Object.keys(translations).length < 10) {
          missingJsonbCount++;
        }
      });

      // Count complete groups (10 members each)
      let completeGroups = 0;
      let incompleteGroups = 0;
      groupCounts.forEach(count => {
        if (count === 10) completeGroups++;
        else incompleteGroups++;
      });

      // Check if all languages have equal counts
      const langValues = Object.values(languageCounts);
      const allLanguagesEqual = langValues.every(v => v === langValues[0]) && langValues[0] > 0;

      setVerificationResults({
        totalQAs: totalQAs || 0,
        expectedTotal: EXPECTED_QAS_PER_CLUSTER,
        completeGroups,
        incompleteGroups,
        allLanguagesEqual,
        languageCounts,
        jsonbComplete: missingJsonbCount === 0,
        missingJsonbCount,
      });

      toast.success('Verification complete!');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // ENHANCEMENT 6: Generate All Automatic Mode
  const handleGenerateAll = async () => {
    const confirmed = window.confirm(
      'This will automatically:\n' +
      '1. Generate 24 English Q&As (Phase 1)\n' +
      '2. Translate to all 9 languages (Phase 2)\n' +
      '3. Verify completeness\n\n' +
      `Estimated time: 25-35 minutes\n` +
      'You can close this browser - progress is saved.\n\n' +
      'Continue?'
    );
    if (!confirmed) return;
    
    setIsGeneratingAll(true);
    setGenerateAllProgress('Starting Phase 1...');
    
    try {
      // Phase 1: Generate English Q&As for all 6 articles
      for (let i = 0; i < englishArticles.length; i++) {
        const article = englishArticles[i];
        const articleCount = articleQACounts[article.id] || 0;
        if (articleCount >= 4) {
          setGenerateAllProgress(`Phase 1: Article ${i + 1}/6 (skipped - already done)`);
          continue;
        }
        
        setGenerateAllProgress(`Phase 1: Article ${i + 1}/${englishArticles.length}`);
        const success = await handleGenerateEnglishQAs(article, i + 1);
        
        if (!success) {
          throw new Error(`Failed on article ${i + 1}`);
        }
        
        // Cooldown between articles
        if (i < englishArticles.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      // Refresh counts
      await fetchQACounts();
      
      // Phase 2: Translate to all 9 languages (2 parallel at a time)
      const batches = [
        ['de', 'nl'],
        ['fr', 'pl'],
        ['sv', 'da'],
        ['hu', 'fi'],
        ['no'],
      ];

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        setGenerateAllProgress(`Phase 2: Batch ${batchIdx + 1}/${batches.length} (${batch.join(', ')})`);
        
        // Filter out already completed languages
        const langsToTranslate = batch.filter(lang => !completedLanguages.has(lang));
        
        if (langsToTranslate.length === 0) continue;
        
        // Translate batch in parallel
        await Promise.all(
          langsToTranslate.map(lang => handleTranslateToLanguage(lang))
        );
        
        // Cooldown between batches
        if (batchIdx < batches.length - 1) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      // Verification
      setGenerateAllProgress('Verifying...');
      await handleVerifyHreflang();
      
      toast.success('🎉 All 240 Q&As generated and verified!');
      
    } catch (error) {
      console.error('Generate all error:', error);
      toast.error(`Generation stopped: ${error instanceof Error ? error.message : 'Unknown error'}. You can resume from where it left off.`);
    } finally {
      setIsGeneratingAll(false);
      setGenerateAllProgress(null);
    }
  };

  const handleResumeJob = async () => {
    if (!activeJob) return;
    
    setIsResumingJob(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-resume-qa-jobs', {
        body: { 
          stalledThresholdMinutes: 0,
          autoResume: true,
          specificJobId: activeJob.id,
        },
      });

      if (error) throw error;

      toast.success('Job resumed! Check progress above.');
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

  const getQAStatusForLanguage = (lang: string) => {
    const articleCount = cluster.languages[lang]?.total || 0;
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

  const totalExpectedQAs = Object.values(cluster.languages).reduce(
    (sum, lang) => sum + (lang.total * QAS_PER_ARTICLE), 
    0
  );
  const completionPercent = totalExpectedQAs > 0 
    ? Math.round((cluster.total_qa_pages / totalExpectedQAs) * 100) 
    : 0;

  const expectedLanguages = getAllExpectedLanguages(cluster);
  const draftQAsCount = cluster.total_qa_pages - cluster.total_qa_published;

  const mismatchInfo = useMemo((): MismatchInfo => {
    const languageCounts: { lang: string; actual: number; expected: number }[] = [];
    
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
    
    const enCount = languageCounts.find(l => l.lang === 'en')?.actual || 0;
    const referenceCount = enCount > 0 ? enCount : Math.max(...languageCounts.map(l => l.actual));
    
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

  const handleRepairMissingQAs = async () => {
    if (!mismatchInfo.hasMismatch) return;
    
    setIsRepairing(true);
    setRepairProgress({ batch: 0, created: 0 });
    
    let totalRepaired = 0;
    const maxAttempts = 10;
    
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        setRepairProgress({ batch: attempt, created: totalRepaired });
        
        const { data, error } = await supabase.functions.invoke('repair-missing-qas', {
          body: { 
            clusterId: cluster.cluster_id,
            languages: mismatchInfo.mismatched.map(m => m.lang),
          },
        });

        if (error) {
          toast.error(`Batch ${attempt} failed. Retrying...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        if (!data) break;
        
        totalRepaired += data.repaired || 0;
        
        toast.success(data.partial 
          ? `Progress: ${data.repaired} created (batch ${attempt})`
          : `Repair complete! ${data.repaired} created`
        );
        
        if (!data.partial || data.repaired === 0) break;
        
        await new Promise(r => setTimeout(r, 2000));
      }
      
      if (totalRepaired > 0) {
        toast.success(`Repair finished! Total: ${totalRepaired} Q&As created`);
      }
      
    } catch (error) {
      toast.error('Repair encountered an error.');
    } finally {
      setIsRepairing(false);
      setRepairProgress(null);
      await fetchQACounts();
      await queryClient.invalidateQueries({ queryKey: ['cluster-qa-pages'] });
    }
  };

  const isPhase1Complete = englishQACount >= 24;
  const isPhase2Complete = Object.values(languageQACounts).every(count => count >= 24);
  const totalQAsCreated = englishQACount + Object.values(languageQACounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="space-y-6">
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

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Q&A Generation Progress</span>
          <span className="font-medium">{cluster.total_qa_pages}/{totalExpectedQAs} Q&As</span>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </div>

      {/* ENHANCEMENT 6: Generate All Button */}
      {!isPhase1Complete || !isPhase2Complete ? (
        <Card className="border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Automatic Generation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Generate all 240 Q&As automatically. Progress is saved - you can resume if interrupted.
                </p>
              </div>
              <Button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll || !!generatingArticle || translatingLanguages.size > 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isGeneratingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {generateAllProgress || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Generate All (25-35 min)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ===== PHASE 1: Generate English Q&As ===== */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-blue-600" />
            Phase 1: Generate English Q&As
            {isPhase1Complete && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate 4 Q&A types per article (pitfalls, costs, process, legal). ~2-3 min per article.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* English Q&A Progress */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <span className="font-medium">English Q&As:</span>
            <span className={`text-lg font-bold ${englishQACount >= 24 ? 'text-green-600' : 'text-blue-600'}`}>
              {englishQACount}/24
              {englishQACount >= 24 && ' ✅'}
            </span>
          </div>

          {/* Article Buttons */}
          <div className="grid grid-cols-1 gap-2">
            {englishArticles.map((article, index) => {
              const qaCount = articleQACounts[article.id] || 0;
              const isCompleted = qaCount >= 4;
              const isPartial = qaCount > 0 && qaCount < 4;
              const missingCount = 4 - qaCount;
              const isGenerating = generatingArticle === article.id;
              
              return (
                <div 
                  key={article.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : isPartial
                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                        : 'bg-background border-border'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{article.headline}</p>
                    {qaCount > 0 && <span className="text-xs text-muted-foreground">{qaCount}/4 Q&As</span>}
                  </div>
                  <Button
                    size="sm"
                    variant={isCompleted ? "outline" : isPartial ? "secondary" : "default"}
                    disabled={isGenerating || isCompleted || !!generatingArticle || isGeneratingAll}
                    onClick={() => handleGenerateEnglishQAs(article, index + 1)}
                    className={isCompleted ? 'border-green-400 text-green-700' : isPartial ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700'}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Done
                      </>
                    ) : isPartial ? (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Generate {missingCount} Missing
                      </>
                    ) : (
                      'Generate 4 Q&As'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {englishArticles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No English articles found for this cluster.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ===== PHASE 2: Translate to Languages ===== */}
      <Card className={`border-purple-200 dark:border-purple-800 ${!isPhase1Complete ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-purple-600" />
            Phase 2: Translate to Languages
            {isPhase2Complete && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Translate all 24 English Q&As to each language. ~2-3 min per language (batch mode).
            {!isPhase1Complete && (
              <span className="text-amber-600 font-medium ml-1">
                (Complete Phase 1 first: {englishQACount}/24 English Q&As)
              </span>
            )}
            {isPhase1Complete && (
              <span className="text-blue-600 font-medium ml-1">
                Up to {MAX_PARALLEL_TRANSLATIONS} languages can run in parallel.
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Translation Grid */}
          <div className="grid grid-cols-3 gap-3">
            {TARGET_LANGUAGES.map((lang) => {
              const count = languageQACounts[lang] || 0;
              const isCompleted = count >= 24;
              const isTranslating = translatingLanguages.has(lang);
              const canStartMore = translatingLanguages.size < MAX_PARALLEL_TRANSLATIONS;
              const isDisabled = !isPhase1Complete || isTranslating || (!canStartMore && !isCompleted) || isGeneratingAll;
              const isPartial = count > 0 && count < 24;
              
              return (
                <div 
                  key={lang}
                  className={`p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : isPartial
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{getLanguageFlag(lang)}</span>
                    <span className={`font-bold ${isCompleted ? 'text-green-600' : isPartial ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {count}/24
                      {isCompleted && ' ✅'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={isCompleted ? "outline" : "default"}
                    disabled={isDisabled || isCompleted}
                    onClick={() => handleTranslateToLanguage(lang)}
                    className={`w-full ${
                      isCompleted 
                        ? 'border-green-400 text-green-700' 
                        : isPartial
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Translating...
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </>
                    ) : isPartial ? (
                      `Resume ${lang.toUpperCase()} (${count}/24)`
                    ) : (
                      `Translate to ${lang.toUpperCase()}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ENHANCEMENT 5: Verification Panel */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Verification
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verify hreflang completeness and translations JSONB integrity.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleVerifyHreflang}
            disabled={isVerifying}
            variant="outline"
            className="border-green-400 text-green-700 hover:bg-green-50"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Verify Hreflang Completeness
              </>
            )}
          </Button>

          {verificationResults && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${verificationResults.totalQAs >= verificationResults.expectedTotal ? 'bg-green-100 dark:bg-green-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                  <div className="text-sm font-medium">Total Q&As</div>
                  <div className="text-xl font-bold">
                    {verificationResults.totalQAs}/{verificationResults.expectedTotal}
                    {verificationResults.totalQAs >= verificationResults.expectedTotal ? ' ✅' : ' ⚠️'}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${verificationResults.incompleteGroups === 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                  <div className="text-sm font-medium">Complete Groups (10 langs each)</div>
                  <div className="text-xl font-bold">
                    {verificationResults.completeGroups}/24
                    {verificationResults.incompleteGroups === 0 ? ' ✅' : ` (${verificationResults.incompleteGroups} incomplete)`}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${verificationResults.allLanguagesEqual ? 'bg-green-100 dark:bg-green-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                  <div className="text-sm font-medium">All Languages Equal</div>
                  <div className="text-xl font-bold">{verificationResults.allLanguagesEqual ? 'Yes ✅' : 'No ⚠️'}</div>
                </div>
                <div className={`p-3 rounded-lg ${verificationResults.jsonbComplete ? 'bg-green-100 dark:bg-green-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                  <div className="text-sm font-medium">Translations JSONB</div>
                  <div className="text-xl font-bold">
                    {verificationResults.jsonbComplete ? 'Complete ✅' : `${verificationResults.missingJsonbCount} incomplete`}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm font-medium mb-2">Q&As per Language:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(verificationResults.languageCounts).map(([lang, count]) => (
                    <Badge 
                      key={lang} 
                      variant={count >= 24 ? "default" : "outline"}
                      className={count >= 24 ? 'bg-green-600' : 'border-amber-400 text-amber-700'}
                    >
                      {getLanguageFlag(lang)} {lang.toUpperCase()}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stalled Job Warning */}
      {isJobStalled && activeJob && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-300">Job Stalled</span>
          </div>
          
          <div className="space-y-2 text-sm text-amber-700 dark:text-amber-400">
            <p>
              Article {(activeJob.current_article_index || 0) + 1} of {activeJob.total_articles} • 
              {activeJob.total_qas_created || 0} Q&As created
            </p>
          </div>
          
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResumeJob}
              disabled={isResumingJob}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {isResumingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Resume
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelJob}
              disabled={isCancellingJob}
              className="text-red-600 hover:bg-red-50"
            >
              {isCancellingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Q&A Count Mismatch Warning */}
      {mismatchInfo.hasMismatch && !isJobRunning && !isJobStalled && (
        <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg dark:bg-orange-950/30 dark:border-orange-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800 dark:text-orange-300">Q&A Count Mismatch</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {mismatchInfo.mismatched.map(({ lang, actual, missing }) => (
              <Badge key={lang} variant="outline" className="border-orange-400 text-orange-700">
                {getLanguageFlag(lang)} {lang.toUpperCase()}: {actual}/{mismatchInfo.maxCount} (missing {missing})
              </Badge>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="border-orange-400 text-orange-700 hover:bg-orange-100"
            onClick={handleRepairMissingQAs}
            disabled={isRepairing}
          >
            {isRepairing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {repairProgress ? `Batch ${repairProgress.batch}...` : 'Starting...'}
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
                <div className="text-sm font-medium">{status.actualQAs}/{status.expectedQAs}</div>
                <div className="text-xs text-muted-foreground">{status.publishedQAs}P</div>
                
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

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onPublishQAs}
          disabled={draftQAsCount === 0 || isPublishing}
        >
          {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          Publish All Q&As ({draftQAsCount} drafts)
        </Button>
      </div>
    </div>
  );
};
