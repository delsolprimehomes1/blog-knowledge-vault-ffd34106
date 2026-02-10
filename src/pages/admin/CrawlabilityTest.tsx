import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Code, Loader2 } from "lucide-react";

interface CrawlResult {
  statusCode: number;
  finalUrl: string;
  checks: {
    title: { present: boolean; value: string | null };
    metaDescription: { present: boolean; value: string | null };
    ogTitle: { present: boolean; value: string | null };
    ogDescription: { present: boolean; value: string | null };
    h1: { present: boolean; values: string[]; count: number };
    canonical: { present: boolean; value: string | null };
    robots: { present: boolean; value: string | null; isNoindex: boolean };
    wordCount: number;
    jsonLd: { present: boolean };
  };
  htmlLength: number;
  rawHtml: string;
}

const SAMPLE_PATHS = [
  "/en/qa/what-are-property-taxes-in-spain",
  "/nl/qa/wat-zijn-de-onroerendgoedbelastingen-in-spanje",
  "/en/qa/how-to-buy-property-in-spain",
  "/de/qa/wie-kaufe-ich-eine-immobilie-in-spanien",
];

const StatusIcon = ({ ok }: { ok: boolean }) =>
  ok ? (
    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
  ) : (
    <XCircle className="h-5 w-5 text-destructive shrink-0" />
  );

const WordCountBadge = ({ count }: { count: number }) => {
  if (count >= 300)
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">{count} words</Badge>;
  if (count >= 100)
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">{count} words</Badge>;
  return <Badge variant="destructive">{count} words — thin content</Badge>;
};

export default function CrawlabilityTest() {
  const [url, setUrl] = useState("https://www.delsolprimehomes.com/");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  const runTest = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("crawlability-test", {
        body: { url },
      });
      if (error) throw error;
      setResult(data as CrawlResult);
      toast.success(`Fetched ${data.statusCode} — ${data.checks.wordCount} words`);
    } catch (err: any) {
      toast.error(err.message || "Failed to test URL");
    } finally {
      setLoading(false);
    }
  };

  const quickTest = (path: string) => {
    setUrl(`https://www.delsolprimehomes.com${path}`);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Crawlability Test</h1>
          <p className="text-muted-foreground">
            Fetch any page as Googlebot sees it (raw HTML, no JavaScript) and verify SEO elements.
          </p>
        </div>

        {/* URL Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test URL</CardTitle>
            <CardDescription>Enter a URL to check what Googlebot will see</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.delsolprimehomes.com/en/qa/..."
                onKeyDown={(e) => e.key === "Enter" && runTest()}
              />
              <Button onClick={runTest} disabled={loading} className="shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Test
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Quick test:</span>
              {SAMPLE_PATHS.map((path) => (
                <Button key={path} variant="outline" size="sm" className="text-xs h-7" onClick={() => quickTest(path)}>
                  {path.split("/").pop()}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={result.statusCode === 200 ? "default" : "destructive"}>
                    HTTP {result.statusCode}
                  </Badge>
                  <WordCountBadge count={result.checks.wordCount} />
                </div>
              </div>
              {result.finalUrl !== url && (
                <CardDescription className="text-xs">
                  Redirected to: {result.finalUrl}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Meta Title */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <StatusIcon ok={result.checks.title.present} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">Meta Title</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.checks.title.value || "Not found"}
                  </p>
                </div>
              </div>

              {/* Meta Description */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <StatusIcon ok={result.checks.metaDescription.present} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">Meta Description</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.checks.metaDescription.value || "Not found"}
                  </p>
                </div>
              </div>

              {/* H1 */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <StatusIcon ok={result.checks.h1.present} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    H1 Tag{result.checks.h1.count > 1 ? ` (${result.checks.h1.count} found)` : ""}
                  </p>
                  {result.checks.h1.values.map((h, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">{h}</p>
                  ))}
                  {!result.checks.h1.present && (
                    <p className="text-xs text-muted-foreground">Not found</p>
                  )}
                </div>
              </div>

              {/* Robots */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {result.checks.robots.isNoindex ? (
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">Robots Directive</p>
                  <p className="text-xs text-muted-foreground">
                    {result.checks.robots.value || "Not set (defaults to index, follow)"}
                  </p>
                </div>
              </div>

              {/* Canonical */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <StatusIcon ok={result.checks.canonical.present} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">Canonical URL</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.checks.canonical.value || "Not found"}
                  </p>
                </div>
              </div>

              {/* OG Tags */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <StatusIcon ok={result.checks.ogTitle.present} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">Open Graph Tags</p>
                  <p className="text-xs text-muted-foreground truncate">
                    og:title: {result.checks.ogTitle.value || "Missing"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    og:description: {result.checks.ogDescription.value || "Missing"}
                  </p>
                </div>
              </div>

              {/* JSON-LD */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <StatusIcon ok={result.checks.jsonLd.present} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">JSON-LD Schema</p>
                  <p className="text-xs text-muted-foreground">
                    {result.checks.jsonLd.present ? "Present" : "Not found"}
                  </p>
                </div>
              </div>

              {/* Word Count Summary */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {result.checks.wordCount >= 300 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : result.checks.wordCount >= 100 ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">Visible Text</p>
                  <p className="text-xs text-muted-foreground">
                    {result.checks.wordCount} words · {result.htmlLength.toLocaleString()} chars HTML
                  </p>
                </div>
              </div>

              {/* Raw HTML Viewer */}
              <Collapsible open={showHtml} onOpenChange={setShowHtml}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      View Raw HTML Source
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showHtml ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap break-all font-mono">
                    {result.rawHtml}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
