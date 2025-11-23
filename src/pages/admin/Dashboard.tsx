import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle } from "@/types/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Globe, Plus, AlertCircle, CheckCircle2, Shield, RefreshCw, Rocket, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { validateSchemaRequirements } from "@/lib/schemaGenerator";
import { toast } from "sonner";
import { useState } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isRebuilding, setIsRebuilding] = useState(false);

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["articles-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*");
      
      if (error) throw error;
      if (!data) return [];

      return data as unknown as BlogArticle[];
    },
  });

  const { data: linkingStats } = useQuery({
    queryKey: ["linking-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("id, language, internal_links, status")
        .eq("status", "published");
      
      const needsLinks = data?.filter((a: any) => 
        !a.internal_links || 
        (Array.isArray(a.internal_links) && a.internal_links.length < 5)
      ) || [];
      
      return {
        total: needsLinks.length,
        byLanguage: needsLinks.reduce((acc: Record<string, number>, a: any) => {
          acc[a.language] = (acc[a.language] || 0) + 1;
          return acc;
        }, {})
      };
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold">Unable to Load Dashboard</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error 
                    ? error.message 
                    : "There was a problem loading dashboard statistics. Please try again."}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Reload Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Calculate statistics
  const stats = {
    draft: articles?.filter(a => a.status === 'draft').length || 0,
    published: articles?.filter(a => a.status === 'published').length || 0,
    archived: articles?.filter(a => a.status === 'archived').length || 0,
    tofu: articles?.filter(a => a.funnel_stage === 'TOFU').length || 0,
    mofu: articles?.filter(a => a.funnel_stage === 'MOFU').length || 0,
    bofu: articles?.filter(a => a.funnel_stage === 'BOFU').length || 0,
  };

  // Count by language
  const languageCounts = articles?.reduce((acc, article) => {
    acc[article.language] = (acc[article.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', de: 'German', nl: 'Dutch',
    fr: 'French', pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian'
  };

  // Calculate schema health
  const schemaHealth = articles?.reduce((acc, article) => {
    const validationErrors = validateSchemaRequirements(article);
    const hasErrors = validationErrors.some(e => e.severity === 'error');
    if (!hasErrors) acc.valid++;
    else acc.needsAttention++;
    return acc;
  }, { valid: 0, needsAttention: 0 });

  const schemaHealthScore = articles && articles.length > 0
    ? Math.round((schemaHealth!.valid / articles.length) * 100)
    : 0;

  const handleRebuildSite = async () => {
    setIsRebuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-rebuild');
      
      if (error) throw error;
      
      toast.success('Site rebuild triggered!', {
        description: 'Static pages will regenerate in 5-10 minutes',
      });
      
      console.log('Rebuild response:', data);
    } catch (error) {
      console.error('Rebuild error:', error);
      toast.error('Failed to trigger rebuild', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your blog content
            </p>
          </div>
          <Button onClick={() => navigate('/admin/articles/new')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create New Article
          </Button>
        </div>

        {/* SSG Status Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Static Site Generation</CardTitle>
            <Rocket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-primary">
                {stats.published}
              </div>
              <span className="text-xs text-muted-foreground">static pages</span>
            </div>
            <Button 
              onClick={handleRebuildSite} 
              disabled={isRebuilding}
              size="sm"
              className="w-full"
            >
              {isRebuilding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild Static Pages
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Regenerate static HTML for all published articles
            </p>
          </CardContent>
        </Card>

        {/* Status Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Draft Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Work in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Published Articles</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <p className="text-xs text-muted-foreground">Live content</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Archived Articles</CardTitle>
              <FileText className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.archived}</div>
              <p className="text-xs text-muted-foreground">Old content</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Schema Health</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-bold ${
                  schemaHealthScore >= 90 ? 'text-green-600' : 
                  schemaHealthScore >= 70 ? 'text-amber-600' : 
                  'text-red-600'
                }`}>
                  {schemaHealthScore}%
                </div>
                {schemaHealthScore === 100 && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {schemaHealth?.needsAttention ? (
                  <>{schemaHealth.needsAttention} article{schemaHealth.needsAttention !== 1 ? 's' : ''} need{schemaHealth.needsAttention === 1 ? 's' : ''} attention</>
                ) : (
                  'All schemas valid'
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Stage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Articles by Funnel Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">TOFU (Top of Funnel)</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.tofu}</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${articles ? (stats.tofu / articles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">MOFU (Middle of Funnel)</span>
                  <span className="text-2xl font-bold text-amber-600">{stats.mofu}</span>
                </div>
                <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-600 rounded-full"
                    style={{ width: `${articles ? (stats.mofu / articles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">BOFU (Bottom of Funnel)</span>
                  <span className="text-2xl font-bold text-green-600">{stats.bofu}</span>
                </div>
                <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${articles ? (stats.bofu / articles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Articles by Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {languageCounts && Object.entries(languageCounts).map(([lang, count]) => (
                <div key={lang} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{languageNames[lang] || lang.toUpperCase()}</span>
                  <span className="text-lg font-bold text-primary">{count}</span>
                </div>
              ))}
              {(!languageCounts || Object.keys(languageCounts).length === 0) && (
                <p className="text-sm text-muted-foreground col-span-3">No articles yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Internal Linking Health */}
        <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Internal Linking Health</CardTitle>
            <Link2 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-bold ${
                  (linkingStats?.total || 0) === 0 ? 'text-green-600' : 
                  (linkingStats?.total || 0) <= 10 ? 'text-amber-600' : 
                  'text-red-600'
                }`}>
                  {linkingStats?.total || 0}
                </div>
                <span className="text-xs text-muted-foreground">articles need links</span>
              </div>
              
              {linkingStats && linkingStats.total > 0 && (
                <div className="space-y-1">
                  {Object.entries(linkingStats.byLanguage).map(([lang, count]) => (
                    <div key={lang} className="flex justify-between text-xs">
                      <span>{lang.toUpperCase()}: {count} articles</span>
                      {count > 10 && <span className="text-red-600 font-medium">🔴 Critical</span>}
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={() => navigate('/admin/bulk-internal-links')}
                size="sm"
                className="w-full"
                variant={(linkingStats?.total || 0) > 0 ? "default" : "outline"}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {(linkingStats?.total || 0) > 0 ? 'Fix Linking Issues' : 'Manage Links'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
