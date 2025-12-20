import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, Loader2, CheckCircle, AlertTriangle, FileText, Scale, Sparkles, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Result {
  id: string;
  slug: string;
  headline?: string;
  success: boolean;
  linkCount?: number;
  error?: string;
  cleanedContent?: boolean;
  cleanedSpeakable?: boolean;
}

export default function Phase1LinkingTool() {
  const [processing, setProcessing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result[]>>({});

  // Fetch stats
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["phase1-stats"],
    queryFn: async () => {
      // QA pages without links
      const { count: qaNoLinks } = await supabase
        .from("qa_pages")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .or("internal_links.is.null,internal_links.eq.[]");

      const { count: qaTotal } = await supabase
        .from("qa_pages")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

      // Comparison pages without links
      const { count: compNoLinks } = await supabase
        .from("comparison_pages")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .or("internal_links.is.null,internal_links.eq.[]");

      const { count: compTotal } = await supabase
        .from("comparison_pages")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

      // Articles with citation markers
      const { data: articlesWithMarkers } = await supabase
        .from("blog_articles")
        .select("id, slug, headline")
        .or("detailed_content.ilike.%[CITATION_NEEDED]%,speakable_answer.ilike.%[CITATION_NEEDED]%");

      return {
        qaNoLinks: qaNoLinks || 0,
        qaTotal: qaTotal || 0,
        compNoLinks: compNoLinks || 0,
        compTotal: compTotal || 0,
        citationMarkerCount: articlesWithMarkers?.length || 0,
        citationMarkerArticles: articlesWithMarkers || []
      };
    }
  });

  // Mutation for QA pages
  const linkQAMutation = useMutation({
    mutationFn: async () => {
      setProcessing("qa");
      const { data, error } = await supabase.functions.invoke("bulk-link-qa-pages", {
        body: { mode: "qa" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResults(prev => ({ ...prev, qa: data.results }));
      toast.success(`Added links to ${data.successCount} Q&A pages`);
      refetchStats();
      setProcessing(null);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
      setProcessing(null);
    }
  });

  // Mutation for comparison pages
  const linkComparisonMutation = useMutation({
    mutationFn: async () => {
      setProcessing("comparison");
      const { data, error } = await supabase.functions.invoke("bulk-link-qa-pages", {
        body: { mode: "comparison" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResults(prev => ({ ...prev, comparison: data.results }));
      toast.success(`Added links to ${data.successCount} comparison pages`);
      refetchStats();
      setProcessing(null);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
      setProcessing(null);
    }
  });

  // Mutation for cleaning citation markers
  const cleanCitationsMutation = useMutation({
    mutationFn: async () => {
      setProcessing("citations");
      const { data, error } = await supabase.functions.invoke("bulk-link-qa-pages", {
        body: { mode: "cleanup-citations" }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResults(prev => ({ ...prev, citations: data.results }));
      toast.success(`Cleaned ${data.successCount} articles`);
      refetchStats();
      setProcessing(null);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
      setProcessing(null);
    }
  });

  const getCompletionPercent = (done: number, total: number) => {
    if (total === 0) return 100;
    return Math.round(((total - done) / total) * 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Phase 1: AI Citation Optimization</h1>
          <p className="text-muted-foreground mt-1">
            Bulk internal linking for Q&A pages, comparison pages, and citation marker cleanup
          </p>
        </div>

        {loadingStats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Q&A Pages Card */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Q&A Pages
                  </CardTitle>
                  {stats?.qaNoLinks === 0 ? (
                    <Badge className="bg-green-500">Complete</Badge>
                  ) : (
                    <Badge variant="destructive">{stats?.qaNoLinks} need links</Badge>
                  )}
                </div>
                <CardDescription>
                  Add internal links to all {stats?.qaTotal} Q&A pages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{getCompletionPercent(stats?.qaNoLinks || 0, stats?.qaTotal || 0)}%</span>
                  </div>
                  <Progress value={getCompletionPercent(stats?.qaNoLinks || 0, stats?.qaTotal || 0)} />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => linkQAMutation.mutate()}
                  disabled={processing !== null || stats?.qaNoLinks === 0}
                >
                  {processing === "qa" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing {stats?.qaNoLinks} pages...
                    </>
                  ) : stats?.qaNoLinks === 0 ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      All Done
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Add Links to {stats?.qaNoLinks} Pages
                    </>
                  )}
                </Button>

                {results.qa && results.qa.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    ✓ {results.qa.filter(r => r.success).length} pages updated
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comparison Pages Card */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-purple-500" />
                    Comparison Pages
                  </CardTitle>
                  {stats?.compNoLinks === 0 ? (
                    <Badge className="bg-green-500">Complete</Badge>
                  ) : (
                    <Badge variant="destructive">{stats?.compNoLinks} need links</Badge>
                  )}
                </div>
                <CardDescription>
                  Add internal links to all {stats?.compTotal} comparison pages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{getCompletionPercent(stats?.compNoLinks || 0, stats?.compTotal || 0)}%</span>
                  </div>
                  <Progress value={getCompletionPercent(stats?.compNoLinks || 0, stats?.compTotal || 0)} />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => linkComparisonMutation.mutate()}
                  disabled={processing !== null || stats?.compNoLinks === 0}
                >
                  {processing === "comparison" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing {stats?.compNoLinks} pages...
                    </>
                  ) : stats?.compNoLinks === 0 ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      All Done
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Add Links to {stats?.compNoLinks} Pages
                    </>
                  )}
                </Button>

                {results.comparison && results.comparison.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    ✓ {results.comparison.filter(r => r.success).length} pages updated
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Citation Cleanup Card */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-orange-500" />
                    Citation Markers
                  </CardTitle>
                  {stats?.citationMarkerCount === 0 ? (
                    <Badge className="bg-green-500">Clean</Badge>
                  ) : (
                    <Badge variant="destructive">{stats?.citationMarkerCount} articles</Badge>
                  )}
                </div>
                <CardDescription>
                  Remove [CITATION_NEEDED] markers from content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.citationMarkerCount && stats.citationMarkerCount > 0 ? (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                    {stats.citationMarkerArticles.slice(0, 5).map((article: any) => (
                      <div key={article.id} className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                        <span className="truncate">{article.headline}</span>
                      </div>
                    ))}
                    {stats.citationMarkerCount > 5 && (
                      <div className="text-muted-foreground">
                        ...and {stats.citationMarkerCount - 5} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>No citation markers found</span>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  variant={stats?.citationMarkerCount === 0 ? "secondary" : "default"}
                  onClick={() => cleanCitationsMutation.mutate()}
                  disabled={processing !== null || stats?.citationMarkerCount === 0}
                >
                  {processing === "citations" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : stats?.citationMarkerCount === 0 ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      All Clean
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clean {stats?.citationMarkerCount} Articles
                    </>
                  )}
                </Button>

                {results.citations && results.citations.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    ✓ {results.citations.filter(r => r.success).length} articles cleaned
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Summary */}
        {(results.qa?.length || results.comparison?.length || results.citations?.length) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Processing Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {results.qa && results.qa.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Q&A Pages</h4>
                    <div className="text-sm space-y-1 max-h-48 overflow-y-auto">
                      {results.qa.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="truncate flex-1">{r.slug}</span>
                          {r.success ? (
                            <Badge variant="outline" className="text-green-600">
                              {r.linkCount} links
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.comparison && results.comparison.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Comparison Pages</h4>
                    <div className="text-sm space-y-1 max-h-48 overflow-y-auto">
                      {results.comparison.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="truncate flex-1">{r.slug}</span>
                          {r.success ? (
                            <Badge variant="outline" className="text-green-600">
                              {r.linkCount} links
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.citations && results.citations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Citation Cleanup</h4>
                    <div className="text-sm space-y-1 max-h-48 overflow-y-auto">
                      {results.citations.map((r, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="truncate flex-1">{r.slug}</span>
                          {r.success ? (
                            <Badge variant="outline" className="text-green-600">
                              Cleaned
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
