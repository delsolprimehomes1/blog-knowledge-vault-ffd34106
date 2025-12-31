import React, { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Globe,
  Link2,
  Languages,
  FileCode,
  FileText,
  Bot,
  Gauge,
  ExternalLink,
  Shield,
  Rocket,
  AlertCircle
} from 'lucide-react';

interface Issue {
  page: string;
  problem: string;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warning';
  severity: 'critical' | 'warning' | 'info';
  pages_tested: number;
  issues_found: number;
  issues: Issue[];
  details?: Record<string, any>;
}

interface AuditResponse {
  audit_timestamp: string;
  overall_health: number;
  launch_ready: boolean;
  summary: {
    passed_checks: number;
    warning_checks: number;
    failed_checks: number;
    critical_issues: number;
    warnings: number;
    pages_tested: number;
  };
  checks: Record<string, CheckResult>;
  sample_pages: {
    tested_urls: { url: string; type: string }[];
    perfect_page: any;
    problematic_page: any;
  };
  launch_checklist: Record<string, boolean>;
}

const checkIcons: Record<string, React.ReactNode> = {
  hreflang: <Globe className="h-5 w-5" />,
  canonical: <Link2 className="h-5 w-5" />,
  language_consistency: <Languages className="h-5 w-5" />,
  schema: <FileCode className="h-5 w-5" />,
  sitemap: <FileText className="h-5 w-5" />,
  robots: <Bot className="h-5 w-5" />,
  internal_links: <Link2 className="h-5 w-5" />,
  external_citations: <ExternalLink className="h-5 w-5" />,
  performance: <Gauge className="h-5 w-5" />,
  ai_readiness: <Shield className="h-5 w-5" />,
};

const checkLabels: Record<string, string> = {
  hreflang: 'Hreflang Tags',
  canonical: 'Canonical URLs',
  language_consistency: 'Language Consistency',
  schema: 'Schema Markup',
  sitemap: 'Sitemap',
  robots: 'Robots.txt',
  internal_links: 'Internal Links',
  external_citations: 'External Citations',
  performance: 'Performance',
  ai_readiness: 'AI Readiness',
};

const ProductionAudit = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResponse | null>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('production-site-audit');
      
      if (error) throw error;
      
      setResults(data);
      toast.success('Audit complete!');
    } catch (error: any) {
      console.error('Audit error:', error);
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!results) return;
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Production Site Audit</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive SEO/AEO validation for launch readiness
            </p>
          </div>
          <div className="flex gap-2">
            {results && (
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            )}
            <Button onClick={runAudit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Full Audit
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-lg font-medium">Running Production Audit...</p>
              <p className="text-muted-foreground">
                Fetching live pages and validating SEO configuration
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            {/* Launch Readiness Banner */}
            <Card className={results.launch_ready ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-4">
                  {results.launch_ready ? (
                    <>
                      <Rocket className="h-10 w-10 text-green-600" />
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">
                          READY TO LAUNCH
                        </h2>
                        <p className="text-green-600 dark:text-green-500">
                          All critical checks passed
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-10 w-10 text-red-600" />
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">
                          CRITICAL ISSUES - DO NOT LAUNCH
                        </h2>
                        <p className="text-red-600 dark:text-red-500">
                          {results.summary.critical_issues} critical issues must be resolved
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Status */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className={`text-4xl font-bold ${getHealthColor(results.overall_health)}`}>
                    {results.overall_health}
                  </div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-green-500">
                    {results.summary.passed_checks}
                  </div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-yellow-500">
                    {results.summary.warning_checks}
                  </div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-red-500">
                    {results.summary.failed_checks}
                  </div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-muted-foreground">
                    {results.summary.pages_tested}
                  </div>
                  <p className="text-sm text-muted-foreground">Pages Tested</p>
                </CardContent>
              </Card>
            </div>

            {/* Critical Checks Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(results.checks).map(([key, check]) => (
                <Card key={key} className={
                  check.status === 'fail' ? 'border-red-500' :
                  check.status === 'warning' ? 'border-yellow-500' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      {checkIcons[key]}
                      {getStatusIcon(check.status)}
                    </div>
                    <h3 className="font-medium text-sm">{checkLabels[key]}</h3>
                    <p className="text-xs text-muted-foreground">
                      {check.issues_found} issues
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Results</CardTitle>
                <CardDescription>
                  Click each section to see specific issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(results.checks).map(([key, check]) => (
                    <AccordionItem key={key} value={key}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          {checkIcons[key]}
                          <span className="flex-1 text-left">{checkLabels[key]}</span>
                          {getStatusIcon(check.status)}
                          <span className="text-sm text-muted-foreground">
                            {check.pages_tested} pages, {check.issues_found} issues
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {check.details && (
                          <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                            <strong>Details:</strong>
                            <pre className="mt-1 text-xs overflow-x-auto">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {check.issues.length === 0 ? (
                          <p className="text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            All checks passed
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {check.issues.map((issue, idx) => (
                              <div 
                                key={idx}
                                className={`p-3 rounded-lg border ${
                                  issue.severity === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-950' :
                                  issue.severity === 'warning' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950' :
                                  'border-gray-200 bg-gray-50 dark:bg-gray-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getSeverityBadge(issue.severity)}
                                      <code className="text-xs bg-muted px-1 rounded">
                                        {issue.problem}
                                      </code>
                                    </div>
                                    <p className="text-sm">{issue.details}</p>
                                    <p className="text-xs text-muted-foreground mt-1 break-all">
                                      {issue.page}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Sample Page Analysis */}
            <div className="grid md:grid-cols-2 gap-4">
              {results.sample_pages.perfect_page && (
                <Card className="border-green-500">
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Perfect Page Example
                    </CardTitle>
                    <CardDescription className="break-all">
                      {results.sample_pages.perfect_page.url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <strong>HTML Lang:</strong>{' '}
                      <code>{results.sample_pages.perfect_page.html_lang}</code>
                    </div>
                    <div>
                      <strong>Canonical:</strong>{' '}
                      <code className="break-all">{results.sample_pages.perfect_page.canonical}</code>
                    </div>
                    <div>
                      <strong>Hreflang Tags ({results.sample_pages.perfect_page.hreflang_tags.length}):</strong>
                      <div className="mt-1 space-y-1">
                        {results.sample_pages.perfect_page.hreflang_tags.slice(0, 5).map((tag: any, idx: number) => (
                          <div key={idx} className="text-xs">
                            <code>{tag.lang}</code> → <span className="text-muted-foreground break-all">{tag.url}</span>
                          </div>
                        ))}
                        {results.sample_pages.perfect_page.hreflang_tags.length > 5 && (
                          <div className="text-xs text-muted-foreground">
                            +{results.sample_pages.perfect_page.hreflang_tags.length - 5} more...
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.sample_pages.problematic_page && (
                <Card className="border-red-500">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Problematic Page Example
                    </CardTitle>
                    <CardDescription className="break-all">
                      {results.sample_pages.problematic_page.url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.sample_pages.problematic_page.issues.map((issue: Issue, idx: number) => (
                        <div key={idx} className="p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                          {getSeverityBadge(issue.severity)}
                          <p className="mt-1">{issue.details}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Launch Checklist */}
            <Card>
              <CardHeader>
                <CardTitle>Launch Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(results.launch_checklist).map(([key, passed]) => (
                    <div 
                      key={key}
                      className={`flex items-center gap-2 p-2 rounded ${
                        passed ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
                      }`}
                    >
                      {passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Audit Timestamp */}
            <p className="text-sm text-muted-foreground text-center">
              Audit completed at: {new Date(results.audit_timestamp).toLocaleString()}
            </p>
          </>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ready to Audit</h2>
              <p className="text-muted-foreground mb-6">
                Click "Run Full Audit" to fetch live production pages and validate SEO configuration.
              </p>
              <Button onClick={runAudit} size="lg">
                <Play className="h-5 w-5 mr-2" />
                Start Production Audit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ProductionAudit;
