import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Download, ChevronDown, ChevronRight, BookOpen, Search, RefreshCw, CheckCircle2, XCircle, FileCheck, Wrench, ExternalLink, Link2, User, MessageSquare, Languages, Globe, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { TranslationSyncTool } from "@/components/admin/TranslationSyncTool";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PhaseTest,
  testPhase1,
  testPhase2,
  testPhase3,
  testPhase4,
  testPhase5,
  testPhase6,
  testPhase7,
  testPhase8,
  testPhase9,
  testPhase10,
  testPhase11,
  testPhase12,
  testPhase13,
  testPhase14,
  testPhase15,
  testPhase16,
  testPhase17,
  testPhase18,
  testPhase19,
  testPhase20,
  testPhase21,
  testPhase22,
  testPhase23,
} from "@/lib/testUtils";

interface ValidationResult {
  id: string;
  slug: string;
  headline: string;
  language: string;
  funnel_stage: string;
  hasMidCTA: boolean;
  hasFAQ: boolean;
  hasSpeakable: boolean;
  hasHreflang: boolean;
  hasCanonical: boolean;
  hasSchema: boolean;
  score: number;
  issues: string[];
}

export default function SystemCheck() {
  // System Tests state
  const [testResults, setTestResults] = useState<PhaseTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([]);

  // Static Page Validation state
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pass' | 'fail'>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  // Bulk fix state
  const [isFixingCanonicals, setIsFixingCanonicals] = useState(false);
  const [isFixingAuthors, setIsFixingAuthors] = useState(false);
  const [isFixingCTAs, setIsFixingCTAs] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');

  const phases = [
    { phase: 1, name: 'Database Schema & Content Model', testFn: testPhase1 },
    { phase: 2, name: 'CMS Dashboard UI', testFn: testPhase2 },
    { phase: 3, name: 'Content Editor - Basic Fields', testFn: testPhase3 },
    { phase: 4, name: 'Content Editor - E-E-A-T & Links', testFn: testPhase4 },
    { phase: 5, name: 'FAQ Builder', testFn: testPhase5 },
    { phase: 6, name: 'Multilingual Translation Manager', testFn: testPhase6 },
    { phase: 7, name: 'Auto JSON-LD Schema Generation', testFn: testPhase7 },
    { phase: 8, name: 'Public Article Display Page', testFn: testPhase8 },
    { phase: 9, name: 'Blog Index with Filters', testFn: testPhase9 },
    { phase: 10, name: 'Chatbot Widget (BOFU)', testFn: testPhase10 },
    { phase: 11, name: 'SEO Meta Tags & Hreflang', testFn: testPhase11 },
    { phase: 12, name: 'Performance Optimization', testFn: testPhase12 },
    { phase: 13, name: 'Final Integration & Deployment', testFn: testPhase13 },
    { phase: 14, name: 'AI Image Generation (FAL.ai)', testFn: testPhase14 },
    { phase: 15, name: 'Diagram Generation (Perplexity)', testFn: testPhase15 },
    { phase: 16, name: 'External Link Finder (Perplexity)', testFn: testPhase16 },
    { phase: 17, name: 'Internal Link Finder (Lovable AI)', testFn: testPhase17 },
    { phase: 18, name: 'AI Tools Dashboard', testFn: testPhase18 },
    { phase: 19, name: 'AI Visibility & Optimization', testFn: testPhase19 },
    { phase: 20, name: 'Citation Enforcement Rules', testFn: testPhase20 },
    { phase: 21, name: 'BOFU Schema & IndexNow', testFn: testPhase21 },
    { phase: 22, name: 'Hreflang Validation', testFn: testPhase22 },
    { phase: 23, name: 'Sitemap Validation', testFn: testPhase23 },
  ];

  // Query for published articles
  const { data: articles, refetch: refetchArticles } = useQuery({
    queryKey: ['published-articles-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, language, funnel_stage, cta_article_ids, qa_entities, speakable_answer, translations, canonical_url, author_id, cluster_id')
        .eq('status', 'published');
      if (error) throw error;
      return data || [];
    }
  });

  // Query for authors
  const { data: authors } = useQuery({
    queryKey: ['authors-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentPhase(0);
    setTestResults([]);
    setExpandedPhases([]);

    const results: PhaseTest[] = [];

    for (let i = 0; i < phases.length; i++) {
      setCurrentPhase(i + 1);
      const phaseTests = await phases[i].testFn();
      
      const overallStatus = phaseTests.some(t => t.status === 'fail') 
        ? 'fail' 
        : phaseTests.some(t => t.status === 'warning')
        ? 'warning'
        : 'pass';

      results.push({
        phase: phases[i].phase,
        phaseName: phases[i].name,
        tests: phaseTests,
        overallStatus
      });

      setTestResults([...results]);
    }

    setIsRunning(false);
    setCurrentPhase(0);
  };

  const runValidation = async () => {
    if (!articles || articles.length === 0) return;
    
    setIsValidating(true);
    setValidationProgress(0);
    setValidationResults([]);

    const results: ValidationResult[] = [];
    const total = articles.length;

    for (let i = 0; i < total; i++) {
      const article = articles[i];
      const issues: string[] = [];

      // Check hasMidCTA - BOFU articles use contact CTA, others need cta_article_ids
      const hasMidCTA = article.funnel_stage === 'BOFU' || 
        (article.cta_article_ids && article.cta_article_ids.length > 0);
      if (!hasMidCTA) issues.push('Missing mid-article CTA configuration');

      // Check hasFAQ
      const qaEntities = article.qa_entities as unknown[];
      const hasFAQ = qaEntities && Array.isArray(qaEntities) && qaEntities.length > 0;
      if (!hasFAQ) issues.push('No FAQ entities');

      // Check hasSpeakable
      const hasSpeakable = !!article.speakable_answer && article.speakable_answer.length > 50;
      if (!hasSpeakable) issues.push('Missing or short speakable answer');

      // Check hasHreflang - needs translations or cluster siblings
      const translations = article.translations as Record<string, string> | null;
      const hasHreflang = (translations && Object.keys(translations).length > 0) || !!article.cluster_id;
      if (!hasHreflang) issues.push('No hreflang/translation links');

      // Check hasCanonical - must have correct www format with language folder
      const correctCanonicalFormat = `https://www.delsolprimehomes.com/${article.language}/blog/${article.slug}`;
      const hasCanonical = article.canonical_url === correctCanonicalFormat;
      if (!hasCanonical) {
        if (!article.canonical_url) {
          issues.push('Missing canonical URL');
        } else {
          issues.push('Incorrect canonical URL format (missing www)');
        }
      }

      // Check hasSchema (needs author for proper schema)
      const hasSchema = !!article.author_id;
      if (!hasSchema) issues.push('Missing author (required for schema)');

      // Calculate score
      const checks = [hasMidCTA, hasFAQ, hasSpeakable, hasHreflang, hasCanonical, hasSchema];
      const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

      results.push({
        id: article.id,
        slug: article.slug,
        headline: article.headline,
        language: article.language,
        funnel_stage: article.funnel_stage || '',
        hasMidCTA,
        hasFAQ,
        hasSpeakable,
        hasHreflang,
        hasCanonical,
        hasSchema,
        score,
        issues
      });

      setValidationProgress(Math.round(((i + 1) / total) * 100));
    }

    setValidationResults(results);
    setIsValidating(false);
  };

  const togglePhase = (phase: number) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPhases: testResults.length,
        passed: testResults.filter(p => p.overallStatus === 'pass').length,
        warnings: testResults.filter(p => p.overallStatus === 'warning').length,
        failed: testResults.filter(p => p.overallStatus === 'fail').length,
        totalTests: testResults.reduce((acc, p) => acc + p.tests.length, 0)
      },
      results: testResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-check-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportValidationResults = () => {
    const csvRows = [
      ['Slug', 'Language', 'Score', 'CTA', 'FAQ', 'Speakable', 'Hreflang', 'Canonical', 'Schema', 'Issues'].join(','),
      ...validationResults.map(r => [
        r.slug,
        r.language,
        r.score,
        r.hasMidCTA ? 'Yes' : 'No',
        r.hasFAQ ? 'Yes' : 'No',
        r.hasSpeakable ? 'Yes' : 'No',
        r.hasHreflang ? 'Yes' : 'No',
        r.hasCanonical ? 'Yes' : 'No',
        r.hasSchema ? 'Yes' : 'No',
        `"${r.issues.join('; ')}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `static-validation-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      case 'running': return '⏳';
      default: return '○';
    }
  };

  // Bulk fix functions
  const fixCanonicalUrls = async () => {
    // Find articles missing canonical OR with incorrect format (non-www)
    const articlesNeedingFix = validationResults.filter(r => !r.hasCanonical);
    if (articlesNeedingFix.length === 0) {
      toast.info('All articles already have correct canonical URLs');
      return;
    }

    setIsFixingCanonicals(true);
    try {
      const updates = articlesNeedingFix.map(article => ({
        id: article.id,
        canonical_url: `https://www.delsolprimehomes.com/${article.language}/blog/${article.slug}`
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('blog_articles')
          .update({ canonical_url: update.canonical_url })
          .eq('id', update.id);
        if (error) throw error;
      }

      toast.success(`Fixed canonical URLs for ${updates.length} articles`);
      await refetchArticles();
      runValidation();
    } catch (error) {
      toast.error('Failed to update canonical URLs');
      console.error(error);
    } finally {
      setIsFixingCanonicals(false);
    }
  };

  const fixAuthors = async () => {
    if (!selectedAuthorId) {
      toast.error('Please select an author first');
      return;
    }

    const articlesNeedingAuthor = validationResults.filter(r => !r.hasSchema);
    if (articlesNeedingAuthor.length === 0) {
      toast.info('All articles already have authors assigned');
      return;
    }

    setIsFixingAuthors(true);
    try {
      const ids = articlesNeedingAuthor.map(a => a.id);
      const { error } = await supabase
        .from('blog_articles')
        .update({ author_id: selectedAuthorId })
        .in('id', ids);

      if (error) throw error;

      toast.success(`Assigned author to ${ids.length} articles`);
      await refetchArticles();
      runValidation();
    } catch (error) {
      toast.error('Failed to assign author');
      console.error(error);
    } finally {
      setIsFixingAuthors(false);
    }
  };

  const fixCTAs = async () => {
    const articlesNeedingCTA = validationResults.filter(r => !r.hasMidCTA);
    if (articlesNeedingCTA.length === 0) {
      toast.info('All articles already have CTAs configured');
      return;
    }

    setIsFixingCTAs(true);
    try {
      // Get all published articles grouped by language and funnel stage for CTA candidates
      const { data: allArticles, error: fetchError } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, language, funnel_stage, category')
        .eq('status', 'published');
      
      if (fetchError) throw fetchError;

      // Group articles by language and funnel stage
      const articlesByLangStage: Record<string, Record<string, typeof allArticles>> = {};
      for (const article of allArticles || []) {
        const lang = article.language;
        const stage = article.funnel_stage;
        if (!articlesByLangStage[lang]) articlesByLangStage[lang] = {};
        if (!articlesByLangStage[lang][stage]) articlesByLangStage[lang][stage] = [];
        articlesByLangStage[lang][stage].push(article);
      }

      let fixedCount = 0;
      for (const article of articlesNeedingCTA) {
        // BOFU articles use contact CTA, not article CTAs
        if (article.funnel_stage === 'BOFU') continue;

        // Determine target stage
        const targetStage = article.funnel_stage === 'TOFU' ? 'MOFU' : 'BOFU';
        
        // Get candidates from same language and target stage
        const candidates = articlesByLangStage[article.language]?.[targetStage] || [];
        
        if (candidates.length === 0) continue;

        // Prefer same category, then fall back to any
        const originalArticle = allArticles?.find(a => a.id === article.id);
        const sameCategory = candidates.filter(c => c.category === originalArticle?.category && c.id !== article.id);
        const otherCategory = candidates.filter(c => c.category !== originalArticle?.category && c.id !== article.id);
        
        // Pick up to 2 CTAs (prefer same category)
        const ctaIds: string[] = [];
        for (const c of [...sameCategory, ...otherCategory]) {
          if (ctaIds.length >= 2) break;
          if (!ctaIds.includes(c.id)) ctaIds.push(c.id);
        }

        if (ctaIds.length > 0) {
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ cta_article_ids: ctaIds })
            .eq('id', article.id);
          
          if (updateError) {
            console.error(`Failed to update CTAs for ${article.slug}:`, updateError);
          } else {
            fixedCount++;
          }
        }
      }

      toast.success(`Set CTAs for ${fixedCount} articles`);
      await refetchArticles();
      runValidation();
    } catch (error) {
      toast.error('Failed to set CTAs');
      console.error(error);
    } finally {
      setIsFixingCTAs(false);
    }
  };

  // Filter validation results
  const filteredResults = validationResults.filter(r => {
    const matchesSearch = r.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.headline.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pass' && r.score === 100) ||
      (filterStatus === 'fail' && r.score < 100);
    const matchesLanguage = filterLanguage === 'all' || r.language === filterLanguage;
    return matchesSearch && matchesStatus && matchesLanguage;
  });

  const uniqueLanguages = [...new Set(validationResults.map(r => r.language))].sort();
  const passingCount = validationResults.filter(r => r.score === 100).length;
  const failingCount = validationResults.filter(r => r.score < 100).length;
  const avgScore = validationResults.length > 0 
    ? Math.round(validationResults.reduce((acc, r) => acc + r.score, 0) / validationResults.length) 
    : 0;

  // Issue counts
  const missingCTA = validationResults.filter(r => !r.hasMidCTA).length;
  const missingFAQ = validationResults.filter(r => !r.hasFAQ).length;
  const missingSpeakable = validationResults.filter(r => !r.hasSpeakable).length;
  const missingHreflang = validationResults.filter(r => !r.hasHreflang).length;
  const missingCanonical = validationResults.filter(r => !r.hasCanonical).length;
  const missingAuthor = validationResults.filter(r => !r.hasSchema).length;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 System Validation Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive testing for all implementation phases and static page validation
          </p>
        </header>

        <Tabs defaultValue="system-tests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="system-tests">System Tests</TabsTrigger>
            <TabsTrigger value="static-validation">
              Static Page Validation
              {articles && <Badge variant="secondary" className="ml-2">{articles.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* System Tests Tab */}
          <TabsContent value="system-tests" className="space-y-6">
            {/* Translation Sync Tool */}
            <div className="mb-8">
              <TranslationSyncTool />
            </div>

            <header className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Automated Tests</h2>
              <p className="text-muted-foreground">
                Run comprehensive validation tests across all system components
              </p>
              
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={runAllTests}
                  disabled={isRunning}
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Play className="mr-2 h-4 w-4 animate-pulse" />
                      Running Tests... (Phase {currentPhase}/19)
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run All Tests
                    </>
                  )}
                </Button>
                
                {testResults.length > 0 && (
                  <Button onClick={exportResults} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Results
                  </Button>
                )}
              </div>
            </header>

            {testResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <Card className="p-6 border-l-4 border-l-green-500">
                  <h3 className="text-3xl font-bold mb-1">
                    {testResults.filter(p => p.overallStatus === 'pass').length}
                  </h3>
                  <p className="text-sm text-muted-foreground">Phases Passed</p>
                </Card>
                <Card className="p-6 border-l-4 border-l-yellow-500">
                  <h3 className="text-3xl font-bold mb-1">
                    {testResults.filter(p => p.overallStatus === 'warning').length}
                  </h3>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </Card>
                <Card className="p-6 border-l-4 border-l-red-500">
                  <h3 className="text-3xl font-bold mb-1">
                    {testResults.filter(p => p.overallStatus === 'fail').length}
                  </h3>
                  <p className="text-sm text-muted-foreground">Failures</p>
                </Card>
                <Card className="p-6 border-l-4 border-l-blue-500">
                  <h3 className="text-3xl font-bold mb-1">
                    {testResults.reduce((acc, p) => acc + p.tests.length, 0)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                </Card>
                <Card className={`p-6 border-l-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 ${
                  testResults.find(p => p.phase === 19)?.overallStatus === 'pass' 
                    ? 'border-l-purple-500' 
                    : 'border-l-orange-500'
                }`}>
                  <h3 className="text-3xl font-bold mb-1 text-purple-900 dark:text-purple-100">
                    {testResults.find(p => p.phase === 19)?.overallStatus === 'pass' ? '✓' : '⚠'}
                  </h3>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Ready</p>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {testResults.map((phase) => (
                <Card 
                  key={phase.phase}
                  className={`overflow-hidden ${
                    phase.phase === 19 
                      ? 'border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20'
                      : phase.overallStatus === 'pass' ? 'border-l-4 border-l-green-500' :
                      phase.overallStatus === 'warning' ? 'border-l-4 border-l-yellow-500' :
                      'border-l-4 border-l-red-500'
                  }`}
                >
                  <div
                    className="p-6 cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() => togglePhase(phase.phase)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStatusIcon(phase.overallStatus)}</span>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {phase.phase === 19 && '🤖 '}
                          Phase {phase.phase}: {phase.phaseName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {phase.tests.filter(t => t.status === 'pass').length} passed, {' '}
                          {phase.tests.filter(t => t.status === 'warning').length} warnings, {' '}
                          {phase.tests.filter(t => t.status === 'fail').length} failed
                        </p>
                      </div>
                    </div>
                    {expandedPhases.includes(phase.phase) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>

                  {expandedPhases.includes(phase.phase) && (
                    <div className="px-6 pb-6 space-y-3 border-t">
                      {phase.phase === 19 && phase.overallStatus !== 'pass' && (
                        <Alert className="mt-4">
                          <BookOpen className="h-4 w-4" />
                          <AlertTitle>Need Help with AEO/SGE Structure?</AlertTitle>
                          <AlertDescription className="flex items-center gap-2">
                            <span>Review the comprehensive guide for proper content formatting.</span>
                            <Button variant="link" className="h-auto p-0" asChild>
                              <Link to="/admin/docs/aeo-sge-guide" target="_blank">
                                View AEO/SGE Guide →
                              </Link>
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="pt-4 space-y-2">
                        {phase.tests.map((test, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg ${
                              test.status === 'pass' ? 'bg-green-50 dark:bg-green-950/30' :
                              test.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/30' :
                              'bg-red-50 dark:bg-red-950/30'
                            }`}
                          >
                            <div className="flex gap-3">
                              <span className="text-xl flex-shrink-0">{getStatusIcon(test.status)}</span>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium mb-1">
                                  {test.name}
                                  {(test.name.includes('Optional') || test.name.includes('⚠')) && (
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">(Optional)</span>
                                  )}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                                {test.details && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                      View Details
                                    </summary>
                                    <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                                      {test.details}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Static Page Validation Tab */}
          <TabsContent value="static-validation" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Static Page Validation</h2>
                <p className="text-muted-foreground">
                  Validate all {articles?.length || 0} published articles for static page requirements
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={runValidation}
                  disabled={isValidating || !articles?.length}
                  size="lg"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Validating... {validationProgress}%
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Run Validation
                    </>
                  )}
                </Button>
                {validationResults.length > 0 && (
                  <Button onClick={exportValidationResults} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>

            {isValidating && (
              <Progress value={validationProgress} className="h-2" />
            )}

            {validationResults.length > 0 && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6 border-l-4 border-l-blue-500">
                    <h3 className="text-3xl font-bold mb-1">{validationResults.length}</h3>
                    <p className="text-sm text-muted-foreground">Total Pages</p>
                  </Card>
                  <Card className="p-6 border-l-4 border-l-green-500">
                    <h3 className="text-3xl font-bold mb-1">{passingCount}</h3>
                    <p className="text-sm text-muted-foreground">Passing (100%)</p>
                  </Card>
                  <Card className="p-6 border-l-4 border-l-red-500">
                    <h3 className="text-3xl font-bold mb-1">{failingCount}</h3>
                    <p className="text-sm text-muted-foreground">Needs Attention</p>
                  </Card>
                  <Card className={`p-6 border-l-4 ${avgScore >= 80 ? 'border-l-green-500' : avgScore >= 60 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                    <h3 className="text-3xl font-bold mb-1">{avgScore}%</h3>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </Card>
                </div>

                {/* Bulk Fix Actions */}
                {failingCount > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Wrench className="h-5 w-5 text-amber-600" />
                      <h3 className="text-lg font-semibold">Bulk Fix Actions</h3>
                    </div>

                    {/* Issue Counts */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                      <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">{missingCTA}</p>
                          <p className="text-xs text-muted-foreground">Missing CTA</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">{missingFAQ}</p>
                          <p className="text-xs text-muted-foreground">Missing FAQ</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">{missingSpeakable}</p>
                          <p className="text-xs text-muted-foreground">Missing Speakable</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                        <Languages className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">{missingHreflang}</p>
                          <p className="text-xs text-muted-foreground">Missing Hreflang</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">{missingCanonical}</p>
                          <p className="text-xs text-muted-foreground">Missing Canonical</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">{missingAuthor}</p>
                          <p className="text-xs text-muted-foreground">Missing Author</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Links to Existing Tools */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">Use Existing Tools</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild disabled={missingFAQ === 0}>
                            <Link to="/admin/faq-generator">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Fix FAQs ({missingFAQ})
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild disabled={missingSpeakable === 0}>
                            <Link to="/admin/bulk-speakable-regeneration">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Fix Speakable ({missingSpeakable})
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild disabled={missingHreflang === 0}>
                            <Link to="/admin/bulk-article-linker">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Fix Hreflang ({missingHreflang})
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Direct Database Fixes */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">Quick Database Fixes</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={fixCanonicalUrls}
                            disabled={isFixingCanonicals || missingCanonical === 0}
                          >
                            {isFixingCanonicals ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Link2 className="h-4 w-4 mr-2" />
                            )}
                            Set Canonical URLs ({missingCanonical})
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={fixCTAs}
                            disabled={isFixingCTAs || missingCTA === 0}
                          >
                            {isFixingCTAs ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4 mr-2" />
                            )}
                            Set CTAs ({missingCTA})
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
                            <SelectTrigger className="w-48 h-9">
                              <SelectValue placeholder="Select author..." />
                            </SelectTrigger>
                            <SelectContent>
                              {authors?.map(author => (
                                <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={fixAuthors}
                            disabled={isFixingAuthors || missingAuthor === 0 || !selectedAuthorId}
                          >
                            {isFixingAuthors ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <User className="h-4 w-4 mr-2" />
                            )}
                            Assign Author ({missingAuthor})
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Filters */}
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by slug or headline..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'pass' | 'fail')}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pass">Passing Only</SelectItem>
                      <SelectItem value="fail">Needs Attention</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {uniqueLanguages.map(lang => (
                        <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredResults.length} of {validationResults.length}
                  </span>
                </div>

                {/* Results Table */}
                <Card>
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Slug</TableHead>
                          <TableHead className="w-16">Lang</TableHead>
                          <TableHead className="w-16 text-center">CTA</TableHead>
                          <TableHead className="w-16 text-center">FAQ</TableHead>
                          <TableHead className="w-16 text-center">Voice</TableHead>
                          <TableHead className="w-16 text-center">Hreflang</TableHead>
                          <TableHead className="w-16 text-center">Canonical</TableHead>
                          <TableHead className="w-16 text-center">Schema</TableHead>
                          <TableHead className="w-20 text-center">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((result) => (
                          <TableRow key={result.id} className={result.score < 100 ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                            <TableCell className="font-mono text-xs">
                              <Link to={`/blog/${result.slug}`} target="_blank" className="hover:underline text-primary">
                                {result.slug}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{result.language.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {result.hasMidCTA ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.hasFAQ ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.hasSpeakable ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.hasHreflang ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.hasCanonical ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.hasSchema ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={result.score === 100 ? 'default' : result.score >= 67 ? 'secondary' : 'destructive'}>
                                {result.score}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </>
            )}

            {validationResults.length === 0 && !isValidating && (
              <Card className="p-12 text-center">
                <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Validation Results</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Run Validation" to check all {articles?.length || 0} published articles
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
