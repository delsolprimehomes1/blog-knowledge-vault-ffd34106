import React, { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Globe,
  Link2,
  FileText,
  BarChart3,
  Wrench,
  AlertCircle
} from 'lucide-react';

interface AuditReport {
  audit_timestamp: string;
  qa_hreflang_analysis: {
    total_qas: number;
    unique_groups: number;
    multi_language_groups: number;
    single_language_groups: number;
    groups_with_duplicates: number;
    group_size_distribution: Record<number, number>;
    largest_groups: Array<{
      hreflang_group_id: string;
      languages: string[];
      qa_count: number;
      has_duplicates: boolean;
    }>;
    duplicate_language_issues: Array<{
      hreflang_group_id: string;
      language: string;
      count: number;
    }>;
    orphaned_qas: number;
  };
  canonical_urls: {
    blog_articles: { total: number; missing: number; coverage: string };
    qa_pages: { total: number; missing: number; coverage: string };
    comparison_pages: { total: number; missing: number; coverage: string };
    location_pages: { total: number; missing: number; coverage: string };
    total_missing: number;
    sample_urls: { blog: string[]; qa: string[] };
  };
  hreflang_validation: {
    multi_language_qa_example: {
      qa_id: string;
      language: string;
      group_size: number;
      hreflang_tags: string[];
    } | null;
    standalone_qa_example: {
      qa_id: string;
      language: string;
      hreflang_tags: string[];
    } | null;
    english_qa_example: {
      qa_id: string;
      language: string;
      group_size: number;
      hreflang_tags: string[];
    } | null;
  };
  before_after_comparison: {
    before_v5: { total_groups: number; avg_languages_per_group: number; translation_linking: string };
    after_v5: { total_groups: number; avg_languages_per_group: number; translation_linking: string };
    improvement: string;
  };
  data_quality: {
    duplicate_languages_in_groups: number;
    url_language_mismatches: number;
    missing_translations_jsonb: number;
    orphaned_content: number;
  };
  health_score: {
    total_items: number;
    critical_issues: number;
    warning_issues: number;
    score: number;
    status: string;
  };
}

const SystemAudit = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'qa-hreflang']));

  const runAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-system-health');
      
      if (error) throw error;
      
      setReport(data);
      toast.success('Audit complete!');
    } catch (error: any) {
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fixDuplicateHreflang = async () => {
    setFixing('duplicates');
    try {
      const { data, error } = await supabase.functions.invoke('fix-duplicate-hreflang', {
        body: { dryRun }
      });
      
      if (error) throw error;
      
      if (dryRun) {
        toast.info(`Dry run: Would move ${data.summary?.qas_to_move || 0} duplicate Q&As to their own groups`);
      } else {
        toast.success(`Fixed ${data.summary?.groups_fixed || 0} groups with duplicates`);
        runAudit(); // Refresh report
      }
    } catch (error: any) {
      toast.error(`Fix failed: ${error.message}`);
    } finally {
      setFixing(null);
    }
  };

  const fixMissingCanonicals = async () => {
    setFixing('canonicals');
    try {
      const { data, error } = await supabase.functions.invoke('fix-cluster-canonicals', {
        body: { dryRun, contentType: 'all' }
      });
      
      if (error) throw error;
      
      const totalFixed = (data.blog?.updated || 0) + (data.qa?.updated || 0) + 
                         (data.location?.updated || 0) + (data.comparison?.updated || 0);
      
      if (dryRun) {
        toast.info(`Dry run: Would fix ${totalFixed} missing canonical URLs`);
      } else {
        toast.success(`Fixed ${totalFixed} canonical URLs`);
        runAudit();
      }
    } catch (error: any) {
      toast.error(`Fix failed: ${error.message}`);
    } finally {
      setFixing(null);
    }
  };

  const exportReport = () => {
    if (!report) return;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported!');
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 50) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Audit</h1>
            <p className="text-muted-foreground">
              Comprehensive health check for Q&A hreflang, canonical URLs, and data quality
            </p>
          </div>
          <div className="flex items-center gap-4">
            {report && (
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
            <Button onClick={runAudit} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Full Audit
            </Button>
          </div>
        </div>

        {/* Health Score Summary */}
        {report && (
          <Card className={getScoreBg(report.health_score.score)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-6xl font-bold ${getScoreColor(report.health_score.score)}`}>
                    {report.health_score.score}
                  </div>
                  <div>
                    <p className="text-lg font-medium">Health Score</p>
                    <p className="text-sm text-muted-foreground">
                      {report.health_score.total_items} items checked
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{report.health_score.critical_issues}</div>
                    <div className="text-xs text-muted-foreground">Critical</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{report.health_score.warning_issues}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {report.qa_hreflang_analysis.multi_language_groups}
                    </div>
                    <div className="text-xs text-muted-foreground">Multi-lang</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Fix Actions */}
        {report && (report.data_quality.duplicate_languages_in_groups > 0 || report.canonical_urls.total_missing > 0) && (
          <Card className="border-orange-500/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  <CardTitle>Quick Fix Actions</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="dry-run"
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                  <Label htmlFor="dry-run" className="text-sm">
                    Dry Run (preview only)
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-4">
              {report.data_quality.duplicate_languages_in_groups > 0 && (
                <Button
                  variant="outline"
                  onClick={fixDuplicateHreflang}
                  disabled={fixing !== null}
                >
                  {fixing === 'duplicates' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  Fix Duplicate Languages ({report.data_quality.duplicate_languages_in_groups})
                </Button>
              )}
              {report.canonical_urls.total_missing > 0 && (
                <Button
                  variant="outline"
                  onClick={fixMissingCanonicals}
                  disabled={fixing !== null}
                >
                  {fixing === 'canonicals' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Link2 className="h-4 w-4 mr-2 text-yellow-500" />
                  Fix Missing Canonicals ({report.canonical_urls.total_missing})
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {report && (
          <div className="grid gap-6">
            {/* Q&A Hreflang Analysis */}
            <Collapsible open={expandedSections.has('qa-hreflang')}>
              <Card>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('qa-hreflang')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        <CardTitle>Q&A Hreflang Analysis</CardTitle>
                        {report.qa_hreflang_analysis.groups_with_duplicates > 0 && (
                          <Badge variant="destructive">
                            {report.qa_hreflang_analysis.groups_with_duplicates} issues
                          </Badge>
                        )}
                      </div>
                      {expandedSections.has('qa-hreflang') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold">{report.qa_hreflang_analysis.total_qas}</div>
                        <div className="text-xs text-muted-foreground">Total Q&As</div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold">{report.qa_hreflang_analysis.unique_groups}</div>
                        <div className="text-xs text-muted-foreground">Unique Groups</div>
                      </div>
                      <div className="p-4 bg-green-500/10 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {report.qa_hreflang_analysis.multi_language_groups}
                        </div>
                        <div className="text-xs text-muted-foreground">Multi-language</div>
                      </div>
                      <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-500">
                          {report.qa_hreflang_analysis.single_language_groups}
                        </div>
                        <div className="text-xs text-muted-foreground">Single-language</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center ${
                        report.qa_hreflang_analysis.groups_with_duplicates > 0 
                          ? 'bg-red-500/10' 
                          : 'bg-muted'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          report.qa_hreflang_analysis.groups_with_duplicates > 0 
                            ? 'text-red-500' 
                            : ''
                        }`}>
                          {report.qa_hreflang_analysis.groups_with_duplicates}
                        </div>
                        <div className="text-xs text-muted-foreground">With Duplicates</div>
                      </div>
                    </div>

                    {/* Group Size Distribution */}
                    <div>
                      <h4 className="font-medium mb-3">Group Size Distribution</h4>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(report.qa_hreflang_analysis.group_size_distribution)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([size, count]) => (
                            <Badge key={size} variant="outline" className="text-sm">
                              {size} lang{Number(size) > 1 ? 's' : ''}: {count} groups
                            </Badge>
                          ))}
                      </div>
                    </div>

                    {/* Duplicate Language Issues */}
                    {report.qa_hreflang_analysis.duplicate_language_issues.length > 0 && (
                      <div className="border border-red-500/50 rounded-lg p-4">
                        <h4 className="font-medium text-red-500 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Duplicate Languages in Groups
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {report.qa_hreflang_analysis.duplicate_language_issues.slice(0, 10).map((issue, i) => (
                            <div key={i} className="text-sm flex justify-between p-2 bg-red-500/5 rounded">
                              <code className="text-xs">{issue.hreflang_group_id.substring(0, 8)}...</code>
                              <span>
                                <Badge variant="destructive">{issue.language.toUpperCase()}</Badge>
                                <span className="ml-2">×{issue.count}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Largest Groups */}
                    <div>
                      <h4 className="font-medium mb-3">Top 10 Largest Groups</h4>
                      <div className="space-y-2">
                        {report.qa_hreflang_analysis.largest_groups.map((group, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm">#{i + 1}</span>
                              <code className="text-xs">{group.hreflang_group_id.substring(0, 12)}...</code>
                              {group.has_duplicates && (
                                <Badge variant="destructive" className="text-xs">Duplicates</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {group.languages.map(lang => (
                                  <Badge key={lang} variant="secondary" className="text-xs">
                                    {lang.toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                              <Badge>{group.qa_count} Q&As</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Canonical URLs */}
            <Collapsible open={expandedSections.has('canonicals')}>
              <Card>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('canonicals')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        <CardTitle>Canonical URL Coverage</CardTitle>
                        {report.canonical_urls.total_missing > 0 && (
                          <Badge variant="secondary">
                            {report.canonical_urls.total_missing} missing
                          </Badge>
                        )}
                      </div>
                      {expandedSections.has('canonicals') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Blog */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Blog Articles</span>
                          <Badge variant={report.canonical_urls.blog_articles.missing === 0 ? 'default' : 'secondary'}>
                            {report.canonical_urls.blog_articles.coverage}
                          </Badge>
                        </div>
                        <Progress 
                          value={parseFloat(report.canonical_urls.blog_articles.coverage)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {report.canonical_urls.blog_articles.missing} of {report.canonical_urls.blog_articles.total} missing
                        </p>
                      </div>

                      {/* Q&A */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Q&A Pages</span>
                          <Badge variant={report.canonical_urls.qa_pages.missing === 0 ? 'default' : 'destructive'}>
                            {report.canonical_urls.qa_pages.coverage}
                          </Badge>
                        </div>
                        <Progress 
                          value={parseFloat(report.canonical_urls.qa_pages.coverage)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {report.canonical_urls.qa_pages.missing} of {report.canonical_urls.qa_pages.total} missing
                        </p>
                      </div>

                      {/* Comparison */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Comparisons</span>
                          <Badge variant={report.canonical_urls.comparison_pages.missing === 0 ? 'default' : 'destructive'}>
                            {report.canonical_urls.comparison_pages.coverage}
                          </Badge>
                        </div>
                        <Progress 
                          value={parseFloat(report.canonical_urls.comparison_pages.coverage)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {report.canonical_urls.comparison_pages.missing} of {report.canonical_urls.comparison_pages.total} missing
                        </p>
                      </div>

                      {/* Location */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Location Pages</span>
                          <Badge variant={report.canonical_urls.location_pages.missing === 0 ? 'default' : 'secondary'}>
                            {report.canonical_urls.location_pages.coverage}
                          </Badge>
                        </div>
                        <Progress 
                          value={parseFloat(report.canonical_urls.location_pages.coverage)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {report.canonical_urls.location_pages.missing} of {report.canonical_urls.location_pages.total} missing
                        </p>
                      </div>
                    </div>

                    {/* Sample URLs */}
                    {report.canonical_urls.sample_urls.blog.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Sample Canonical URLs</h4>
                        <ScrollArea className="h-32 rounded border p-2">
                          {report.canonical_urls.sample_urls.blog.concat(report.canonical_urls.sample_urls.qa).map((url, i) => (
                            <div key={i} className="text-xs font-mono text-muted-foreground truncate">
                              {url}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Before/After Comparison */}
            <Collapsible open={expandedSections.has('comparison')}>
              <Card>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('comparison')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        <CardTitle>Before vs After v5</CardTitle>
                        <Badge variant="default" className="bg-green-500">
                          {report.before_after_comparison.improvement}
                        </Badge>
                      </div>
                      {expandedSections.has('comparison') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Before */}
                      <div className="p-6 border rounded-lg bg-red-500/5">
                        <h4 className="font-medium text-lg mb-4 flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-500" />
                          Before v5
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Groups</span>
                            <span className="font-bold">{report.before_after_comparison.before_v5.total_groups}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Languages/Group</span>
                            <span className="font-bold">{report.before_after_comparison.before_v5.avg_languages_per_group}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Translation Linking</span>
                            <span className="font-bold text-red-500">{report.before_after_comparison.before_v5.translation_linking}</span>
                          </div>
                        </div>
                      </div>

                      {/* After */}
                      <div className="p-6 border rounded-lg bg-green-500/5">
                        <h4 className="font-medium text-lg mb-4 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          After v5
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Groups</span>
                            <span className="font-bold">{report.before_after_comparison.after_v5.total_groups}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Languages/Group</span>
                            <span className="font-bold">{report.before_after_comparison.after_v5.avg_languages_per_group}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Translation Linking</span>
                            <span className="font-bold text-green-500">{report.before_after_comparison.after_v5.translation_linking}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Hreflang Tag Validation */}
            <Collapsible open={expandedSections.has('hreflang-tags')}>
              <Card>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('hreflang-tags')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <CardTitle>Hreflang Tag Examples</CardTitle>
                      </div>
                      {expandedSections.has('hreflang-tags') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {report.hreflang_validation.multi_language_qa_example && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default">Multi-Language Group</Badge>
                          <span className="text-sm text-muted-foreground">
                            ({report.hreflang_validation.multi_language_qa_example.group_size} languages)
                          </span>
                        </div>
                        <ScrollArea className="h-32 rounded bg-muted p-2">
                          <pre className="text-xs">
                            {report.hreflang_validation.multi_language_qa_example.hreflang_tags.join('\n')}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {report.hreflang_validation.standalone_qa_example && (
                      <div className="border rounded-lg p-4">
                        <Badge variant="secondary">Standalone Q&A</Badge>
                        <ScrollArea className="h-20 rounded bg-muted p-2 mt-2">
                          <pre className="text-xs">
                            {report.hreflang_validation.standalone_qa_example.hreflang_tags.join('\n')}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {report.hreflang_validation.english_qa_example && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">English Q&A in Multi-Language Group</Badge>
                          <span className="text-sm text-muted-foreground">
                            ({report.hreflang_validation.english_qa_example.group_size} languages)
                          </span>
                        </div>
                        <ScrollArea className="h-32 rounded bg-muted p-2">
                          <pre className="text-xs">
                            {report.hreflang_validation.english_qa_example.hreflang_tags.join('\n')}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Data Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Data Quality Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg text-center ${
                    report.data_quality.duplicate_languages_in_groups > 0 
                      ? 'bg-red-500/10' 
                      : 'bg-green-500/10'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      report.data_quality.duplicate_languages_in_groups > 0 
                        ? 'text-red-500' 
                        : 'text-green-500'
                    }`}>
                      {report.data_quality.duplicate_languages_in_groups}
                    </div>
                    <div className="text-xs text-muted-foreground">Duplicate Languages</div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    report.data_quality.url_language_mismatches > 0 
                      ? 'bg-yellow-500/10' 
                      : 'bg-green-500/10'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      report.data_quality.url_language_mismatches > 0 
                        ? 'text-yellow-500' 
                        : 'text-green-500'
                    }`}>
                      {report.data_quality.url_language_mismatches}
                    </div>
                    <div className="text-xs text-muted-foreground">URL/Lang Mismatches</div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    report.data_quality.missing_translations_jsonb > 0 
                      ? 'bg-yellow-500/10' 
                      : 'bg-green-500/10'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      report.data_quality.missing_translations_jsonb > 0 
                        ? 'text-yellow-500' 
                        : 'text-green-500'
                    }`}>
                      {report.data_quality.missing_translations_jsonb}
                    </div>
                    <div className="text-xs text-muted-foreground">Missing Translations</div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    report.data_quality.orphaned_content > 0 
                      ? 'bg-yellow-500/10' 
                      : 'bg-green-500/10'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      report.data_quality.orphaned_content > 0 
                        ? 'text-yellow-500' 
                        : 'text-green-500'
                    }`}>
                      {report.data_quality.orphaned_content}
                    </div>
                    <div className="text-xs text-muted-foreground">Orphaned Content</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audit Timestamp */}
            <div className="text-center text-sm text-muted-foreground">
              Audit completed at {new Date(report.audit_timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!report && !loading && (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Audit Data</h3>
              <p className="text-muted-foreground mb-4">
                Run a full system audit to see health metrics and identify issues
              </p>
              <Button onClick={runAudit}>
                <Play className="h-4 w-4 mr-2" />
                Run Full Audit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemAudit;
