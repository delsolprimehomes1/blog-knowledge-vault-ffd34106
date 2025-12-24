import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, Languages, FileText, CheckCircle, XCircle, RefreshCw, Plus, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da'];

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', nl: '🇳🇱', hu: '🇭🇺', de: '🇩🇪', fr: '🇫🇷',
  sv: '🇸🇪', pl: '🇵🇱', no: '🇳🇴', fi: '🇫🇮', da: '🇩🇰',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', nl: 'Dutch', hu: 'Hungarian', de: 'German',
  fr: 'French', sv: 'Swedish', pl: 'Polish', no: 'Norwegian',
  fi: 'Finnish', da: 'Danish',
};

interface TrackingRecord {
  id: string;
  source_article_id: string;
  source_article_headline: string;
  source_article_slug: string;
  hreflang_group_core: string;
  hreflang_group_decision: string;
  languages_generated: string[];
  total_qa_pages: number;
  status: string;
  created_at: string;
}

interface QAPage {
  id: string;
  question_main: string;
  slug: string;
  language: string;
  qa_type: string;
  hreflang_group_id: string;
  status: string;
}

export default function QADashboard() {
  const [selectedGroup, setSelectedGroup] = useState<TrackingRecord & { coreQAs: QAPage[]; decisionQAs: QAPage[] } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch tracking data
  const { data: trackingData = [], refetch: refetchTracking } = useQuery({
    queryKey: ['qa-article-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_article_tracking')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TrackingRecord[];
    },
  });

  // Fetch all Q&A pages for stats
  const { data: qaPages = [], refetch: refetchQaPages } = useQuery({
    queryKey: ['qa-pages-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_pages')
        .select('id, question_main, slug, language, qa_type, hreflang_group_id, status, created_at');
      if (error) throw error;
      return (data || []) as QAPage[];
    },
  });

  // Fetch total English articles
  const { data: totalArticles = 0 } = useQuery({
    queryKey: ['total-english-articles'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('blog_articles')
        .select('id', { count: 'exact', head: true })
        .eq('language', 'en')
        .eq('status', 'published');
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate stats
  const articlesWithQA = trackingData.length;
  const articlesWithoutQA = totalArticles - articlesWithQA;
  const totalQAPages = qaPages.length;
  
  const languageCoverage: Record<string, number> = {};
  qaPages.forEach(page => {
    languageCoverage[page.language] = (languageCoverage[page.language] || 0) + 1;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchTracking(), refetchQaPages()]);
    setIsRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const viewLinkedQAs = async (tracking: TrackingRecord) => {
    const { data: coreQAs } = await supabase
      .from('qa_pages')
      .select('id, question_main, slug, language, qa_type, hreflang_group_id, status')
      .eq('hreflang_group_id', tracking.hreflang_group_core)
      .order('language');
    
    const { data: decisionQAs } = await supabase
      .from('qa_pages')
      .select('id, question_main, slug, language, qa_type, hreflang_group_id, status')
      .eq('hreflang_group_id', tracking.hreflang_group_decision)
      .order('language');
    
    setSelectedGroup({
      ...tracking,
      coreQAs: (coreQAs || []) as QAPage[],
      decisionQAs: (decisionQAs || []) as QAPage[],
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Q&A Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track and manage all Q&A pages and their language links
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link to="/admin/qa-generator">
                <Plus className="mr-2 h-4 w-4" />
                Generate New Q&As
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total English Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalArticles}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Articles with Q&As
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{articlesWithQA}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <XCircle className="h-4 w-4 text-amber-500" />
                Articles without Q&As
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{articlesWithoutQA}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Q&A Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalQAPages}</p>
            </CardContent>
          </Card>
        </div>

        {/* Language Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Language Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <div key={lang} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg min-w-[120px]">
                  <span className="text-2xl">{LANGUAGE_FLAGS[lang]}</span>
                  <div>
                    <p className="font-medium">{lang.toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {languageCoverage[lang] || 0} pages
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Article Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Q&A Generation Tracking
            </CardTitle>
            <CardDescription>
              Articles with generated Q&A pages and their language coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Article</TableHead>
                    <TableHead>Languages Generated</TableHead>
                    <TableHead>Missing Languages</TableHead>
                    <TableHead>Total Q&As</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackingData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No Q&A tracking records yet. Generate Q&As from the Q&A Generator.
                      </TableCell>
                    </TableRow>
                  ) : (
                    trackingData.map((item) => {
                      const missingLangs = SUPPORTED_LANGUAGES.filter(
                        l => !item.languages_generated.includes(l)
                      );
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium line-clamp-1">{item.source_article_headline}</p>
                              <a 
                                href={`/blog/${item.source_article_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                View article <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.languages_generated.map((lang: string) => (
                                <Badge key={lang} variant="secondary" className="text-xs">
                                  {LANGUAGE_FLAGS[lang]} {lang}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {missingLangs.length === 0 ? (
                                <span className="text-green-600 text-sm flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  All complete
                                </span>
                              ) : (
                                missingLangs.map((lang) => (
                                  <Badge key={lang} variant="outline" className="text-xs text-amber-600">
                                    {LANGUAGE_FLAGS[lang]} {lang}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.total_qa_pages} pages
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.languages_generated.length === 10 ? (
                              <span className="text-green-600 text-sm flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Complete
                              </span>
                            ) : (
                              <Badge variant="secondary">
                                {item.languages_generated.length}/10 languages
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewLinkedQAs(item)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View Links
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Q&A Links Dialog */}
        <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Q&A Pages for: {selectedGroup?.source_article_headline}
              </DialogTitle>
            </DialogHeader>
            
            {selectedGroup && (
              <Tabs defaultValue="core" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="core">
                    Core Q&As ({selectedGroup.coreQAs.length})
                  </TabsTrigger>
                  <TabsTrigger value="decision">
                    Decision Q&As ({selectedGroup.decisionQAs.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="core" className="mt-4">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      hreflang_group_id: <code className="bg-muted px-1 rounded">{selectedGroup.hreflang_group_core}</code>
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Language</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-40">URL</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {SUPPORTED_LANGUAGES.map((lang) => {
                          const qa = selectedGroup.coreQAs.find(q => q.language === lang);
                          return (
                            <TableRow key={lang}>
                              <TableCell>
                                <span className="text-lg mr-1">{LANGUAGE_FLAGS[lang]}</span>
                                {lang.toUpperCase()}
                              </TableCell>
                              <TableCell>
                                {qa ? (
                                  <span className="text-sm line-clamp-1">{qa.question_main}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm italic">Not generated</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {qa ? (
                                  <a
                                    href={`/${lang}/qa/${qa.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    /{lang}/qa/... <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {qa ? (
                                  <span className="text-green-600 text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Exists
                                  </span>
                                ) : (
                                  <span className="text-amber-600 text-xs flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Missing
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="decision" className="mt-4">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      hreflang_group_id: <code className="bg-muted px-1 rounded">{selectedGroup.hreflang_group_decision}</code>
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Language</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-40">URL</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {SUPPORTED_LANGUAGES.map((lang) => {
                          const qa = selectedGroup.decisionQAs.find(q => q.language === lang);
                          return (
                            <TableRow key={lang}>
                              <TableCell>
                                <span className="text-lg mr-1">{LANGUAGE_FLAGS[lang]}</span>
                                {lang.toUpperCase()}
                              </TableCell>
                              <TableCell>
                                {qa ? (
                                  <span className="text-sm line-clamp-1">{qa.question_main}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm italic">Not generated</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {qa ? (
                                  <a
                                    href={`/${lang}/qa/${qa.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    /{lang}/qa/... <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {qa ? (
                                  <span className="text-green-600 text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Exists
                                  </span>
                                ) : (
                                  <span className="text-amber-600 text-xs flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Missing
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
