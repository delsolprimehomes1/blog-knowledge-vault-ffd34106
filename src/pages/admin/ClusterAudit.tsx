import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Link2,
  User,
  ExternalLink,
  ArrowLeft,
  Shield,
  Zap,
  RotateCcw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ArticleDetail {
  id: string;
  slug: string;
  language: string;
  headline: string;
  hasAuthor: boolean;
  citationCount: number;
  internalLinkCount: number;
  severity: 'critical' | 'warning' | 'ok';
  detailed_content?: string;
  funnel_stage?: string;
}

interface AuditResult {
  totalArticles: number;
  issues: {
    missingCitations: number;
    missingInternalLinks: number;
    missingAuthors: number;
  };
  articleDetails: ArticleDetail[];
}

// Batch processing constants
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 10000; // 10 seconds between batches
const AVG_TIME_PER_ARTICLE_MS = 45000; // 45 seconds average per article

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatTimeRemaining = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return `~${minutes}m ${seconds}s remaining`;
  }
  return `~${seconds}s remaining`;
};

const ClusterAudit = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixingCitations, setIsFixingCitations] = useState(false);
  const [isFixingLinks, setIsFixingLinks] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState<string>('');
  const [auditResults, setAuditResults] = useState<AuditResult | null>(null);
  const [clusterTheme, setClusterTheme] = useState<string>('');
  
  // Batch processing state
  const [failedCitationArticles, setFailedCitationArticles] = useState<ArticleDetail[]>([]);
  const [failedLinkArticles, setFailedLinkArticles] = useState<ArticleDetail[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('');
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  // Auto-audit on load
  useEffect(() => {
    if (clusterId) {
      handleAudit();
    }
  }, [clusterId]);

  const handleAudit = async () => {
    if (!clusterId) return;
    setIsAuditing(true);
    
    try {
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, slug, language, headline, author_id, external_citations, internal_links, detailed_content, funnel_stage, cluster_theme')
        .eq('cluster_id', clusterId);

      if (error) throw error;

      if (!articles || articles.length === 0) {
        toast.error('No articles found in this cluster');
        setIsAuditing(false);
        return;
      }

      // Set cluster theme from first article
      if (articles[0]?.cluster_theme) {
        setClusterTheme(articles[0].cluster_theme);
      }

      // Analyze each article
      const articleDetails: ArticleDetail[] = articles.map(article => {
        const citations = article.external_citations as any[] | null;
        const links = article.internal_links as any[] | null;
        const citationCount = Array.isArray(citations) ? citations.length : 0;
        const internalLinkCount = Array.isArray(links) ? links.length : 0;
        const hasAuthor = !!article.author_id;

        let severity: 'critical' | 'warning' | 'ok' = 'ok';
        if (!hasAuthor || citationCount === 0) {
          severity = 'critical';
        } else if (citationCount < 3 || internalLinkCount < 3) {
          severity = 'warning';
        }

        return {
          id: article.id,
          slug: article.slug,
          language: article.language,
          headline: article.headline,
          hasAuthor,
          citationCount,
          internalLinkCount,
          severity,
          detailed_content: article.detailed_content,
          funnel_stage: article.funnel_stage,
        };
      });

      const results: AuditResult = {
        totalArticles: articles.length,
        issues: {
          missingCitations: articleDetails.filter(a => a.citationCount === 0).length,
          missingInternalLinks: articleDetails.filter(a => a.internalLinkCount === 0).length,
          missingAuthors: articleDetails.filter(a => !a.hasAuthor).length,
        },
        articleDetails,
      };

      setAuditResults(results);

      const criticalCount = articleDetails.filter(a => a.severity === 'critical').length;
      if (criticalCount > 0) {
        toast.error(`Found ${criticalCount} articles with critical issues!`);
      } else {
        toast.success('Audit complete - all articles pass AEO compliance!');
      }

    } catch (error: any) {
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Process articles in batches with retry support
  const processArticlesInBatches = async (
    articles: ArticleDetail[],
    processFunction: (article: ArticleDetail) => Promise<boolean>,
    onProgress: (completed: number, total: number, current: string) => void
  ): Promise<{ succeeded: string[]; failed: ArticleDetail[] }> => {
    const succeeded: string[] = [];
    const failed: ArticleDetail[] = [];
    const total = articles.length;
    const batches = Math.ceil(total / BATCH_SIZE);
    
    setTotalBatches(batches);
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      setCurrentBatch(batchIndex + 1);
      const batchStart = batchIndex * BATCH_SIZE;
      const batch = articles.slice(batchStart, batchStart + BATCH_SIZE);
      
      // Update estimated time remaining
      const articlesRemaining = total - batchStart;
      const timeRemaining = articlesRemaining * AVG_TIME_PER_ARTICLE_MS;
      setEstimatedTimeRemaining(formatTimeRemaining(timeRemaining));
      
      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (article) => {
          onProgress(batchStart + batch.indexOf(article), total, `${article.language.toUpperCase()}: ${article.headline.slice(0, 40)}...`);
          const success = await processFunction(article);
          return { article, success };
        })
      );
      
      // Collect results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            succeeded.push(result.value.article.id);
          } else {
            failed.push(result.value.article);
          }
        } else {
          failed.push(batch[index]);
        }
      });
      
      // Update progress
      const completed = batchStart + batch.length;
      onProgress(completed, total, '');
      setFixProgress(Math.round((completed / total) * 100));
      
      // Delay between batches (except for the last one)
      if (batchIndex < batches - 1) {
        setCurrentArticle(`Waiting 10s before next batch (${batchIndex + 2}/${batches})...`);
        await delay(BATCH_DELAY_MS);
      }
    }
    
    return { succeeded, failed };
  };

  const handleFixCitations = async (articlesToFix?: ArticleDetail[]) => {
    if (!auditResults && !articlesToFix) return;

    const articlesNeedingCitations = articlesToFix || auditResults!.articleDetails.filter(
      a => a.citationCount === 0
    );

    if (articlesNeedingCitations.length === 0) {
      toast.info('All articles already have citations');
      return;
    }

    setIsFixingCitations(true);
    setFixProgress(0);
    setSuccessCount(0);
    setFailedCitationArticles([]);

    try {
      const processCitationArticle = async (article: ArticleDetail): Promise<boolean> => {
        try {
          console.log(`[Citations] Processing: ${article.slug}`);
          
          const { data, error } = await supabase.functions.invoke('find-external-links', {
            body: {
              content: article.detailed_content || '',
              headline: article.headline,
              language: article.language,
            }
          });

          if (error) {
            console.error(`[Citations] Edge function error for ${article.slug}:`, error);
            return false;
          }
          
          if (data?.citations && Array.isArray(data.citations) && data.citations.length > 0) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                external_citations: data.citations,
                citation_status: 'verified',
                last_citation_check_at: new Date().toISOString()
              })
              .eq('id', article.id);

            if (updateError) {
              console.error(`[Citations] Update error for ${article.slug}:`, updateError);
              return false;
            }
            
            console.log(`[Citations] Success: ${article.slug} - ${data.citations.length} citations`);
            return true;
          }
          
          console.log(`[Citations] No citations returned for ${article.slug}`);
          return false;
        } catch (err) {
          console.error(`[Citations] Exception for ${article.slug}:`, err);
          return false;
        }
      };

      let successCounter = 0;
      
      const { succeeded, failed } = await processArticlesInBatches(
        articlesNeedingCitations,
        processCitationArticle,
        (completed, total, current) => {
          if (current) setCurrentArticle(current);
          // Note: successCounter is updated after each batch completes in the loop
        }
      );
      
      setSuccessCount(succeeded.length);

      setFailedCitationArticles(failed);
      
      if (failed.length > 0) {
        toast.warning(`Added citations to ${succeeded.length} articles. ${failed.length} failed - click "Retry Failed" to try again.`);
      } else {
        toast.success(`Successfully added citations to all ${succeeded.length} articles!`);
      }
      
      // Re-audit
      await handleAudit();

    } catch (error: any) {
      toast.error(`Failed to fix citations: ${error.message}`);
    } finally {
      setIsFixingCitations(false);
      setFixProgress(0);
      setCurrentArticle('');
      setEstimatedTimeRemaining('');
    }
  };

  const handleFixInternalLinks = async (articlesToFix?: ArticleDetail[]) => {
    if (!auditResults && !articlesToFix) return;

    const articlesNeedingLinks = articlesToFix || auditResults!.articleDetails.filter(
      a => a.internalLinkCount === 0
    );

    if (articlesNeedingLinks.length === 0) {
      toast.info('All articles already have internal links');
      return;
    }

    setIsFixingLinks(true);
    setFixProgress(0);
    setSuccessCount(0);
    setFailedLinkArticles([]);

    try {
      const processLinkArticle = async (article: ArticleDetail): Promise<boolean> => {
        try {
          console.log(`[Links] Processing: ${article.slug}`);
          
          const { data, error } = await supabase.functions.invoke('find-internal-links', {
            body: {
              content: article.detailed_content || '',
              headline: article.headline,
              currentArticleId: article.id,
              language: article.language,
              funnelStage: article.funnel_stage || 'TOFU',
            }
          });

          if (error) {
            console.error(`[Links] Edge function error for ${article.slug}:`, error);
            return false;
          }
          
          if (data?.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            const internalLinks = data.suggestions.map((s: any) => ({
              articleId: s.articleId,
              url: s.url,
              title: s.title,
              anchorText: s.suggestedAnchor || s.title,
              relevanceScore: s.relevanceScore || 0.8,
            }));

            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                internal_links: internalLinks,
                last_link_validation: new Date().toISOString()
              })
              .eq('id', article.id);

            if (updateError) {
              console.error(`[Links] Update error for ${article.slug}:`, updateError);
              return false;
            }
            
            console.log(`[Links] Success: ${article.slug} - ${internalLinks.length} links`);
            return true;
          }
          
          console.log(`[Links] No links returned for ${article.slug}`);
          return false;
        } catch (err) {
          console.error(`[Links] Exception for ${article.slug}:`, err);
          return false;
        }
      };

      let successCounter = 0;
      
      const { succeeded, failed } = await processArticlesInBatches(
        articlesNeedingLinks,
        processLinkArticle,
        (completed, total, current) => {
          if (current) setCurrentArticle(current);
          // Note: successCounter is updated after each batch completes in the loop
        }
      );
      
      setSuccessCount(succeeded.length);

      setFailedLinkArticles(failed);
      
      if (failed.length > 0) {
        toast.warning(`Added links to ${succeeded.length} articles. ${failed.length} failed - click "Retry Failed" to try again.`);
      } else {
        toast.success(`Successfully added internal links to all ${succeeded.length} articles!`);
      }
      
      // Re-audit
      await handleAudit();

    } catch (error: any) {
      toast.error(`Failed to fix internal links: ${error.message}`);
    } finally {
      setIsFixingLinks(false);
      setFixProgress(0);
      setCurrentArticle('');
      setEstimatedTimeRemaining('');
    }
  };

  const handleFixAll = async () => {
    await handleFixCitations();
    await handleFixInternalLinks();
  };

  const handleRetryCitations = () => {
    if (failedCitationArticles.length > 0) {
      handleFixCitations(failedCitationArticles);
    }
  };

  const handleRetryLinks = () => {
    if (failedLinkArticles.length > 0) {
      handleFixInternalLinks(failedLinkArticles);
    }
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      en: "🇬🇧", de: "🇩🇪", nl: "🇳🇱", fr: "🇫🇷", es: "🇪🇸",
      pl: "🇵🇱", sv: "🇸🇪", da: "🇩🇰", hu: "🇭🇺", fi: "🇫🇮", no: "🇳🇴",
    };
    return flags[lang] || lang.toUpperCase();
  };

  const isFixing = isFixingCitations || isFixingLinks;

  if (!clusterId) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No cluster ID provided. Please navigate from the cluster list.
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">AEO Compliance Audit</h1>
            </div>
            <p className="text-muted-foreground">
              {clusterTheme || 'Loading...'}
            </p>
            <code className="text-xs text-muted-foreground font-mono">
              Cluster: {clusterId}
            </code>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/clusters')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clusters
          </Button>
        </div>

        {/* Critical Alert */}
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Critical AEO Requirements:</strong> All articles MUST have external citations (3-6 per article)
            and internal links (3-5 per article) to rank well in AI search engines. Missing citations severely impact
            discoverability.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleAudit}
            disabled={isAuditing || isFixing}
            variant="outline"
          >
            {isAuditing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-Run Audit
              </>
            )}
          </Button>

          {auditResults && auditResults.issues.missingCitations > 0 && (
            <Button
              onClick={() => handleFixCitations()}
              disabled={isFixing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isFixingCitations ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing Citations ({fixProgress}%)
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Fix All Citations ({auditResults.issues.missingCitations})
                </>
              )}
            </Button>
          )}

          {auditResults && auditResults.issues.missingInternalLinks > 0 && (
            <Button
              onClick={() => handleFixInternalLinks()}
              disabled={isFixing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isFixingLinks ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing Links ({fixProgress}%)
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Fix All Internal Links ({auditResults.issues.missingInternalLinks})
                </>
              )}
            </Button>
          )}

          {auditResults && (auditResults.issues.missingCitations > 0 || auditResults.issues.missingInternalLinks > 0) && (
            <Button
              onClick={handleFixAll}
              disabled={isFixing}
              variant="default"
            >
              <Zap className="mr-2 h-4 w-4" />
              Fix All Issues
            </Button>
          )}

          {/* Retry Failed Buttons */}
          {!isFixing && failedCitationArticles.length > 0 && (
            <Button
              onClick={handleRetryCitations}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Failed Citations ({failedCitationArticles.length})
            </Button>
          )}

          {!isFixing && failedLinkArticles.length > 0 && (
            <Button
              onClick={handleRetryLinks}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Failed Links ({failedLinkArticles.length})
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {isFixing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-md">
                    {currentArticle || 'Processing...'}
                  </span>
                  <div className="flex items-center gap-4">
                    {totalBatches > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Batch {currentBatch}/{totalBatches}
                      </span>
                    )}
                    {estimatedTimeRemaining && (
                      <span className="text-xs text-muted-foreground">
                        {estimatedTimeRemaining}
                      </span>
                    )}
                    <span className="font-medium">{fixProgress}%</span>
                  </div>
                </div>
                <Progress value={fixProgress} />
                {successCount > 0 && (
                  <p className="text-xs text-green-600">
                    ✓ {successCount} articles processed successfully
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {auditResults && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{auditResults.totalArticles}</p>
                </CardContent>
              </Card>

              <Card className={auditResults.issues.missingAuthors > 0 ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Missing Authors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${auditResults.issues.missingAuthors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {auditResults.issues.missingAuthors}
                  </p>
                </CardContent>
              </Card>

              <Card className={auditResults.issues.missingCitations > 0 ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    No Citations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${auditResults.issues.missingCitations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {auditResults.issues.missingCitations}
                  </p>
                </CardContent>
              </Card>

              <Card className={auditResults.issues.missingInternalLinks > 0 ? 'border-yellow-200 dark:border-yellow-800' : 'border-green-200 dark:border-green-800'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    No Internal Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${auditResults.issues.missingInternalLinks > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {auditResults.issues.missingInternalLinks}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Score */}
            {auditResults.issues.missingCitations === 0 && auditResults.issues.missingInternalLinks === 0 && auditResults.issues.missingAuthors === 0 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>✅ AEO Compliance Score: 100%</strong> — All articles are ready for publishing!
                </AlertDescription>
              </Alert>
            )}

            {/* Article List by Language */}
            <Card>
              <CardHeader>
                <CardTitle>Article Details by Language</CardTitle>
                <CardDescription>
                  Review individual article compliance status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Group by language */}
                {Object.entries(
                  auditResults.articleDetails.reduce((acc, article) => {
                    if (!acc[article.language]) acc[article.language] = [];
                    acc[article.language].push(article);
                    return acc;
                  }, {} as Record<string, ArticleDetail[]>)
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([language, articles]) => (
                  <div key={language} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{getLanguageFlag(language)}</span>
                      <span className="font-semibold">{language.toUpperCase()}</span>
                      <Badge variant="outline">{articles.length} articles</Badge>
                    </div>
                    
                    <div className="space-y-2 pl-6 border-l-2 border-muted">
                      {articles.map(article => (
                        <div
                          key={article.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {article.severity === 'critical' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              {article.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                              {article.severity === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                              <span className="font-medium truncate">{article.headline}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{article.slug}</p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className={article.hasAuthor ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                {article.hasAuthor ? '✓' : '✗'} Author
                              </span>
                              <span className={article.citationCount > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                {article.citationCount} Citations
                              </span>
                              <span className={article.internalLinkCount > 0 ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}>
                                {article.internalLinkCount} Internal Links
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={article.severity === 'ok' ? 'default' : article.severity === 'critical' ? 'destructive' : 'secondary'}
                          >
                            {article.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading State */}
        {isAuditing && !auditResults && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Running AEO compliance audit...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClusterAudit;
