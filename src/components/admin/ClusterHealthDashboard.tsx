import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Globe, 
  RefreshCw, 
  XCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HealthIssue {
  issue_type: string;
  missing_languages: string[];
  existing_languages: string[];
}

interface HealthCheckResult {
  group_id: string;
  content_type: string;
  issues: HealthIssue[];
  sample_titles: Record<string, string>;
}

interface HealthReport {
  timestamp: string;
  total_groups_checked: number;
  groups_with_issues: number;
  issues_by_type: {
    missing_languages: number;
    no_english: number;
    bidirectional_mismatch: number;
  };
  results: HealthCheckResult[];
  orphaned_content: {
    blog_articles: number;
    qa_pages: number;
    location_pages: number;
    comparison_pages: number;
  };
}

export function ClusterHealthDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");

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
            Validate hreflang groups, language coverage, and orphaned content
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

      {/* Summary Cards */}
      {healthReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    key={result.group_id}
                    open={expandedGroups.includes(result.group_id)}
                    onOpenChange={() => toggleGroup(result.group_id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedGroups.includes(result.group_id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Badge variant="outline">{result.content_type}</Badge>
                          <span className="text-sm font-medium truncate max-w-md">
                            {Object.values(result.sample_titles)[0] || result.group_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.issues.some(i => i.issue_type === "no_english") && (
                            <Badge variant="destructive">No English</Badge>
                          )}
                          <Badge variant="secondary">
                            {result.issues[0]?.existing_languages.length || 0}/10 languages
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border-l-2 border-muted ml-4 mt-1 space-y-3">
                        <div>
                          <span className="text-sm font-medium">Existing Languages:</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {result.issues[0]?.existing_languages.map(lang => (
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
                            {result.issues[0]?.missing_languages.map(lang => (
                              <Badge key={lang} variant="destructive" className="opacity-70">
                                {lang.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Group ID: {result.group_id}
                        </div>
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
      {healthReport && healthReport.groups_with_issues === 0 && totalOrphaned === 0 && (
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
