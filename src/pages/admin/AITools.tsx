import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image, BarChart3, Link2, Link, Loader2, Sparkles, Code2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BatchLinkValidator } from "@/components/admin/BatchLinkValidator";
import { CodeFenceCleanup } from "@/components/admin/CodeFenceCleanup";
import { ContentMarkerCleanup } from "@/components/admin/ContentMarkerCleanup";
import { BulkCaptionGenerator } from "@/components/admin/BulkCaptionGenerator";

export default function AITools() {
  const [testingImage, setTestingImage] = useState(false);
  const [testingDiagram, setTestingDiagram] = useState(false);
  const [testingExternalLinks, setTestingExternalLinks] = useState(false);
  const [testingInternalLinks, setTestingInternalLinks] = useState(false);

  const testImageGeneration = async () => {
    setTestingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: "A modern Spanish villa with Mediterranean architecture at sunset",
          aspectRatio: "16:9"
        }
      });

      if (error) throw error;
      
      if (data.imageUrl) {
        toast.success("✓ Image generation working! Image URL received.");
      } else {
        toast.error("Image generation returned no URL");
      }
    } catch (error: any) {
      console.error('Image generation test error:', error);
      toast.error(`Image generation failed: ${error.message}`);
    } finally {
      setTestingImage(false);
    }
  };

  const testDiagramGeneration = async () => {
    setTestingDiagram(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: {
          content: "Buying property in Spain requires several steps: obtaining NIE number, opening bank account, making an offer, signing contracts, and completing the sale.",
          headline: "How to Buy Property in Spain",
          type: "flowchart"
        }
      });

      if (error) throw error;
      
      if (data.mermaidCode) {
        toast.success("✓ Diagram generation working! Mermaid code received.");
      } else {
        toast.error("Diagram generation returned no code");
      }
    } catch (error: any) {
      console.error('Diagram generation test error:', error);
      toast.error(`Diagram generation failed: ${error.message}`);
    } finally {
      setTestingDiagram(false);
    }
  };

  const testExternalLinkFinder = async () => {
    setTestingExternalLinks(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-external-links', {
        body: {
          content: "When buying property in Spain, non-residents need to obtain a NIE number from Spanish authorities. The process involves submitting documents to the Spanish consulate.",
          headline: "Guide to Buying Property in Spain as a Non-Resident",
          language: "es"
        }
      });

      if (error) throw error;
      
      if (data.citations && data.citations.length > 0) {
        toast.success(`✓ External link finder working! Found ${data.citations.length} sources.`);
      } else {
        toast.info("External link finder working but found no sources for test query");
      }
    } catch (error: any) {
      console.error('External link finder test error:', error);
      toast.error(`External link finder failed: ${error.message}`);
    } finally {
      setTestingExternalLinks(false);
    }
  };

  const testInternalLinkFinder = async () => {
    setTestingInternalLinks(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-internal-links', {
        body: {
          content: "Buying property in Spain requires careful planning. You'll need to understand the legal requirements, obtain proper documentation, and work with qualified professionals.",
          headline: "Complete Guide to Property Purchase in Spain",
          currentArticleId: "test",
          language: "en"
        }
      });

      if (error) throw error;
      
      if (data.links && data.links.length > 0) {
        toast.success(`✓ Internal link finder working! Found ${data.links.length} relevant articles.`);
      } else {
        toast.info("Internal link finder working but found no relevant articles (you may need more published articles)");
      }
    } catch (error: any) {
      console.error('Internal link finder test error:', error);
      toast.error(`Internal link finder failed: ${error.message}`);
    } finally {
      setTestingInternalLinks(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Content Tools
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and test AI-powered content generation tools
            </p>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            All AI services are configured via Lovable Cloud. API keys are securely managed through backend secrets.
          </AlertDescription>
        </Alert>

        {/* Tools Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Image Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                Image Generation
              </CardTitle>
              <CardDescription>FAL.ai - High-quality image generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">flux-dev</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Time</span>
                  <span className="font-medium">~8 seconds</span>
                </div>
              </div>
              <Button 
                onClick={testImageGeneration} 
                disabled={testingImage}
                className="w-full"
                variant="secondary"
              >
                {testingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Image Generator"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Diagram Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Diagram Generation
              </CardTitle>
              <CardDescription>Perplexity AI - Smart diagram creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">llama-3.1-sonar-small</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Types</span>
                  <span className="font-medium">Flowchart, Timeline, Comparison</span>
                </div>
              </div>
              <Button 
                onClick={testDiagramGeneration} 
                disabled={testingDiagram}
                className="w-full"
                variant="secondary"
              >
                {testingDiagram ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Diagram Generator"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* External Link Finder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                External Link Finder
              </CardTitle>
              <CardDescription>Perplexity AI - Authoritative source discovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">llama-3.1-sonar-large</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Focus</span>
                  <span className="font-medium">Gov & Official Sources</span>
                </div>
              </div>
              <Button 
                onClick={testExternalLinkFinder} 
                disabled={testingExternalLinks}
                className="w-full"
                variant="secondary"
              >
                {testingExternalLinks ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Link Finder"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Internal Link Finder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-primary" />
                Internal Link Finder
              </CardTitle>
              <CardDescription>Lovable AI - Content relevance analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">gemini-2.5-flash</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Strategy</span>
                  <span className="font-medium">Funnel-aware linking</span>
                </div>
              </div>
              <Button 
                onClick={testInternalLinkFinder} 
                disabled={testingInternalLinks}
                className="w-full"
                variant="secondary"
              >
                {testingInternalLinks ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Link Finder"
                )}
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Cost Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>API Services Overview</CardTitle>
            <CardDescription>
              Cost tracking requires additional implementation. Currently showing service capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Image Generation</TableCell>
                  <TableCell>FAL.ai</TableCell>
                  <TableCell>flux-dev</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Diagram Generation</TableCell>
                  <TableCell>Perplexity</TableCell>
                  <TableCell>llama-3.1-sonar-small-128k-online</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">External Link Search</TableCell>
                  <TableCell>Perplexity</TableCell>
                  <TableCell>llama-3.1-sonar-large-128k-online</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Internal Link Analysis</TableCell>
                  <TableCell>Lovable AI</TableCell>
                  <TableCell>google/gemini-2.5-flash</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* API Management Info */}
        <Card>
          <CardHeader>
            <CardTitle>API Key Management</CardTitle>
            <CardDescription>
              API keys are securely managed through Lovable Cloud backend secrets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Secure Configuration:</strong> All API keys are stored as encrypted secrets in your backend and are never exposed to the frontend. To update API keys, contact your system administrator or use the backend secrets management interface.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">FAL_KEY</p>
                  <p className="text-sm text-muted-foreground">FAL.ai API Key</p>
                </div>
                <Badge>Configured</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">PERPLEXITY_API_KEY</p>
                  <p className="text-sm text-muted-foreground">Perplexity AI API Key</p>
                </div>
                <Badge>Configured</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">LOVABLE_API_KEY</p>
                  <p className="text-sm text-muted-foreground">Lovable AI Gateway Key (Auto-configured)</p>
                </div>
                <Badge>Configured</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Caption Generation */}
        <BulkCaptionGenerator />

        {/* Batch Link Validation */}
        <BatchLinkValidator />

        {/* Content Marker Cleanup */}
        <Card className="border-2 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Content Marker Cleanup
            </CardTitle>
            <CardDescription>
              Intelligently replace citation markers and internal link placeholders using AI with backup and rollback support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentMarkerCleanup />
          </CardContent>
        </Card>

        {/* Code Fence Cleanup */}
        <Card className="border-2 border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Bulk Code Fence Cleanup
            </CardTitle>
            <CardDescription>
              Remove accidental ```html prefixes from article content with backup and rollback support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeFenceCleanup />
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
