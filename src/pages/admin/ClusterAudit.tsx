import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeft,
  Play,
  SkipForward,
  RotateCcw,
  Circle,
  ArrowRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ArticleStatus {
  id: string;
  slug: string;
  language: string;
  headline: string;
  cluster_number: number;
  hasAuthor: boolean;
  citationCount: number;
  internalLinkCount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
  debug?: {
    aiGenerated?: number;
    accepted?: number;
    rejected?: number;
    rejectionReasons?: Record<string, number>;
  };
  detailed_content?: string;
}

const getLanguageFlag = (lang: string) => {
  const flags: Record<string, string> = {
    en: "🇬🇧", de: "🇩🇪", nl: "🇳🇱", fr: "🇫🇷", es: "🇪🇸",
    pl: "🇵🇱", sv: "🇸🇪", da: "🇩🇰", hu: "🇭🇺", fi: "🇫🇮", no: "🇳🇴",
  };
  return flags[lang] || lang.toUpperCase();
};

export default function ClusterAudit() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [articles, setArticles] = useState<ArticleStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [clusterTheme, setClusterTheme] = useState('');

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
      const { data: articlesData, error } = await supabase
        .from('blog_articles')
        .select('id, slug, language, headline, cluster_number, author_id, external_citations, internal_links, detailed_content, cluster_theme')
        .eq('cluster_id', clusterId)
        .order('language', { ascending: true })
        .order('cluster_number', { ascending: true });

      if (error) throw error;

      if (!articlesData || articlesData.length === 0) {
        toast.error('No articles found in this cluster');
        setIsAuditing(false);
        return;
      }

      if (articlesData[0]?.cluster_theme) {
        setClusterTheme(articlesData[0].cluster_theme);
      }

      const statusArticles: ArticleStatus[] = articlesData.map(article => {
        const citations = article.external_citations as any[] | null;
        const links = article.internal_links as any[] | null;
        return {
          id: article.id,
          slug: article.slug,
          language: article.language,
          headline: article.headline,
          cluster_number: article.cluster_number || 1,
          hasAuthor: !!article.author_id,
          citationCount: Array.isArray(citations) ? citations.length : 0,
          internalLinkCount: Array.isArray(links) ? links.length : 0,
          status: (Array.isArray(citations) && citations.length > 0) ? 'success' : 'pending',
          detailed_content: article.detailed_content,
        };
      });

      setArticles(statusArticles);

      // Find first article needing citations
      const firstPending = statusArticles.findIndex(a => a.status === 'pending');
      setCurrentIndex(firstPending >= 0 ? firstPending : 0);

      const needingCitations = statusArticles.filter(a => a.citationCount === 0).length;
      if (needingCitations > 0) {
        toast.warning(`${needingCitations} articles need citations`);
      } else {
        toast.success('All articles have citations!');
      }

    } catch (error: any) {
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFixNextArticle = async () => {
    const article = articles[currentIndex];
    
    if (!article) {
      toast.info('No more articles to process');
      return;
    }

    if (article.status === 'success') {
      // Find next pending article
      const nextPending = articles.findIndex((a, i) => i > currentIndex && (a.status === 'pending' || a.status === 'failed'));
      if (nextPending >= 0) {
        setCurrentIndex(nextPending);
        toast.info('Skipped to next article needing citations');
      } else {
        toast.success('All articles have been processed!');
      }
      return;
    }

    setIsFixing(true);
    
    // Update status to processing
    setArticles(prev => prev.map((a, i) => 
      i === currentIndex ? { ...a, status: 'processing' as const, error: undefined } : a
    ));

    const logEntry = `[${new Date().toLocaleTimeString()}] Processing: ${article.headline.substring(0, 50)}... (${article.language.toUpperCase()})`;
    setProcessingLog(prev => [...prev, logEntry]);

    try {
      // Use Perplexity API for faster, more accurate citation finding
      const { data, error } = await supabase.functions.invoke('find-citations-perplexity', {
        body: {
          articleContent: article.detailed_content || '',
          articleTopic: article.headline,
          articleLanguage: article.language,
        }
      });

      if (error) throw error;

      // Check results - Perplexity returns { success, citations, diagnostics }
      if (data?.success && data?.citations && Array.isArray(data.citations) && data.citations.length > 0) {
        // Update the article in database
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ 
            external_citations: data.citations,
            citation_status: 'verified',
            last_citation_check_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) throw updateError;

        // Success log
        const successLog = `✅ SUCCESS: Added ${data.citations.length} citations via Perplexity`;
        setProcessingLog(prev => [...prev, successLog]);
        
        if (data.diagnostics) {
          const debugLog = `   📊 Claims analyzed: ${data.diagnostics.claimsAnalyzed || '?'}, Found: ${data.citations.length}, Time: ${data.diagnostics.timeElapsed || '?'}`;
          setProcessingLog(prev => [...prev, debugLog]);
        }

        // Update article status
        setArticles(prev => prev.map((a, i) => 
          i === currentIndex 
            ? { 
                ...a, 
                status: 'success' as const, 
                citationCount: data.citations.length,
                debug: {
                  aiGenerated: data.diagnostics?.claimsAnalyzed || 0,
                  accepted: data.citations.length,
                  rejected: data.diagnostics?.competitorsBlocked || 0,
                } 
              } 
            : a
        ));

        toast.success(`Added ${data.citations.length} citations via Perplexity!`);

        // Auto-move to next pending article after 1 second
        setTimeout(() => {
          const nextPending = articles.findIndex((a, i) => i > currentIndex && (a.status === 'pending' || a.status === 'failed'));
          if (nextPending >= 0) {
            setCurrentIndex(nextPending);
          } else {
            // Check if there are any remaining pending before current
            const anyPending = articles.findIndex(a => a.status === 'pending' || a.status === 'failed');
            if (anyPending >= 0 && anyPending !== currentIndex) {
              setCurrentIndex(anyPending);
            }
          }
        }, 1000);

      } else {
        // Failed - no citations found
        const failLog = `❌ FAILED: ${data?.message || 'No citations found'}`;
        setProcessingLog(prev => [...prev, failLog]);
        
        if (data?.diagnostics?.suggestions) {
          const suggestions = data.diagnostics.suggestions.join('; ');
          const reasonsLog = `   Suggestions: ${suggestions}`;
          setProcessingLog(prev => [...prev, reasonsLog]);
        }

        setArticles(prev => prev.map((a, i) => 
          i === currentIndex 
            ? { 
                ...a, 
                status: 'failed' as const, 
                error: data?.message || 'No citations found',
                debug: data?.diagnostics 
              } 
            : a
        ));

        toast.error(data?.message || 'Failed to find citations');
      }

    } catch (error: any) {
      const errorLog = `❌ ERROR: ${error.message}`;
      setProcessingLog(prev => [...prev, errorLog]);

      setArticles(prev => prev.map((a, i) => 
        i === currentIndex 
          ? { 
              ...a, 
              status: 'failed' as const, 
              error: error.message 
            } 
          : a
      ));

      toast.error(`Error: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const handleSkipArticle = () => {
    const nextPending = articles.findIndex((a, i) => i > currentIndex && (a.status === 'pending' || a.status === 'failed'));
    if (nextPending >= 0) {
      setCurrentIndex(nextPending);
    } else {
      setCurrentIndex(Math.min(currentIndex + 1, articles.length - 1));
    }
    toast.info('Skipped to next article');
  };

  const handleResetArticle = (index: number) => {
    setArticles(prev => prev.map((a, i) => 
      i === index ? { ...a, status: 'pending' as const, error: undefined, debug: undefined } : a
    ));
    setCurrentIndex(index);
    toast.info('Article reset to pending');
  };

  // Group articles by language
  const articlesByLanguage = articles.reduce((acc, article) => {
    if (!acc[article.language]) acc[article.language] = [];
    acc[article.language].push(article);
    return acc;
  }, {} as Record<string, ArticleStatus[]>);

  const languageOrder = Object.keys(articlesByLanguage).sort();
  const currentArticle = articles[currentIndex];
  const totalPending = articles.filter(a => a.status === 'pending').length;
  const totalSuccess = articles.filter(a => a.status === 'success').length;
  const totalFailed = articles.filter(a => a.status === 'failed').length;
  const progress = articles.length > 0 ? (totalSuccess / articles.length) * 100 : 0;

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
            <h1 className="text-2xl font-bold mb-1">Citation Fixer - Manual Mode</h1>
            <p className="text-muted-foreground text-sm">{clusterTheme || 'Loading...'}</p>
            <code className="text-xs text-muted-foreground font-mono">
              Cluster: {clusterId}
            </code>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/clusters')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Instructions */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Manual Control:</strong> Click "Fix Next Article" to process one article at a time. 
            Review results after each article before continuing.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleAudit} disabled={isAuditing || isFixing}>
            {isAuditing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Auditing...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />Re-Run Audit</>
            )}
          </Button>

          {currentArticle && (currentArticle.status === 'pending' || currentArticle.status === 'failed') && (
            <Button onClick={handleFixNextArticle} disabled={isFixing}>
              {isFixing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Fix Next Article</>
              )}
            </Button>
          )}

          {currentArticle && currentArticle.status === 'success' && (
            <Button onClick={handleFixNextArticle} disabled={isFixing}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Find Next Pending
            </Button>
          )}

          <Button variant="ghost" onClick={handleSkipArticle} disabled={isFixing}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip
          </Button>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Completion</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              <div className="grid grid-cols-4 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold">{articles.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalSuccess}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Article */}
        {currentArticle && (
          <Card className="border-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">Current</Badge>
                  <span className="text-sm text-muted-foreground">{currentIndex + 1} / {articles.length}</span>
                </div>
                <Badge>
                  {getLanguageFlag(currentArticle.language)} {currentArticle.language.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold">{currentArticle.headline}</h3>
                <p className="text-sm text-muted-foreground font-mono">{currentArticle.slug}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant={currentArticle.status === 'success' ? 'default' : currentArticle.status === 'failed' ? 'destructive' : 'secondary'}>
                  {currentArticle.status === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {currentArticle.status === 'success' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {currentArticle.status === 'failed' && <XCircle className="mr-1 h-3 w-3" />}
                  {currentArticle.status === 'pending' && <Circle className="mr-1 h-3 w-3" />}
                  {currentArticle.status}
                </Badge>
                <Badge variant="outline">{currentArticle.citationCount} citations</Badge>
                <Badge variant="outline">{currentArticle.internalLinkCount} internal links</Badge>
                <Badge variant={currentArticle.hasAuthor ? 'outline' : 'destructive'}>
                  {currentArticle.hasAuthor ? '✓ Author' : '✗ No Author'}
                </Badge>
              </div>

              {currentArticle.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{currentArticle.error}</AlertDescription>
                </Alert>
              )}

              {currentArticle.debug && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-xs font-medium mb-1">Debug Info</div>
                  <pre className="text-xs overflow-auto max-h-32">
                    {JSON.stringify(currentArticle.debug, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing Log */}
        {processingLog.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Processing Log</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {processingLog.join('\n')}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Articles by Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">All Articles by Language</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {languageOrder.map(language => {
                const langArticles = articlesByLanguage[language];
                const langSuccess = langArticles.filter(a => a.status === 'success').length;
                const langTotal = langArticles.length;
                const langComplete = langSuccess === langTotal;

                return (
                  <div key={language} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getLanguageFlag(language)}</span>
                      <span className="font-semibold">{language.toUpperCase()}</span>
                      <Badge variant={langComplete ? 'default' : 'secondary'}>
                        {langSuccess}/{langTotal}
                      </Badge>
                      {langComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </div>
                    
                    <div className="grid gap-2 pl-7">
                      {langArticles.map((article) => {
                        const globalIdx = articles.findIndex(a => a.id === article.id);
                        const isCurrent = globalIdx === currentIndex;

                        return (
                          <div
                            key={article.id}
                            className={`flex items-center justify-between p-2 rounded-md border ${
                              isCurrent ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {article.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                              {article.status === 'failed' && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                              {article.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                              {article.status === 'pending' && <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                              
                              <span className="text-sm truncate">{article.headline}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {article.citationCount} cit
                              </span>
                              
                              {article.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2"
                                  onClick={() => handleResetArticle(globalIdx)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                              
                              {!isCurrent && article.status !== 'success' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2"
                                  onClick={() => setCurrentIndex(globalIdx)}
                                >
                                  Select
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
