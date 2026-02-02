import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  FileText,
  Languages,
  Loader2,
  AlertTriangle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ArticleWithMarkers {
  id: string;
  headline: string;
  language: string;
  slug: string;
  markerCount: number;
}

interface BackfillResult {
  articleId: string;
  headline: string;
  language: string;
  markerCount: number;
  replacedCount: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

interface LanguageStats {
  language: string;
  count: number;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'German', nl: 'Dutch', fr: 'French',
  pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian',
  fi: 'Finnish', no: 'Norwegian',
};

export default function CitationBackfill() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [articles, setArticles] = useState<ArticleWithMarkers[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [results, setResults] = useState<BackfillResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchArticlesWithMarkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, language, slug, detailed_content')
        .ilike('detailed_content', '%[CITATION_NEEDED]%')
        .eq('status', 'published')
        .order('language');

      if (error) throw error;

      const articlesWithCounts = (data || []).map(article => ({
        id: article.id,
        headline: article.headline,
        language: article.language,
        slug: article.slug,
        markerCount: (article.detailed_content.match(/\[CITATION_NEEDED\]/g) || []).length
      }));

      setArticles(articlesWithCounts);

      // Calculate language stats
      const stats: Record<string, number> = {};
      articlesWithCounts.forEach(a => {
        stats[a.language] = (stats[a.language] || 0) + 1;
      });
      setLanguageStats(
        Object.entries(stats)
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count)
      );

    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch articles with citation markers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticlesWithMarkers();
  }, []);

  const runBackfill = async (articleIds?: string[]) => {
    setProcessing(true);
    setResults([]);
    
    const targetArticles = articleIds 
      ? articles.filter(a => articleIds.includes(a.id))
      : articles;
    
    setProgress({ current: 0, total: targetArticles.length });

    try {
      const response = await supabase.functions.invoke('backfill-citations-bulk', {
        body: {
          dryRun: false,
          batchSize: targetArticles.length,
          articleIds: targetArticles.map(a => a.id)
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      setResults(data.results || []);
      setProgress({ current: data.summary.total, total: data.summary.total });

      toast({
        title: "Backfill Complete",
        description: `${data.summary.success} success, ${data.summary.partial} partial, ${data.summary.failed} failed`,
      });

      // Refresh the list
      await fetchArticlesWithMarkers();

    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const totalMarkers = articles.reduce((sum, a) => sum + a.markerCount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citation Backfill</h1>
            <p className="text-muted-foreground mt-1">
              Fix [CITATION_NEEDED] markers with authoritative external sources
            </p>
          </div>
          <Button onClick={fetchArticlesWithMarkers} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Articles with Markers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {languageStats.length} languages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Markers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{totalMarkers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                [CITATION_NEEDED] placeholders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Backfill Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processing ? (
                <div className="space-y-2">
                  <Progress value={(progress.current / progress.total) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {progress.current} / {progress.total} articles
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {articles.length === 0 ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <span className="text-green-600 font-medium">All Clear</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                      <span className="text-orange-600 font-medium">Needs Fix</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Language Breakdown */}
        {languageStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Distribution by Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {languageStats.map(stat => (
                  <Badge key={stat.language} variant="secondary" className="text-sm">
                    {LANGUAGE_NAMES[stat.language] || stat.language}: {stat.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        {articles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Run Backfill</CardTitle>
              <CardDescription>
                Process all {articles.length} articles and replace [CITATION_NEEDED] markers with real citations from authoritative sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runBackfill()} 
                disabled={processing || articles.length === 0}
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Backfill All {articles.length} Articles
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Backfill Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Markers</TableHead>
                      <TableHead>Replaced</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(result => (
                      <TableRow key={result.articleId}>
                        <TableCell className="max-w-[300px] truncate">
                          {result.headline}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.language.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{result.markerCount}</TableCell>
                        <TableCell>{result.replacedCount}</TableCell>
                        <TableCell>
                          {result.status === 'success' && (
                            <Badge className="bg-green-100 text-green-800">Success</Badge>
                          )}
                          {result.status === 'partial' && (
                            <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                          )}
                          {result.status === 'failed' && (
                            <Badge className="bg-red-100 text-red-800">Failed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Article List */}
        {articles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Articles with Markers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Headline</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Markers</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map(article => (
                      <TableRow key={article.id}>
                        <TableCell className="max-w-[400px]">
                          <a 
                            href={`/${article.language}/blog/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-primary"
                          >
                            {article.headline}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{article.language.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            {article.markerCount} marker{article.markerCount > 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runBackfill([article.id])}
                            disabled={processing}
                          >
                            Fix
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-green-800">All Citations Complete!</h3>
              <p className="text-green-600 mt-2">
                No articles have [CITATION_NEEDED] markers. All content is properly cited.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
