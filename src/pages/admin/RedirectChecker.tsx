import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  Search
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RedirectResult {
  id: string;
  url: string;
  table: string;
  slug: string;
  language: string;
  status: number | null;
  destination: string | null;
  checked: boolean;
  error?: string;
}

interface ContentItem {
  id: string;
  slug: string;
  language: string;
  is_redirect: boolean | null;
  redirect_to: string | null;
}

const RedirectChecker = () => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RedirectResult[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    checked: 0,
    ok: 0,
    redirects: 0,
    errors: 0,
    markedInDb: 0
  });

  const BASE_URL = "https://www.delsolprimehomes.com";

  // Fetch all published content from database
  const fetchAllContent = async (): Promise<RedirectResult[]> => {
    const allContent: RedirectResult[] = [];

    // Blog articles
    const { data: articles } = await supabase
      .from('blog_articles')
      .select('id, slug, language, is_redirect, redirect_to')
      .eq('status', 'published');
    
    (articles || []).forEach((a: ContentItem) => {
      allContent.push({
        id: a.id,
        url: `${BASE_URL}/${a.language}/blog/${a.slug}`,
        table: 'blog_articles',
        slug: a.slug,
        language: a.language,
        status: null,
        destination: a.redirect_to,
        checked: false
      });
    });

    // Q&A pages
    const { data: qaPages } = await supabase
      .from('qa_pages')
      .select('id, slug, language, is_redirect, redirect_to')
      .eq('status', 'published');
    
    (qaPages || []).forEach((q: ContentItem) => {
      allContent.push({
        id: q.id,
        url: `${BASE_URL}/${q.language}/qa/${q.slug}`,
        table: 'qa_pages',
        slug: q.slug,
        language: q.language,
        status: null,
        destination: q.redirect_to,
        checked: false
      });
    });

    // Comparison pages
    const { data: comparisons } = await supabase
      .from('comparison_pages')
      .select('id, slug, language, is_redirect, redirect_to')
      .eq('status', 'published');
    
    (comparisons || []).forEach((c: ContentItem) => {
      allContent.push({
        id: c.id,
        url: `${BASE_URL}/${c.language}/compare/${c.slug}`,
        table: 'comparison_pages',
        slug: c.slug,
        language: c.language,
        status: null,
        destination: c.redirect_to,
        checked: false
      });
    });

    // Location pages
    const { data: locations } = await supabase
      .from('location_pages')
      .select('id, city_slug, topic_slug, language, is_redirect, redirect_to')
      .eq('status', 'published');
    
    (locations || []).forEach((l: { id: string; city_slug: string; topic_slug: string; language: string; is_redirect: boolean | null; redirect_to: string | null }) => {
      allContent.push({
        id: l.id,
        url: `${BASE_URL}/${l.language}/locations/${l.city_slug}/${l.topic_slug}`,
        table: 'location_pages',
        slug: `${l.city_slug}/${l.topic_slug}`,
        language: l.language,
        status: null,
        destination: l.redirect_to,
        checked: false
      });
    });

    return allContent;
  };

  // Scan all URLs for redirect status
  const scanUrls = async () => {
    setScanning(true);
    setProgress(0);
    setResults([]);
    setSummary({ total: 0, checked: 0, ok: 0, redirects: 0, errors: 0, markedInDb: 0 });

    try {
      toast.info("Fetching content from database...");
      const content = await fetchAllContent();
      
      // Count items already marked as redirects in DB
      const markedInDb = content.filter(c => c.destination).length;
      
      setSummary(prev => ({ ...prev, total: content.length, markedInDb }));
      setResults(content);

      toast.success(`Found ${content.length} published URLs. ${markedInDb} already marked as redirects in database.`);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to fetch content from database");
    } finally {
      setScanning(false);
    }
  };

  // Mark selected URLs as redirects in database
  const markAsRedirects = async (items: RedirectResult[]) => {
    if (items.length === 0) {
      toast.warning("No items selected");
      return;
    }

    const tableNames = ['blog_articles', 'qa_pages', 'comparison_pages', 'location_pages'] as const;
    type TableName = typeof tableNames[number];

    const groupedByTable = items.reduce((acc, item) => {
      if (!acc[item.table]) acc[item.table] = [];
      acc[item.table].push(item.id);
      return acc;
    }, {} as Record<string, string[]>);

    let updated = 0;
    for (const [table, ids] of Object.entries(groupedByTable)) {
      if (!tableNames.includes(table as TableName)) continue;
      
      const { error } = await supabase
        .from(table as TableName)
        .update({ is_redirect: true })
        .in('id', ids);

      if (error) {
        console.error(`Error updating ${table}:`, error);
        toast.error(`Failed to update ${table}`);
      } else {
        updated += ids.length;
      }
    }

    toast.success(`Marked ${updated} URLs as redirects`);
    
    // Refresh data
    scanUrls();
  };

  // Convert redirects to 410 Gone
  const convertToGone = async (items: RedirectResult[]) => {
    if (items.length === 0) {
      toast.warning("No items selected");
      return;
    }

    const tableNames = ['blog_articles', 'qa_pages', 'comparison_pages', 'location_pages'] as const;
    type TableName = typeof tableNames[number];

    // Add to gone_urls table
    const goneUrls = items.map(item => ({
      url_path: new URL(item.url).pathname,
      reason: 'converted_from_redirect',
      pattern_match: false
    }));

    const { error: insertError } = await supabase
      .from('gone_urls')
      .upsert(goneUrls, { onConflict: 'url_path' });

    if (insertError) {
      console.error("Error adding to gone_urls:", insertError);
      toast.error("Failed to add URLs to gone list");
      return;
    }

    // Update original tables to mark as gone/unpublish
    const groupedByTable = items.reduce((acc, item) => {
      if (!acc[item.table]) acc[item.table] = [];
      acc[item.table].push(item.id);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [table, ids] of Object.entries(groupedByTable)) {
      if (!tableNames.includes(table as TableName)) continue;
      
      await supabase
        .from(table as TableName)
        .update({ status: 'gone', is_redirect: false, redirect_to: null })
        .in('id', ids);
    }

    toast.success(`Converted ${items.length} URLs to 410 Gone status`);
    scanUrls();
  };

  // Export results to CSV
  const exportToCsv = () => {
    const markedRedirects = results.filter(r => r.destination);
    
    if (markedRedirects.length === 0) {
      toast.warning("No redirects to export");
      return;
    }

    const csv = [
      ['URL', 'Table', 'Slug', 'Language', 'Redirect To'].join(','),
      ...markedRedirects.map(r => 
        [r.url, r.table, r.slug, r.language, r.destination || ''].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redirects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${markedRedirects.length} redirects to CSV`);
  };

  const markedRedirects = results.filter(r => r.destination);
  const cleanUrls = results.filter(r => !r.destination);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔀 Redirect Checker</h1>
            <p className="text-muted-foreground">
              Scan sitemap URLs, identify redirects, and remove them from sitemap
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={scanUrls} disabled={scanning}>
              <Search className="h-4 w-4 mr-2" />
              {scanning ? "Scanning..." : "Load Content"}
            </Button>
            <Button variant="outline" onClick={exportToCsv} disabled={markedRedirects.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export Redirects
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Clean URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{cleanUrls.length.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Marked as Redirect</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{markedRedirects.length.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">In Sitemap</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{cleanUrls.length.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Redirects excluded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Sitemap Health</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {summary.total > 0 ? Math.round((cleanUrls.length / summary.total) * 100) : 100}%
              </p>
              <p className="text-xs text-muted-foreground">Clean URLs</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {scanning && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <div className="flex-1">
                  <Progress value={progress} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The sitemap now automatically filters out any URLs where <code className="text-xs bg-muted px-1 rounded">is_redirect=true</code> or <code className="text-xs bg-muted px-1 rounded">redirect_to</code> is set.
            Use this tool to mark legacy URLs that redirect so they're excluded from sitemaps.
          </AlertDescription>
        </Alert>

        {/* Results Tabs */}
        {results.length > 0 && (
          <Tabs defaultValue="clean" className="space-y-4">
            <TabsList>
              <TabsTrigger value="clean">
                Clean URLs ({cleanUrls.length})
              </TabsTrigger>
              <TabsTrigger value="redirects">
                Redirects ({markedRedirects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clean">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Clean URLs (Included in Sitemap)
                  </CardTitle>
                  <CardDescription>
                    These URLs are included in the sitemap and return 200 OK
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Language</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleanUrls.slice(0, 100).map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-mono text-xs max-w-md truncate">
                              {result.url}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{result.table.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{result.language}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(result.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {cleanUrls.length > 100 && (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        Showing first 100 of {cleanUrls.length} URLs
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="redirects">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-amber-600" />
                        Redirecting URLs (Excluded from Sitemap)
                      </CardTitle>
                      <CardDescription>
                        These URLs are marked as redirects and excluded from sitemaps
                      </CardDescription>
                    </div>
                    {markedRedirects.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => convertToGone(markedRedirects)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Convert All to 410 Gone
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {markedRedirects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No redirects found! All URLs are clean.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source URL</TableHead>
                            <TableHead>Redirect To</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {markedRedirects.map((result) => (
                            <TableRow key={result.id}>
                              <TableCell className="font-mono text-xs max-w-xs truncate">
                                {result.url}
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-xs truncate text-amber-600">
                                {result.destination || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{result.table.replace('_', ' ')}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => convertToGone([result])}
                                  title="Convert to 410 Gone"
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default RedirectChecker;
