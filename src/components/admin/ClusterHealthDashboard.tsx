import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Globe, 
  RefreshCw, 
  XCircle,
  Link2,
  Wrench,
  Languages
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QAHreflangStatus {
  total_qa_pages: number;
  unique_hreflang_groups: number;
  expected_groups_estimate: number;
  is_broken: boolean;
  severity: 'critical' | 'warning' | 'ok';
  multi_language_groups: number;
  single_language_groups: number;
}

interface MissingCanonicals {
  blog_articles: number;
  qa_pages: number;
  location_pages: number;
  comparison_pages: number;
  total: number;
}

interface HealthCheckResult {
  hreflang_group_id: string;
  content_type: string;
  issues: string[];
  languages_found: string[];
  missing_languages: string[];
  has_english: boolean;
  bidirectional_ok: boolean;
  sample_url: string;
}

interface HealthReport {
  timestamp: string;
  total_groups_checked: number;
  groups_with_issues: number;
  issues_by_type: {
    missing_languages: number;
    no_english: number;
    bidirectional_mismatch: number;
    orphaned: number;
    broken_qa_hreflang: number;
    missing_canonicals: number;
  };
  results: HealthCheckResult[];
  orphaned_content: {
    blog_articles: number;
    qa_pages: number;
    location_pages: number;
    comparison_pages: number;
  };
  qa_hreflang_status: QAHreflangStatus;
  missing_canonicals: MissingCanonicals;
}

export function ClusterHealthDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFixingHreflang, setIsFixingHreflang] = useState(false);
  const [isFixingCanonicals, setIsFixingCanonicals] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [dryRun, setDryRun] = useState(true);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-cluster-health', {
        body: {}
      });

      if (error) throw error;
      setHealthReport(data);
      toast.success("Health check completed");
    } catch (error) {
      console.error("Health check error:", error);
      toast.error("Failed to run health check");
    } finally {
      setIsLoading(false);
    }
  };

  const repairQAHreflang = async () => {
    setIsFixingHreflang(true);
    try {
      const { data, error } = await supabase.functions.invoke('repair-hreflang-groups', {
        body: { dryRun }
      });

      if (error) throw error;
      
      if (dryRun) {
        toast.success(`Dry run: Would update ${data.stats?.totalQAs || 0} Q&A pages across ${data.stats?.linkedGroups || 0} groups`);
        console.log('Repair preview:', data);
      } else {
        toast.success(`Updated ${data.stats?.successCount || 0} Q&A pages`);
        // Refresh health check after fix
        runHealthCheck();
      }
    } catch (error) {
      console.error("Repair hreflang error:", error);
      toast.error("Failed to repair Q&A hreflang groups");
    } finally {
      setIsFixingHreflang(false);
    }
  };

  const fixCanonicalUrls = async () => {
    setIsFixingCanonicals(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-cluster-canonicals', {
        body: { dryRun, contentType: 'all' }
      });

      if (error) throw error;
      
      if (dryRun) {
        toast.success(`Dry run: Would update ${data.totalUpdated || 0} canonical URLs`);
        console.log('Canonical fix preview:', data);
      } else {
        toast.success(`Updated ${data.totalUpdated || 0} canonical URLs (${data.totalErrors || 0} errors)`);
        // Refresh health check after fix
        runHealthCheck();
      }
    } catch (error) {
      console.error("Fix canonicals error:", error);
      toast.error("Failed to fix canonical URLs");
    } finally {
      setIsFixingCanonicals(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const exportReport = () => {
    if (!healthReport) return;
    
    const blob = new Blob([JSON.stringify(healthReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-health-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResults = healthReport?.results.filter(r => 
    filterType === "all" || r.content_type === filterType
  ) || [];

  const totalOrphaned = healthReport 
    ? Object.values(healthReport.orphaned_content).reduce((a, b) => a + b, 0)
    : 0;

  const healthScore = healthReport && healthReport.total_groups_checked > 0
    ? Math.round(((healthReport.total_groups_checked - healthReport.groups_with_issues) / healthReport.total_groups_checked) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cluster Health Check</h2>
          <p className="text-muted-foreground">
            Validate hreflang groups, canonical URLs, and language coverage
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runHealthCheck} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Run Health Check
              </>
            )}
          </Button>
          {healthReport && (
            <Button variant="outline" onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Quick Fix Actions */}
      {healthReport && (healthReport.qa_hreflang_status?.is_broken || healthReport.missing_canonicals?.total > 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Wrench className="h-5 w-5" />
              Quick Fix Actions
            </CardTitle>
            <CardDescription>
              Apply automated fixes to resolve detected issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch 
                id="dry-run" 
                checked={dryRun} 
                onCheckedChange={setDryRun}
              />
              <Label htmlFor="dry-run" className="text-sm">
                Dry Run (preview changes without applying)
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthReport.qa_hreflang_status?.is_broken && (
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-3"
                  onClick={repairQAHreflang}
                  disabled={isFixingHreflang}
                >
                  <div className="flex items-start gap-3">
                    {isFixingHreflang ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
                    ) : (
                      <Languages className="h-5 w-5 text-amber-600" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">Repair Q&A Hreflang Groups (v5)</div>
                      <div className="text-xs text-muted-foreground">
                        Fix {healthReport.qa_hreflang_status.single_language_groups} broken groups
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {healthReport.missing_canonicals?.total > 0 && (
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-3"
                  onClick={fixCanonicalUrls}
                  disabled={isFixingCanonicals}
                >
                  <div className="flex items-start gap-3">
                    {isFixingCanonicals ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
                    ) : (
                      <Link2 className="h-5 w-5 text-amber-600" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">Fix Missing Canonical URLs</div>
                      <div className="text-xs text-muted-foreground">
                        Add {healthReport.missing_canonicals.total} missing URLs
                      </div>
                    </div>
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {healthReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{healthScore}%</span>
                {healthScore >= 80 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : healthScore >= 50 ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <Progress value={healthScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{healthReport.total_groups_checked}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Groups with Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-destructive">
                {healthReport.groups_with_issues}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Missing English
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-destructive">
                {healthReport.issues_by_type.no_english}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Missing Canonicals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-destructive">
                {healthReport.missing_canonicals?.total || 0}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orphaned Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-destructive">
                {totalOrphaned}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Q&A Hreflang Status Card */}
      {healthReport?.qa_hreflang_status && (
        <Card className={
          healthReport.qa_hreflang_status.is_broken 
            ? "border-destructive/50 bg-destructive/5" 
            : healthReport.qa_hreflang_status.severity === 'warning'
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-green-500/50 bg-green-500/5"
        }>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className={`h-5 w-5 ${
                healthReport.qa_hreflang_status.is_broken 
                  ? 'text-destructive' 
                  : healthReport.qa_hreflang_status.severity === 'warning'
                    ? 'text-amber-600'
                    : 'text-green-600'
              }`} />
              Q&A Hreflang Status
              <Badge variant={
                healthReport.qa_hreflang_status.is_broken 
                  ? 'destructive' 
                  : healthReport.qa_hreflang_status.severity === 'warning'
                    ? 'secondary'
                    : 'default'
              }>
                {healthReport.qa_hreflang_status.severity.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              {healthReport.qa_hreflang_status.is_broken
                ? 'Q&A pages have broken hreflang grouping - translations not linked properly'
                : 'Q&A hreflang groups are properly configured'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.qa_hreflang_status.total_qa_pages}</div>
                <div className="text-sm text-muted-foreground">Total Q&A Pages</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.qa_hreflang_status.unique_hreflang_groups}</div>
                <div className="text-sm text-muted-foreground">Unique Groups</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-green-600">{healthReport.qa_hreflang_status.multi_language_groups}</div>
                <div className="text-sm text-muted-foreground">Multi-Language</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className={`text-2xl font-bold ${healthReport.qa_hreflang_status.is_broken ? 'text-destructive' : ''}`}>
                  {healthReport.qa_hreflang_status.single_language_groups}
                </div>
                <div className="text-sm text-muted-foreground">Single-Language</div>
              </div>
            </div>
            {healthReport.qa_hreflang_status.is_broken && (
              <p className="text-sm text-muted-foreground mt-4">
                Expected ~{healthReport.qa_hreflang_status.expected_groups_estimate} groups but found {healthReport.qa_hreflang_status.unique_hreflang_groups}. 
                Use "Repair Q&A Hreflang Groups" to fix.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Canonicals Breakdown */}
      {healthReport?.missing_canonicals && healthReport.missing_canonicals.total > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Link2 className="h-5 w-5" />
              Missing Canonical URLs
            </CardTitle>
            <CardDescription>
              Content missing canonical URL for proper SEO indexing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.missing_canonicals.blog_articles}</div>
                <div className="text-sm text-muted-foreground">Blog Articles</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.missing_canonicals.qa_pages}</div>
                <div className="text-sm text-muted-foreground">Q&A Pages</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.missing_canonicals.location_pages}</div>
                <div className="text-sm text-muted-foreground">Location Pages</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.missing_canonicals.comparison_pages}</div>
                <div className="text-sm text-muted-foreground">Comparison Pages</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orphaned Content Breakdown */}
      {healthReport && totalOrphaned > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Orphaned Content Detected
            </CardTitle>
            <CardDescription>
              Content missing hreflang_group_id or cluster_id
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.orphaned_content.blog_articles}</div>
                <div className="text-sm text-muted-foreground">Blog Articles</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.orphaned_content.qa_pages}</div>
                <div className="text-sm text-muted-foreground">Q&A Pages</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.orphaned_content.location_pages}</div>
                <div className="text-sm text-muted-foreground">Location Pages</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold">{healthReport.orphaned_content.comparison_pages}</div>
                <div className="text-sm text-muted-foreground">Comparison Pages</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      {healthReport && healthReport.results.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            All ({healthReport.results.length})
          </Button>
          {["blog", "qa", "location", "comparison"].map(type => {
            const count = healthReport.results.filter(r => r.content_type === type).length;
            return (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Results List */}
      {healthReport && filteredResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Groups with Issues</CardTitle>
            <CardDescription>
              Showing {filteredResults.length} groups with language coverage issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredResults.slice(0, 100).map((result) => (
                  <Collapsible
                    key={result.hreflang_group_id}
                    open={expandedGroups.includes(result.hreflang_group_id)}
                    onOpenChange={() => toggleGroup(result.hreflang_group_id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedGroups.includes(result.hreflang_group_id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Badge variant="outline">{result.content_type}</Badge>
                          <span className="text-sm font-medium truncate max-w-md">
                            {result.hreflang_group_id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!result.has_english && (
                            <Badge variant="destructive">No English</Badge>
                          )}
                          <Badge variant="secondary">
                            {result.languages_found.length}/10 languages
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border-l-2 border-muted ml-4 mt-1 space-y-3">
                        <div>
                          <span className="text-sm font-medium">Existing Languages:</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {result.languages_found.map(lang => (
                              <Badge key={lang} variant="outline" className="bg-green-500/10">
                                <Globe className="h-3 w-3 mr-1" />
                                {lang.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Missing Languages:</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {result.missing_languages.map(lang => (
                              <Badge key={lang} variant="destructive" className="opacity-70">
                                {lang.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Group ID: {result.hreflang_group_id}
                        </div>
                        {result.sample_url && (
                          <a 
                            href={result.sample_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View sample page →
                          </a>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {filteredResults.length > 100 && (
                  <p className="text-center text-muted-foreground py-4">
                    Showing first 100 of {filteredResults.length} results. Export for full list.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!healthReport && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Health Check Results</h3>
            <p className="text-muted-foreground text-center mb-4">
              Run a health check to validate cluster language coverage and detect orphaned content
            </p>
            <Button onClick={runHealthCheck}>
              <Activity className="h-4 w-4 mr-2" />
              Run Health Check
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All Good State */}
      {healthReport && healthReport.groups_with_issues === 0 && totalOrphaned === 0 && 
       !healthReport.qa_hreflang_status?.is_broken && healthReport.missing_canonicals?.total === 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">All Clusters Healthy!</h3>
            <p className="text-muted-foreground text-center">
              All {healthReport.total_groups_checked} hreflang groups have complete language coverage
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
