import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Globe, 
  RefreshCw, 
  CheckCircle2,
  MapPin,
  HelpCircle,
  Scale,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SitemapData {
  generated_at: string;
  trigger_source: string;
  total_urls: number;
  languages_with_content: string[];
  content_counts: {
    blog: number;
    qa: number;
    locations: number;
    comparisons: number;
  };
}

interface SitemapResponse {
  success: boolean;
  message: string;
  data: SitemapData;
}

export function SitemapRegenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [sitemapData, setSitemapData] = useState<SitemapData | null>(null);
  const [triggerSource, setTriggerSource] = useState<"manual" | "publish">("manual");

  const regenerateSitemaps = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<SitemapResponse>('regenerate-sitemap', {
        body: { trigger_source: triggerSource }
      });

      if (error) throw error;
      if (data?.data) {
        setSitemapData(data.data);
        toast.success("Sitemaps regenerated successfully");
      }
    } catch (error) {
      console.error("Sitemap regeneration error:", error);
      toast.error("Failed to regenerate sitemaps");
    } finally {
      setIsLoading(false);
    }
  };

  const contentTypeConfig = [
    { 
      key: "blog" as const, 
      label: "Blog Articles", 
      icon: BookOpen, 
      priority: "1.0",
      color: "bg-blue-500" 
    },
    { 
      key: "locations" as const, 
      label: "Location Pages", 
      icon: MapPin, 
      priority: "0.9",
      color: "bg-green-500" 
    },
    { 
      key: "comparisons" as const, 
      label: "Comparisons", 
      icon: Scale, 
      priority: "0.9",
      color: "bg-purple-500" 
    },
    { 
      key: "qa" as const, 
      label: "Q&A Pages", 
      icon: HelpCircle, 
      priority: "0.7",
      color: "bg-orange-500" 
    },
  ];

  const totalContent = sitemapData 
    ? Object.values(sitemapData.content_counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sitemap Regeneration</h2>
          <p className="text-muted-foreground">
            Regenerate XML sitemaps with updated content and correct priorities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={triggerSource === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setTriggerSource("manual")}
          >
            Manual
          </Button>
          <Button
            variant={triggerSource === "publish" ? "default" : "outline"}
            size="sm"
            onClick={() => setTriggerSource("publish")}
          >
            Simulate Publish
          </Button>
        </div>
      </div>

      {/* Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Regenerate All Sitemaps
          </CardTitle>
          <CardDescription>
            Updates sitemap index and language-specific sitemaps with current published content.
            {triggerSource === "publish" && " Will also ping IndexNow."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={regenerateSitemaps} 
            disabled={isLoading}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Sitemaps
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {sitemapData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total URLs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{sitemapData.total_urls.toLocaleString()}</span>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{sitemapData.languages_with_content.length}</span>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {sitemapData.languages_with_content.map(lang => (
                    <Badge key={lang} variant="outline" className="text-xs">
                      {lang.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Generated At
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-lg font-medium">
                  {new Date(sitemapData.generated_at).toLocaleString()}
                </span>
                <div className="mt-1">
                  <Badge variant="secondary">{sitemapData.trigger_source}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Content Type Breakdown</CardTitle>
              <CardDescription>
                URLs by content type with sitemap priorities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentTypeConfig.map(({ key, label, icon: Icon, priority, color }) => {
                  const count = sitemapData.content_counts[key];
                  const percentage = totalContent > 0 ? (count / totalContent) * 100 : 0;
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{label}</span>
                          <Badge variant="outline" className="text-xs">
                            Priority: {priority}
                          </Badge>
                        </div>
                        <span className="font-bold">{count.toLocaleString()}</span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${color} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sitemap Priority Values (Master Playbook)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">1.0</div>
                  <div className="text-sm text-muted-foreground">Blog Articles</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">0.9</div>
                  <div className="text-sm text-muted-foreground">Location Pages</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">0.9</div>
                  <div className="text-sm text-muted-foreground">Comparisons</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">0.7</div>
                  <div className="text-sm text-muted-foreground">Q&A Pages</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!sitemapData && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Recent Sitemap Data</h3>
            <p className="text-muted-foreground text-center mb-4">
              Click the button above to regenerate sitemaps and see content statistics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
