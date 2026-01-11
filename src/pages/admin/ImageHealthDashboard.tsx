import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Copy, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  ImageIcon,
  Loader2,
  CheckCircle2,
  Wand2,
  ChevronDown,
  ExternalLink,
  ClipboardCheck,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageIssue {
  id: string;
  article_id: string;
  issue_type: 'duplicate' | 'text_detected' | 'expired_url';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
  analyzed_at: string;
  resolved_at: string | null;
  article?: {
    id: string;
    headline: string;
    language: string;
    slug: string;
    featured_image_url: string;
    featured_image_alt: string | null;
    featured_image_caption: string | null;
    cluster_id: string;
  };
}

interface IssueCounts {
  duplicates: number;
  textIssues: number;
  expiredUrls: number;
  total: number;
}

interface AuditItem {
  label: string;
  passed: boolean;
  value?: string;
  detail?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  fr: 'French',
  fi: 'Finnish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  pl: 'Polish',
  hu: 'Hungarian',
  unknown: 'Unknown'
};

// Simple language detection based on common words/patterns
const detectLanguage = (text: string): string => {
  if (!text || text.length < 10) return 'unknown';
  
  const patterns: Record<string, RegExp[]> = {
    de: [/\b(der|die|das|und|von|mit|für|auf|ist|sind|werden|haben|einer|eines)\b/gi],
    nl: [/\b(de|het|van|een|en|met|voor|op|zijn|worden|heeft|naar)\b/gi],
    fr: [/\b(le|la|les|de|du|des|et|pour|avec|dans|est|sont|une)\b/gi],
    fi: [/\b(ja|on|ei|se|että|tämä|ovat|kun|voi|olla|kanssa)\b/gi],
    sv: [/\b(och|det|att|en|av|för|med|som|är|har|till|på)\b/gi],
    da: [/\b(og|det|at|en|af|for|med|som|er|har|til|på)\b/gi],
    no: [/\b(og|det|at|en|av|for|med|som|er|har|til|på)\b/gi],
    pl: [/\b(i|w|na|do|z|nie|to|się|jest|są|oraz|przez)\b/gi],
    hu: [/\b(és|a|az|nem|van|egy|hogy|már|csak|még|lehet)\b/gi],
    en: [/\b(the|and|of|to|in|for|with|that|this|is|are|was|have)\b/gi],
  };
  
  const scores: Record<string, number> = {};
  
  for (const [lang, regexes] of Object.entries(patterns)) {
    const matches = regexes.reduce((count, regex) => {
      const found = text.match(regex);
      return count + (found ? found.length : 0);
    }, 0);
    scores[lang] = matches;
  }
  
  const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return bestMatch && bestMatch[1] > 2 ? bestMatch[0] : 'unknown';
};

const buildAuditItems = (article: ImageIssue['article']): AuditItem[] => {
  if (!article) return [];
  
  const altPresent = !!article.featured_image_alt && 
                     article.featured_image_alt.length > 10;
  const captionPresent = !!article.featured_image_caption && 
                         article.featured_image_caption !== 'N/A' &&
                         article.featured_image_caption.length > 10;
  
  const detectedAltLang = detectLanguage(article.featured_image_alt || '');
  const detectedCaptionLang = detectLanguage(article.featured_image_caption || '');
  
  const altLangMatch = detectedAltLang === article.language || 
                       detectedAltLang === 'unknown';
  const captionLangMatch = detectedCaptionLang === article.language || 
                           detectedCaptionLang === 'unknown';
  
  const jsonLdReady = altPresent && captionPresent;
  
  return [
    {
      label: 'Alt Text Present',
      passed: altPresent,
      value: article.featured_image_alt?.substring(0, 80),
      detail: altPresent ? `${article.featured_image_alt?.length} characters` : 'Missing or too short'
    },
    {
      label: `Alt Text Language (${article.language.toUpperCase()})`,
      passed: altLangMatch && altPresent,
      detail: !altPresent ? 'No alt text to analyze' :
              altLangMatch ? `Detected: ${LANGUAGE_NAMES[detectedAltLang] || 'Unknown'}` : 
              `Expected ${LANGUAGE_NAMES[article.language]}, got ${LANGUAGE_NAMES[detectedAltLang]}`
    },
    {
      label: 'Caption Present',
      passed: captionPresent,
      value: article.featured_image_caption?.substring(0, 80),
      detail: captionPresent ? `${article.featured_image_caption?.length} characters` : 'Missing or too short'
    },
    {
      label: `Caption Language (${article.language.toUpperCase()})`,
      passed: captionLangMatch && captionPresent,
      detail: !captionPresent ? 'No caption to analyze' :
              captionLangMatch ? `Detected: ${LANGUAGE_NAMES[detectedCaptionLang] || 'Unknown'}` : 
              `Expected ${LANGUAGE_NAMES[article.language]}, got ${LANGUAGE_NAMES[detectedCaptionLang]}`
    },
    {
      label: 'JSON-LD Ready (ImageObject)',
      passed: jsonLdReady,
      detail: jsonLdReady ? 'ImageObject with caption & description ready' : 'Missing required metadata for schema'
    }
  ];
};

const AuditChecklist = ({ items }: { items: AuditItem[] }) => (
  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
    {items.map((item, i) => (
      <div key={i} className="flex items-start gap-3">
        {item.passed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <span className="font-medium">{item.label}</span>
          {item.value && (
            <p className="text-sm text-muted-foreground truncate">
              "{item.value}{item.value.length >= 80 ? '...' : ''}"
            </p>
          )}
          {item.detail && (
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default function ImageHealthDashboard() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<ImageIssue[]>([]);
  const [counts, setCounts] = useState<IssueCounts>({ duplicates: 0, textIssues: 0, expiredUrls: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('duplicates');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('article_image_issues')
        .select(`
          *,
          article:blog_articles(
            id, 
            headline, 
            language, 
            slug,
            featured_image_url, 
            featured_image_alt,
            featured_image_caption,
            cluster_id
          )
        `)
        .is('resolved_at', null)
        .order('severity', { ascending: false })
        .order('analyzed_at', { ascending: false });

      if (error) throw error;

      const issuesData = (data || []) as unknown as ImageIssue[];
      setIssues(issuesData);

      // Calculate counts
      const newCounts = {
        duplicates: issuesData.filter(i => i.issue_type === 'duplicate').length,
        textIssues: issuesData.filter(i => i.issue_type === 'text_detected').length,
        expiredUrls: issuesData.filter(i => i.issue_type === 'expired_url').length,
        total: issuesData.length
      };
      setCounts(newCounts);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      toast.error('Failed to load image issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-article-images', {
        body: { scanType: 'all' }
      });

      if (error) throw error;

      toast.success(`Scan complete: ${data.result.duplicates} duplicates, ${data.result.expiredUrls} expired URLs found`);
      await fetchIssues();
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error('Failed to scan images');
    } finally {
      setScanning(false);
    }
  };

  const handleRegenerate = async (issue: ImageIssue) => {
    if (!issue.article) return;
    
    setRegeneratingId(issue.article_id);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-article-image', {
        body: { articleId: issue.article_id }
      });

      if (error) throw error;

      // Mark issue as resolved
      await supabase
        .from('article_image_issues')
        .update({ 
          resolved_at: new Date().toISOString(),
          resolved_by: 'regeneration'
        })
        .eq('id', issue.id);

      // Fetch updated article data for audit preview
      const { data: updatedArticle } = await supabase
        .from('blog_articles')
        .select('featured_image_url, featured_image_alt, featured_image_caption')
        .eq('id', issue.article_id)
        .single();

      if (updatedArticle) {
        toast.success(
          <div className="space-y-1">
            <p className="font-medium">Image regenerated successfully!</p>
            {updatedArticle.featured_image_alt && (
              <p className="text-xs opacity-80">
                ✅ Alt: {updatedArticle.featured_image_alt.substring(0, 50)}...
              </p>
            )}
            {updatedArticle.featured_image_caption && (
              <p className="text-xs opacity-80">
                ✅ Caption: {updatedArticle.featured_image_caption.substring(0, 50)}...
              </p>
            )}
          </div>
        );
      } else {
        toast.success(`Image regenerated for "${issue.article.headline.substring(0, 50)}..."`);
      }

      await fetchIssues();
    } catch (error) {
      console.error('Regeneration failed:', error);
      toast.error('Failed to regenerate image');
    } finally {
      setRegeneratingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline'> = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    };
    return <Badge variant={variants[severity] || 'outline'}>{severity.toUpperCase()}</Badge>;
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      en: '🇬🇧', nl: '🇳🇱', de: '🇩🇪', fr: '🇫🇷', fi: '🇫🇮',
      sv: '🇸🇪', da: '🇩🇰', no: '🇳🇴', pl: '🇵🇱', hu: '🇭🇺'
    };
    return flags[lang] || '🌐';
  };

  const filteredIssues = issues.filter(issue => {
    if (activeTab === 'duplicates') return issue.issue_type === 'duplicate';
    if (activeTab === 'text') return issue.issue_type === 'text_detected';
    if (activeTab === 'expired') return issue.issue_type === 'expired_url';
    return true;
  });

  const getAuditScore = (article: ImageIssue['article']): { passed: number; total: number } => {
    if (!article) return { passed: 0, total: 5 };
    const items = buildAuditItems(article);
    return {
      passed: items.filter(i => i.passed).length,
      total: items.length
    };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clusters')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Image Health Dashboard</h1>
            <p className="text-muted-foreground">
              Identify and fix problematic article images
            </p>
          </div>
        </div>
        <Button onClick={handleScanAll} disabled={scanning}>
          {scanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan All Images
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Duplicates</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.duplicates}</div>
            <p className="text-xs text-muted-foreground">Articles sharing images</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Text Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.textIssues}</div>
            <p className="text-xs text-muted-foreground">Gibberish/watermarks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired URLs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.expiredUrls}</div>
            <p className="text-xs text-muted-foreground">Broken DALL-E links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="duplicates" className="gap-2">
            <Copy className="h-4 w-4" />
            Duplicates ({counts.duplicates})
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Text Issues ({counts.textIssues})
          </TabsTrigger>
          <TabsTrigger value="expired" className="gap-2">
            <Clock className="h-4 w-4" />
            Expired URLs ({counts.expiredUrls})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All Clear!</h3>
                <p className="text-muted-foreground">
                  No {activeTab === 'duplicates' ? 'duplicate' : activeTab === 'text' ? 'text' : 'expired URL'} issues found.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => {
                const auditScore = getAuditScore(issue.article);
                const isExpanded = expandedId === issue.id;
                
                return (
                  <Collapsible 
                    key={issue.id}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedId(open ? issue.id : null)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          {/* Thumbnail */}
                          <div className="w-20 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                            {issue.article?.featured_image_url ? (
                              <img 
                                src={issue.article.featured_image_url} 
                                alt="" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Article Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getLanguageFlag(issue.article?.language || 'en')}</span>
                              <h4 className="font-medium truncate">
                                {issue.article?.headline || 'Unknown Article'}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {getSeverityBadge(issue.severity)}
                              <span>
                                {issue.issue_type === 'duplicate' && (
                                  <>Shared with {(issue.details as { shared_with_count?: number }).shared_with_count || 0} articles</>
                                )}
                                {issue.issue_type === 'text_detected' && (
                                  <>{(issue.details as { description?: string }).description || 'Text detected in image'}</>
                                )}
                                {issue.issue_type === 'expired_url' && (
                                  <>DALL-E temporary URL (expired)</>
                                )}
                              </span>
                              <span className="text-xs">
                                • SEO Audit: {auditScore.passed}/{auditScore.total}
                              </span>
                            </div>
                          </div>

                          {/* Expand indicator */}
                          <ChevronDown className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )} />

                          {/* Actions */}
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(issue);
                            }}
                            disabled={regeneratingId === issue.article_id}
                          >
                            {regeneratingId === issue.article_id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="mr-2 h-4 w-4" />
                                Regenerate
                              </>
                            )}
                          </Button>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-6 space-y-6 bg-muted/20">
                          {/* Large image preview */}
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden max-w-2xl mx-auto">
                            <img 
                              src={issue.article?.featured_image_url || '/placeholder.svg'} 
                              alt={issue.article?.featured_image_alt || ''}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>

                          {/* Audit checklist */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <ClipboardCheck className="h-5 w-5" />
                              SEO / AEO / GEO Image Metadata Audit
                            </h4>
                            <AuditChecklist items={buildAuditItems(issue.article)} />
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-3">
                            {issue.article?.slug && issue.article?.language && (
                              <Button variant="outline" size="sm" asChild>
                                <a 
                                  href={`/${issue.article.language}/blog/${issue.article.slug}`} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Live Article
                                </a>
                              </Button>
                            )}
                            <Button 
                              size="sm"
                              onClick={() => handleRegenerate(issue)}
                              disabled={regeneratingId === issue.article_id}
                            >
                              {regeneratingId === issue.article_id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Regenerating...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Regenerate Image
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
