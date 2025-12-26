import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Globe, 
  RefreshCw, 
  CheckCircle2,
  MapPin,
  HelpCircle,
  Scale,
  BookOpen,
  Download,
  FolderDown,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";

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
  files_generated?: number;
  file_list?: string[];
}

interface SitemapResponse {
  success: boolean;
  message: string;
  data: SitemapData;
  xml_files?: Record<string, string>;
}

export function SitemapRegenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sitemapData, setSitemapData] = useState<SitemapData | null>(null);
  const [triggerSource, setTriggerSource] = useState<"manual" | "publish">("manual");

  const regenerateSitemaps = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<SitemapResponse>('regenerate-sitemap', {
        body: { trigger_source: triggerSource, download_xml: false }
      });

      if (error) throw error;
      if (data?.data) {
        setSitemapData(data.data);
        toast.success(`Sitemaps regenerated: ${data.data.total_urls.toLocaleString()} URLs`);
      }
    } catch (error) {
      console.error("Sitemap regeneration error:", error);
      toast.error("Failed to regenerate sitemaps");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAllSitemaps = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke<SitemapResponse>('regenerate-sitemap', {
        body: { trigger_source: 'manual', download_xml: true }
      });

      if (error) throw error;
      if (!data?.xml_files) {
        throw new Error('No XML files returned');
      }

      // Create ZIP file
      const zip = new JSZip();
      
      Object.entries(data.xml_files).forEach(([path, content]) => {
        zip.file(path, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sitemaps-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSitemapData(data.data);
      toast.success(`Downloaded ${Object.keys(data.xml_files).length} sitemap files`);
    } catch (error) {
      console.error("Sitemap download error:", error);
      toast.error("Failed to download sitemaps");
    } finally {
      setIsDownloading(false);
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

  // Static pages count (homepage, guide, about, brochures, glossary)
  const staticPagesCount = 1 + 1 + 1 + 10 + 11; // homepage + guide + about + 10 brochures + glossary main + 10 terms

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sitemap Regeneration</h2>
          <p className="text-muted-foreground">
            Regenerate XML sitemaps with all {sitemapData?.total_urls?.toLocaleString() || '1,099+'} pages
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
            + IndexNow Ping
          </Button>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Regenerate Sitemaps
            </CardTitle>
            <CardDescription>
              Scan database and regenerate all sitemap data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={regenerateSitemaps} 
              disabled={isLoading || isDownloading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderDown className="h-5 w-5 text-primary" />
              Download All XML Files
            </CardTitle>
            <CardDescription>
              Generate and download complete sitemap package (.zip)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={downloadAllSitemaps} 
              disabled={isLoading || isDownloading}
              size="lg"
              variant="default"
              className="w-full"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating ZIP...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {sitemapData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total URLs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-600">{sitemapData.total_urls.toLocaleString()}</span>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Dynamic Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{totalContent.toLocaleString()}</span>
                <p className="text-xs text-muted-foreground mt-1">Blog + QA + Compare + Location</p>
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
                  Files Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold">{sitemapData.files_generated || sitemapData.file_list?.length || '—'}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(sitemapData.generated_at).toLocaleString()}
                </p>
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
                
                {/* Static pages */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Static Pages</span>
                      <Badge variant="secondary" className="text-xs">
                        Brochures + Glossary
                      </Badge>
                    </div>
                    <span className="font-bold">{staticPagesCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File List */}
          {sitemapData.file_list && sitemapData.file_list.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generated Sitemap Files</CardTitle>
                <CardDescription>
                  {sitemapData.file_list.length} files ready for deployment to public/
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                  {sitemapData.file_list.map(file => (
                    <div key={file} className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span className="truncate">{file}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Deployment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>After downloading the ZIP file:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Extract the ZIP contents</li>
                <li>Copy all files to your <code className="bg-muted px-1 rounded">public/</code> folder</li>
                <li>Commit and deploy the changes</li>
                <li>Verify in Google Search Console that all URLs are indexed</li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!sitemapData && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Generate Sitemaps</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Click "Regenerate" to scan the database, or "Download ZIP" to get all XML files ready for deployment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
