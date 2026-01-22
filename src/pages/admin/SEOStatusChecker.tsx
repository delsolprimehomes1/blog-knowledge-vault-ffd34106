import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SEOStatusResult {
  path: string;
  expectedStatus: number;
  checks: {
    recordExists: boolean;
    isPublished: boolean;
    languageMatch: boolean;
    hasContent: boolean;
    inGoneUrls: boolean;
    canonicalUrl: string | null;
    actualLanguage: string | null;
  };
  wreckingBallReason: string | null;
  shouldBeInSitemap: boolean;
  contentType: string | null;
  slug: string | null;
}

const SEOStatusChecker = () => {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SEOStatusResult | null>(null);
  const [liveStatus, setLiveStatus] = useState<{ status: number; headers: Record<string, string> } | null>(null);
  const { toast } = useToast();

  const checkStatus = async () => {
    if (!path.trim()) {
      toast({
        title: "Error",
        description: "Please enter a path to check",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setLiveStatus(null);

    try {
      // Call the seo-status-check edge function
      const { data, error } = await supabase.functions.invoke("seo-status-check", {
        body: null,
        headers: {},
      });

      // Actually call with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seo-status-check?path=${encodeURIComponent(path.startsWith('/') ? path : '/' + path)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Edge function returned ${response.status}`);
      }

      const resultData = await response.json();
      setResult(resultData);

      // Also test the live serve-seo-page endpoint
      try {
        const normalizedPath = path.startsWith('/') ? path : '/' + path;
        const liveResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-seo-page?path=${encodeURIComponent(normalizedPath)}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );

        const headers: Record<string, string> = {};
        liveResponse.headers.forEach((value, key) => {
          headers[key] = value;
        });

        setLiveStatus({
          status: liveResponse.status,
          headers,
        });
      } catch (liveErr) {
        console.error('Live check failed:', liveErr);
      }

    } catch (err: any) {
      console.error('SEO status check failed:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to check SEO status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    if (status === 200) {
      return <Badge className="bg-green-500">200 OK</Badge>;
    } else if (status === 410) {
      return <Badge className="bg-red-500">410 Gone</Badge>;
    } else if (status === 404) {
      return <Badge className="bg-orange-500">404 Not Found</Badge>;
    } else if (status === 400) {
      return <Badge className="bg-yellow-500">400 Bad Request</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const CheckItem = ({ label, value, positive = true }: { label: string; value: boolean; positive?: boolean }) => {
    const isGood = positive ? value : !value;
    return (
      <div className="flex items-center gap-2">
        {isGood ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className={isGood ? "text-green-700" : "text-red-700"}>{label}</span>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SEO Status Checker</h1>
          <p className="text-muted-foreground">
            Verify 410 logic and database checks for any URL path
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Check URL Path</CardTitle>
            <CardDescription>
              Enter a path like /en/blog/my-article or /de/qa/my-question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="/en/blog/example-article"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkStatus()}
                className="flex-1"
              />
              <Button onClick={checkStatus} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Check Status
              </Button>
            </div>

            {/* Quick Examples */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Quick tests:</span>
              {[
                "/en/blog/fake-page-12345",
                "/en/qa/test-question",
                "/de/locations/marbella/buying-guide",
              ].map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => setPath(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Expected Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">HTTP Status:</span>
                  {getStatusBadge(result.expectedStatus)}
                </div>

                {result.wreckingBallReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">X-Wrecking-Ball</Badge>
                      <code className="text-sm">{result.wreckingBallReason}</code>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-sm font-medium">Content Type:</span>
                  <Badge variant="outline" className="ml-2">
                    {result.contentType || "Unknown"}
                  </Badge>
                </div>

                {result.slug && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Slug:</span>
                    <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">
                      {result.slug}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Checks */}
            <Card>
              <CardHeader>
                <CardTitle>Database Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CheckItem label="Record exists in database" value={result.checks.recordExists} />
                <CheckItem label="Status = published" value={result.checks.isPublished} />
                <CheckItem 
                  label={`Language match (URL: ${path.split('/')[1]} = DB: ${result.checks.actualLanguage || 'N/A'})`} 
                  value={result.checks.languageMatch} 
                />
                <CheckItem label="Has content (not empty)" value={result.checks.hasContent} />
                <CheckItem label="In gone_urls table" value={result.checks.inGoneUrls} positive={false} />

                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    {result.shouldBeInSitemap ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {result.shouldBeInSitemap ? "Should be in sitemap" : "Should NOT be in sitemap"}
                    </span>
                  </div>
                </div>

                {result.checks.canonicalUrl && (
                  <div className="pt-3">
                    <span className="text-sm font-medium">Canonical URL:</span>
                    <a 
                      href={result.checks.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                    >
                      {result.checks.canonicalUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Response */}
            {liveStatus && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Live Edge Function Response</CardTitle>
                  <CardDescription>
                    Actual response from serve-seo-page edge function
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-medium">Actual HTTP Status:</span>
                    {getStatusBadge(liveStatus.status)}
                    {liveStatus.status === result.expectedStatus ? (
                      <Badge className="bg-green-500">✓ Matches expected</Badge>
                    ) : (
                      <Badge variant="destructive">✗ Does not match expected</Badge>
                    )}
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Response Headers:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(liveStatus.headers)
                        .filter(([key]) => 
                          key.toLowerCase().includes('wrecking') ||
                          key.toLowerCase().includes('seo') ||
                          key.toLowerCase().includes('robots') ||
                          key.toLowerCase().includes('content-type') ||
                          key.toLowerCase().includes('cache')
                        )
                        .map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-mono text-muted-foreground">{key}:</span>
                            <span className="font-mono">{value}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SEOStatusChecker;
