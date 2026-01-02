import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, HelpCircle, Loader2, PlayCircle, AlertTriangle, FileText, RotateCcw, XCircle, Wrench, RefreshCw, Globe, Languages } from "lucide-react";
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
const QAS_PER_ARTICLE = 4;
const ARTICLES_PER_LANGUAGE = 6;
const EXPECTED_QAS_PER_LANGUAGE = QAS_PER_ARTICLE * ARTICLES_PER_LANGUAGE; // 24
const TOTAL_LANGUAGES = 10;
const EXPECTED_QAS_PER_CLUSTER = EXPECTED_QAS_PER_LANGUAGE * TOTAL_LANGUAGES; // 240

// Target languages (all except English)
const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'] as const;

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
  
  // Two-phase generation state
  const [englishArticles, setEnglishArticles] = useState<EnglishArticle[]>([]);
  const [generatingArticle, setGeneratingArticle] = useState<string | null>(null);
  const [completedArticles, setCompletedArticles] = useState<Set<string>>(new Set());
  const [translatingLanguage, setTranslatingLanguage] = useState<string | null>(null);
  const [completedLanguages, setCompletedLanguages] = useState<Set<string>>(new Set());
  const [englishQACount, setEnglishQACount] = useState(0);
  const [languageQACounts, setLanguageQACounts] = useState<Record<string, number>>({});
  
  const isPublishing = publishingQAs === cluster.cluster_id;
  const isGenerating = generatingQALanguage?.clusterId === cluster.cluster_id;
  const isJobRunning = activeJob?.status === 'running';
  
  // Detect stalled jobs
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

  // Fetch Q&A counts on mount and refresh
  useEffect(() => {
    const fetchQACounts = async () => {
      // Get English Q&A count
      const { count: enCount } = await supabase
        .from('qa_pages')
        .select('*', { count: 'exact', head: true })
        .eq('cluster_id', cluster.cluster_id)
        .eq('language', 'en');
      
      setEnglishQACount(enCount || 0);

      // Get counts per language
      const counts: Record<string, number> = {};
      for (const lang of TARGET_LANGUAGES) {
        const { count } = await supabase
          .from('qa_pages')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', cluster.cluster_id)
          .eq('language', lang);
        counts[lang] = count || 0;
      }
      setLanguageQACounts(counts);

      // Mark completed articles (those with 4 English Q&As each)
      const { data: qaData } = await supabase
        .from('qa_pages')
        .select('source_article_id')
        .eq('cluster_id', cluster.cluster_id)
        .eq('language', 'en');

      if (qaData) {
        const articleCounts: Record<string, number> = {};
        qaData.forEach(qa => {
          if (qa.source_article_id) {
            articleCounts[qa.source_article_id] = (articleCounts[qa.source_article_id] || 0) + 1;
          }
        });
        
        const completed = new Set<string>();
        Object.entries(articleCounts).forEach(([articleId, count]) => {
          if (count >= 4) completed.add(articleId);
        });
        setCompletedArticles(completed);
      }

      // Mark completed languages (those with 24 Q&As)
      const completedLangs = new Set<string>();
      Object.entries(counts).forEach(([lang, count]) => {
        if (count >= 24) completedLangs.add(lang);
      });
      setCompletedLanguages(completedLangs);
    };

    fetchQACounts();
  }, [cluster.cluster_id, cluster.total_qa_pages]);

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
        toast.success(`Article ${position} complete! Created ${data.created}/4 Q&As`);
        setCompletedArticles(prev => new Set([...prev, article.id]));
        setEnglishQACount(prev => prev + (data.created || 0));
        
        // Refresh data
        await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating English Q&As:', error);
      toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingArticle(null);
    }
  };

  // Phase 2: Translate all Q&As to a target language
  const handleTranslateToLanguage = async (targetLanguage: string) => {
    setTranslatingLanguage(targetLanguage);
    
    try {
      toast.info(`Translating 24 Q&As to ${targetLanguage.toUpperCase()}... (5-7 minutes)`);
      
      const { data, error } = await supabase.functions.invoke('translate-qas-to-language', {
        body: { 
          clusterId: cluster.cluster_id,
          targetLanguage,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const msg = data.alreadyExisted > 0 
          ? `${targetLanguage.toUpperCase()}: ${data.translated} translated, ${data.alreadyExisted} already existed`
          : `${targetLanguage.toUpperCase()}: ${data.translated}/24 Q&As translated`;
        toast.success(msg);
        
        setCompletedLanguages(prev => new Set([...prev, targetLanguage]));
        setLanguageQACounts(prev => ({
          ...prev,
          [targetLanguage]: (prev[targetLanguage] || 0) + (data.translated || 0),
        }));
        
        // Refresh data
        await queryClient.invalidateQueries({ queryKey: ['clusters'] });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error translating Q&As:', error);
      toast.error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTranslatingLanguage(null);
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

  // Calculate correct totals based on actual articles per language
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

  // Mismatch detection
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
      await queryClient.invalidateQueries({ queryKey: ['clusters'] });
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
              const isCompleted = completedArticles.has(article.id);
              const isGenerating = generatingArticle === article.id;
              
              return (
                <div 
                  key={article.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{article.headline}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isCompleted ? "outline" : "default"}
                    disabled={isGenerating || isCompleted || !!generatingArticle}
                    onClick={() => handleGenerateEnglishQAs(article, index + 1)}
                    className={isCompleted ? 'border-green-400 text-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Done
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
            Translate all 24 English Q&As to each language. ~5-7 min per language.
            {!isPhase1Complete && (
              <span className="text-amber-600 font-medium ml-1">
                (Complete Phase 1 first: {englishQACount}/24 English Q&As)
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
              const isTranslating = translatingLanguage === lang;
              const isDisabled = !isPhase1Complete || isTranslating || !!translatingLanguage;
              
              return (
                <div 
                  key={lang}
                  className={`p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{getLanguageFlag(lang)}</span>
                    <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
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
