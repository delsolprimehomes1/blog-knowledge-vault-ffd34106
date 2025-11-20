import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Download, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { TranslationSyncTool } from "@/components/admin/TranslationSyncTool";
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
} from "@/lib/testUtils";

export default function SystemCheck() {
  const [testResults, setTestResults] = useState<PhaseTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<number[]>([]);

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
  ];

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      case 'running': return '⏳';
      default: return '○';
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 System Validation Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive testing for all 19 implementation phases
          </p>
        </header>

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
      </div>
    </AdminLayout>
  );
}
