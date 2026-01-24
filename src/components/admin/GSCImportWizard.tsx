import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Ban,
  Link2,
  FileWarning,
  Server,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// GSC Issue Types mapping
const GSC_ISSUE_CATEGORIES = {
  "not found (404)": "404",
  "page with redirect": "redirect",
  "alternate page with proper canonical tag": "canonical",
  "duplicate without user-selected canonical": "duplicate",
  "soft 404": "soft_404",
  "server error (5xx)": "server_error",
  "blocked by robots.txt": "blocked",
  "crawled - currently not indexed": "not_indexed",
  "discovered - currently not indexed": "discovered",
} as const;

type IssueCategory = typeof GSC_ISSUE_CATEGORIES[keyof typeof GSC_ISSUE_CATEGORIES] | "unknown";

interface ParsedUrl {
  url: string;
  path: string;
  issueType: IssueCategory;
  issueLabel: string;
  recommendation: "add_410" | "fix_content" | "check_canonical" | "ignore" | "review";
  existsInDb: boolean | null;
  hasContent: boolean | null;
  contentType: string | null;
  language: string | null;
}

interface CategorySummary {
  category: IssueCategory;
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  selected: boolean;
}

export function GSCImportWizard() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"upload" | "analyze" | "preview" | "processing" | "complete">("upload");
  const [csvContent, setCsvContent] = useState("");
  const [parsedUrls, setParsedUrls] = useState<ParsedUrl[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<IssueCategory>>(new Set(["404", "soft_404", "server_error"]));
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ added: number; skipped: number; errors: number }>({ added: 0, skipped: 0, errors: 0 });

  // Parse CSV and extract URLs with issue types
  const parseGSCCsv = (content: string): { url: string; issueType: IssueCategory; issueLabel: string }[] => {
    const lines = content.split("\n").filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detect header row and find column indices
    const headerRow = lines[0].toLowerCase();
    const headers = headerRow.split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    
    const urlColIndex = headers.findIndex(h => 
      h === "url" || h === "page" || h.includes("page url")
    );
    const issueColIndex = headers.findIndex(h => 
      h.includes("issue") || h.includes("status") || h.includes("reason") || h.includes("type")
    );

    const results: { url: string; issueType: IssueCategory; issueLabel: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line (handle quoted fields)
      const parts = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g)?.map(p => 
        p.replace(/^,/, "").replace(/^["']|["']$/g, "").replace(/""/g, '"').trim()
      ) || line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));

      const url = parts[urlColIndex >= 0 ? urlColIndex : 0] || "";
      const issueLabel = parts[issueColIndex >= 0 ? issueColIndex : 1] || "";
      
      // Determine issue type from label
      let issueType: IssueCategory = "unknown";
      const lowerIssue = issueLabel.toLowerCase();
      
      for (const [pattern, category] of Object.entries(GSC_ISSUE_CATEGORIES)) {
        if (lowerIssue.includes(pattern)) {
          issueType = category;
          break;
        }
      }

      // Handle case where no issue column - assume 404 if from GSC 404 export
      if (issueType === "unknown" && url && !issueLabel) {
        issueType = "404";
      }

      if (url) {
        results.push({ url, issueType, issueLabel: issueLabel || "Not found (404)" });
      }
    }

    return results;
  };

  // Extract path from URL
  const extractPath = (url: string): string => {
    if (url.startsWith("/")) return url;
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url.startsWith("/") ? url : `/${url}`;
    }
  };

  // Analyze URLs against database
  const analyzeUrls = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV content first");
      return;
    }

    setIsAnalyzing(true);
    setStep("analyze");

    try {
      const rawUrls = parseGSCCsv(csvContent);
      
      if (rawUrls.length === 0) {
        toast.error("No valid URLs found in CSV");
        setStep("upload");
        return;
      }

      // Extract paths
      const urlsWithPaths = rawUrls.map(u => ({
        ...u,
        path: extractPath(u.url)
      }));

      // Batch check against database
      const paths = urlsWithPaths.map(u => u.path);
      const uniquePaths = [...new Set(paths)];

      // Check blog_articles
      const { data: blogMatches } = await supabase
        .from("blog_articles")
        .select("slug, language, status, detailed_content")
        .in("slug", uniquePaths.map(p => p.split("/").pop() || ""));

      // Check qa_pages (uses answer_main)
      const { data: qaMatches } = await supabase
        .from("qa_pages")
        .select("slug, language, status, answer_main")
        .in("slug", uniquePaths.map(p => p.split("/").pop() || ""));

      // Check comparison_pages (uses final_verdict)
      const { data: compMatches } = await supabase
        .from("comparison_pages")
        .select("slug, language, status, final_verdict")
        .in("slug", uniquePaths.map(p => p.split("/").pop() || ""));

      // Check location_pages (uses location_overview or final_summary)
      const { data: locMatches } = await supabase
        .from("location_pages")
        .select("topic_slug, language, status, location_overview, final_summary")
        .in("topic_slug", uniquePaths.map(p => p.split("/").pop() || ""));

      // Check existing gone_urls
      const { data: goneMatches } = await supabase
        .from("gone_urls")
        .select("url_path")
        .in("url_path", uniquePaths);

      const goneSet = new Set(goneMatches?.map(g => g.url_path) || []);

      // Build lookup maps
      const blogMap = new Map((blogMatches || []).map(b => [b.slug, b]));
      const qaMap = new Map((qaMatches || []).map(q => [q.slug, q]));
      const compMap = new Map((compMatches || []).map(c => [c.slug, c]));
      const locMap = new Map((locMatches || []).map(l => [l.topic_slug, l]));

      // Analyze each URL
      const analyzed: ParsedUrl[] = urlsWithPaths.map(u => {
        const slug = u.path.split("/").pop() || "";
        const pathParts = u.path.split("/").filter(Boolean);
        const lang = pathParts[0] || "en";

        let existsInDb = false;
        let hasContent = false;
        let contentType: string | null = null;

        // Check which table has this content
        if (blogMap.has(slug)) {
          const match = blogMap.get(slug)!;
          existsInDb = true;
          hasContent = match.status === "published" && !!match.detailed_content && match.detailed_content.length > 100;
          contentType = "blog";
        } else if (qaMap.has(slug)) {
          const match = qaMap.get(slug)!;
          existsInDb = true;
          hasContent = match.status === "published" && !!match.answer_main && match.answer_main.length > 50;
          contentType = "qa";
        } else if (compMap.has(slug)) {
          const match = compMap.get(slug)!;
          existsInDb = true;
          hasContent = match.status === "published" && !!match.final_verdict && match.final_verdict.length > 100;
          contentType = "comparison";
        } else if (locMap.has(slug)) {
          const match = locMap.get(slug)!;
          existsInDb = true;
          const locContent = match.location_overview || match.final_summary || "";
          hasContent = match.status === "published" && locContent.length > 100;
          contentType = "location";
        }

        // Skip if already in gone_urls
        if (goneSet.has(u.path)) {
          return {
            ...u,
            existsInDb: null,
            hasContent: null,
            contentType: null,
            language: lang,
            recommendation: "ignore" as const
          };
        }

        // Determine recommendation based on issue type and content status
        let recommendation: ParsedUrl["recommendation"] = "review";
        
        if (u.issueType === "404" || u.issueType === "server_error") {
          recommendation = existsInDb ? (hasContent ? "review" : "add_410") : "add_410";
        } else if (u.issueType === "soft_404") {
          recommendation = hasContent ? "fix_content" : "add_410";
        } else if (u.issueType === "canonical" || u.issueType === "duplicate") {
          recommendation = "check_canonical";
        } else if (u.issueType === "not_indexed" || u.issueType === "discovered") {
          recommendation = existsInDb && hasContent ? "review" : "add_410";
        }

        return {
          ...u,
          existsInDb,
          hasContent,
          contentType,
          language: lang,
          recommendation
        };
      });

      setParsedUrls(analyzed);
      setStep("preview");
      toast.success(`Analyzed ${analyzed.length} URLs`);
    } catch (error) {
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setStep("upload");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Category summaries
  const categorySummaries = useMemo((): CategorySummary[] => {
    const counts = new Map<IssueCategory, number>();
    parsedUrls.forEach(u => {
      counts.set(u.issueType, (counts.get(u.issueType) || 0) + 1);
    });

    const allCategories: CategorySummary[] = [
      { category: "404" as IssueCategory, label: "Not Found (404)", icon: <Ban className="h-4 w-4" />, color: "text-red-600", count: counts.get("404") || 0, selected: selectedCategories.has("404") },
      { category: "soft_404" as IssueCategory, label: "Soft 404", icon: <FileWarning className="h-4 w-4" />, color: "text-orange-600", count: counts.get("soft_404") || 0, selected: selectedCategories.has("soft_404") },
      { category: "server_error" as IssueCategory, label: "Server Error (5xx)", icon: <Server className="h-4 w-4" />, color: "text-red-800", count: counts.get("server_error") || 0, selected: selectedCategories.has("server_error") },
      { category: "canonical" as IssueCategory, label: "Canonical Issues", icon: <Link2 className="h-4 w-4" />, color: "text-blue-600", count: counts.get("canonical") || 0, selected: selectedCategories.has("canonical") },
      { category: "duplicate" as IssueCategory, label: "Duplicate", icon: <Link2 className="h-4 w-4" />, color: "text-purple-600", count: counts.get("duplicate") || 0, selected: selectedCategories.has("duplicate") },
      { category: "not_indexed" as IssueCategory, label: "Not Indexed", icon: <XCircle className="h-4 w-4" />, color: "text-gray-600", count: counts.get("not_indexed") || 0, selected: selectedCategories.has("not_indexed") },
    ];

    return allCategories.filter(c => c.count > 0);
  }, [parsedUrls, selectedCategories]);

  // URLs to process (filtered by selected categories and recommendation)
  const urlsToProcess = useMemo(() => {
    return parsedUrls.filter(u => 
      selectedCategories.has(u.issueType) && 
      u.recommendation === "add_410"
    );
  }, [parsedUrls, selectedCategories]);

  // Toggle category selection
  const toggleCategory = (category: IssueCategory) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  // Process selected URLs
  const processUrls = async () => {
    if (urlsToProcess.length === 0) {
      toast.error("No URLs selected for processing");
      return;
    }

    setStep("processing");
    setProgress(0);
    setResults({ added: 0, skipped: 0, errors: 0 });

    const batchSize = 50;
    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < urlsToProcess.length; i += batchSize) {
      const batch = urlsToProcess.slice(i, i + batchSize);
      
      const insertData = batch.map(u => ({
        url_path: u.path,
        reason: `gsc_import_${u.issueType}`,
        pattern_match: false
      }));

      const { error } = await supabase
        .from("gone_urls")
        .upsert(insertData, { onConflict: "url_path", ignoreDuplicates: true });

      if (error) {
        errors += batch.length;
      } else {
        added += batch.length;
      }

      setProgress(Math.round(((i + batch.length) / urlsToProcess.length) * 100));
    }

    setResults({ added, skipped, errors });
    setStep("complete");
    queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
    queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
    toast.success(`Import complete: ${added} URLs added to 410 list`);
  };

  // Reset wizard
  const reset = () => {
    setStep("upload");
    setCsvContent("");
    setParsedUrls([]);
    setProgress(0);
    setResults({ added: 0, skipped: 0, errors: 0 });
    setSelectedCategories(new Set(["404", "soft_404", "server_error"]));
  };

  const getRecommendationBadge = (rec: ParsedUrl["recommendation"]) => {
    switch (rec) {
      case "add_410":
        return <Badge variant="destructive" className="text-xs">Add to 410</Badge>;
      case "fix_content":
        return <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Fix Content</Badge>;
      case "check_canonical":
        return <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Check Canonical</Badge>;
      case "ignore":
        return <Badge variant="secondary" className="text-xs">Already 410</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Review</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          GSC Import Wizard
        </CardTitle>
        <CardDescription>
          Smart import from Google Search Console exports - auto-categorizes and validates URLs before processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-primary font-medium">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</div>
                Upload CSV
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">2</div>
                Analyze
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">3</div>
                Process
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">How to export from Google Search Console:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to GSC → Indexing → Pages</li>
                <li>Click on any issue category (e.g., "Not found (404)")</li>
                <li>Click "EXPORT" button (top right)</li>
                <li>Choose "Download CSV"</li>
                <li>Paste the entire file contents below</li>
              </ol>
            </div>

            <Textarea
              placeholder={`Paste your GSC CSV export here...\n\nExample format:\nURL,Last crawled,Issue\nhttps://www.example.com/old-page,2024-01-15,Not found (404)`}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />

            <Button 
              onClick={analyzeUrls} 
              disabled={!csvContent.trim() || isAnalyzing}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing URLs...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Analyze CSV
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                Upload CSV
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-2 text-primary font-medium">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</div>
                Review & Select
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">3</div>
                Process
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Select issue categories to process:</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categorySummaries.map((cat) => (
                  <label
                    key={cat.category}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      cat.selected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={cat.selected}
                      onCheckedChange={() => toggleCategory(cat.category)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className={cat.color}>{cat.icon}</span>
                      <span className="text-sm">{cat.label}</span>
                    </div>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{parsedUrls.length}</div>
                  <p className="text-sm text-muted-foreground">Total URLs parsed</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-destructive">{urlsToProcess.length}</div>
                  <p className="text-sm text-muted-foreground">To add as 410</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{parsedUrls.filter(u => u.recommendation === "ignore").length}</div>
                  <p className="text-sm text-muted-foreground">Already 410</p>
                </CardContent>
              </Card>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[40%]">URL Path</TableHead>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>In DB</TableHead>
                      <TableHead>Has Content</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUrls.slice(0, 50).map((url, i) => (
                      <TableRow key={i} className={
                        url.recommendation === "ignore" ? "opacity-50" : ""
                      }>
                        <TableCell className="font-mono text-xs truncate max-w-[300px]" title={url.path}>
                          {url.path}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {url.issueType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {url.existsInDb === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : url.existsInDb ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {url.hasContent === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : url.hasContent ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {getRecommendationBadge(url.recommendation)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedUrls.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                  Showing 50 of {parsedUrls.length} URLs
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Start Over
              </Button>
              <Button 
                onClick={processUrls} 
                disabled={urlsToProcess.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Ban className="mr-2 h-4 w-4" />
                Add {urlsToProcess.length} URLs to 410 List
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <div className="space-y-6 text-center py-8">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Processing URLs...</h3>
              <p className="text-muted-foreground">Adding {urlsToProcess.length} URLs to the 410 list</p>
            </div>
            <Progress value={progress} className="max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && (
          <div className="space-y-6 text-center py-8">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Import Complete!</h3>
              <p className="text-muted-foreground">
                Successfully processed {results.added + results.skipped + results.errors} URLs
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 max-w-lg mx-auto">
              <Card className="bg-green-50 dark:bg-green-950/30">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{results.added}</div>
                  <p className="text-sm text-muted-foreground">Added to 410</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{results.skipped}</div>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/30">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm max-w-lg mx-auto">
              <p className="font-medium">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-2">
                <li>Go to System Health → Regenerate Sitemaps</li>
                <li>Wait for IndexNow ping to complete</li>
                <li>Request validation in Google Search Console</li>
              </ol>
            </div>

            <Button onClick={reset}>
              Import More URLs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
