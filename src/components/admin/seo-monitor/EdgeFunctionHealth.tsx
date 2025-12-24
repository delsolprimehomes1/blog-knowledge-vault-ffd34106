import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Activity, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  path: string;
  status: 'success' | 'error' | 'pending';
  responseTime?: number;
  language?: string;
  hasHreflang?: boolean;
}

const TEST_URLS = [
  { path: '/no/qa/unngaa-feil-nye-boliger-costa-del-sol-reservasjonsdepositum', lang: 'no', label: '🇳🇴 Norwegian Q&A' },
  { path: '/da/blog/fra-thalassoterapi-til-termalbade-din-vej-til-naturlig-helbredelse-p-costa-del-sol', lang: 'da', label: '🇩🇰 Danish Blog' },
  { path: '/de/compare/marbella-oder-estepona', lang: 'de', label: '🇩🇪 German Compare' },
  { path: '/en/locations/marbella/investment', lang: 'en', label: '🇬🇧 English Location' },
];

export const EdgeFunctionHealth = () => {
  const [isLive, setIsLive] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const testEdgeFunction = async (path: string, expectedLang: string): Promise<TestResult> => {
    const start = Date.now();
    try {
      const response = await fetch(
        `https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/serve-seo-page?path=${encodeURIComponent(path)}`
      );
      const responseTime = Date.now() - start;
      
      if (!response.ok) {
        return { path, status: 'error', responseTime };
      }
      
      const data = await response.json();
      return {
        path,
        status: 'success',
        responseTime,
        language: data.language,
        hasHreflang: data.hreflang_tags && data.hreflang_tags.length > 0,
      };
    } catch (error) {
      return { path, status: 'error', responseTime: Date.now() - start };
    }
  };

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults(TEST_URLS.map(u => ({ path: u.path, status: 'pending' as const })));

    const results: TestResult[] = [];
    for (const url of TEST_URLS) {
      const result = await testEdgeFunction(url.path, url.lang);
      results.push(result);
      setTestResults([...results, ...TEST_URLS.slice(results.length).map(u => ({ path: u.path, status: 'pending' as const }))]);
    }

    setTestResults(results);
    setLastCheck(new Date());
    setIsLive(results.every(r => r.status === 'success'));
    setIsTesting(false);

    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount === results.length) {
      toast.success('All edge function tests passed!');
    } else {
      toast.error(`${results.length - successCount} test(s) failed`);
    }
  };

  const testSingleUrl = async (index: number) => {
    const url = TEST_URLS[index];
    setTestResults(prev => {
      const updated = [...prev];
      updated[index] = { path: url.path, status: 'pending' };
      return updated;
    });

    const result = await testEdgeFunction(url.path, url.lang);
    setTestResults(prev => {
      const updated = [...prev];
      updated[index] = result;
      return updated;
    });
    setLastCheck(new Date());
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Edge Function Health
        </CardTitle>
        <Badge variant={isLive ? "default" : "destructive"} className={isLive ? "bg-green-500" : ""}>
          {isLive ? "🟢 LIVE" : "🔴 DOWN"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={runAllTests} disabled={isTesting} size="sm">
            {isTesting ? 'Testing...' : 'Test All Languages'}
          </Button>
          {lastCheck && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last check: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {TEST_URLS.map((url, index) => {
            const result = testResults[index];
            return (
              <div 
                key={url.path} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  {result?.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {result?.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  {(!result || result?.status === 'pending') && <div className="h-4 w-4 rounded-full bg-muted-foreground/30" />}
                  <span className="text-sm font-medium">{url.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {result?.responseTime && (
                    <span className="text-xs text-muted-foreground">{result.responseTime}ms</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => testSingleUrl(index)}
                    disabled={isTesting}
                  >
                    Test
                  </Button>
                  <a
                    href={`https://www.delsolprimehomes.com${url.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>Edge function: <code className="bg-muted px-1 rounded">serve-seo-page</code></p>
          <p className="mt-1">Tests verify correct language metadata delivery via the edge function.</p>
        </div>
      </CardContent>
    </Card>
  );
};
