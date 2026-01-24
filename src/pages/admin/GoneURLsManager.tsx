import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Ban,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
  Sparkles,
} from "lucide-react";
import { GSCImportWizard } from "@/components/admin/GSCImportWizard";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoneUrl {
  id: string;
  url_path: string;
  reason: string | null;
  pattern_match: boolean;
  marked_gone_at: string;
  created_at: string;
}

interface GoneUrlHit {
  id: string;
  url_path: string;
  user_agent: string | null;
  hit_at: string;
}

const REASON_OPTIONS = [
  { value: "legacy_structure", label: "Legacy URL structure" },
  { value: "content_removed", label: "Content permanently removed" },
  { value: "duplicate_content", label: "Duplicate content consolidated" },
  { value: "migration_cleanup", label: "Migration cleanup" },
  { value: "gsc_import", label: "Imported from Google Search Console" },
  { value: "other", label: "Other" },
];

const GoneURLsManager = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newReason, setNewReason] = useState("legacy_structure");
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<{ status: number; ok: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch gone URLs
  const { data: goneUrls, isLoading } = useQuery({
    queryKey: ["gone-urls", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("gone_urls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.ilike("url_path", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GoneUrl[];
    },
  });

  // Fetch hit statistics
  const { data: hitStats } = useQuery({
    queryKey: ["gone-url-hits-stats"],
    queryFn: async () => {
      const { count: totalHits } = await supabase
        .from("gone_url_hits")
        .select("*", { count: "exact", head: true });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentHits } = await supabase
        .from("gone_url_hits")
        .select("*", { count: "exact", head: true })
        .gte("hit_at", oneDayAgo);

      // Get Googlebot hits
      const { count: googlebotHits } = await supabase
        .from("gone_url_hits")
        .select("*", { count: "exact", head: true })
        .ilike("user_agent", "%Googlebot%");

      return {
        total: totalHits || 0,
        recent: recentHits || 0,
        googlebot: googlebotHits || 0,
      };
    },
  });

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["gone-urls-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("gone_urls")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Add single URL mutation
  const addUrlMutation = useMutation({
    mutationFn: async ({ url_path, reason }: { url_path: string; reason: string }) => {
      const { error } = await supabase.from("gone_urls").insert({
        url_path: url_path.startsWith("/") ? url_path : `/${url_path}`,
        reason,
        pattern_match: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
      setNewUrl("");
      toast.success("URL added to 410 list");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add URL: ${error.message}`);
    },
  });

  // Delete URL mutation
  const deleteUrlMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gone_urls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
      toast.success("URL removed from 410 list");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete URL: ${error.message}`);
    },
  });

  // Bulk import from CSV
  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV content first");
      return;
    }

    setIsUploading(true);
    try {
      const lines = csvContent.split("\n").filter((line) => line.trim());
      const urls: string[] = [];

      for (const line of lines) {
        // Skip header row if present
        if (line.toLowerCase().includes("url") && lines.indexOf(line) === 0) continue;

        // Extract URL from CSV line (handles both simple and complex CSV formats)
        const parts = line.split(",");
        let urlPart = parts[0].trim().replace(/^["']|["']$/g, "");

        // If it's a full URL, extract just the path
        if (urlPart.startsWith("http")) {
          try {
            const urlObj = new URL(urlPart);
            urlPart = urlObj.pathname;
          } catch {
            continue; // Skip invalid URLs
          }
        }

        // Only add valid paths
        if (urlPart && urlPart.startsWith("/") && urlPart.length > 1) {
          urls.push(urlPart);
        }
      }

      if (urls.length === 0) {
        toast.error("No valid URLs found in CSV");
        return;
      }

      // Bulk insert
      const insertData = urls.map((url) => ({
        url_path: url,
        reason: "gsc_import",
        pattern_match: false,
      }));

      const { error } = await supabase.from("gone_urls").upsert(insertData, {
        onConflict: "url_path",
        ignoreDuplicates: true,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
      setCsvContent("");
      toast.success(`${urls.length} URLs imported successfully`);
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Test URL status
  const handleTestUrl = async () => {
    if (!testUrl.trim()) {
      toast.error("Please enter a URL to test");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const fullUrl = testUrl.startsWith("http")
        ? testUrl
        : `https://www.delsolprimehomes.com${testUrl.startsWith("/") ? testUrl : "/" + testUrl}`;

      const response = await fetch(fullUrl, { method: "HEAD" });
      setTestResult({ status: response.status, ok: response.ok });
    } catch (error) {
      toast.error("Failed to test URL - it may not exist or CORS is blocking");
    } finally {
      setIsTesting(false);
    }
  };

  // Export gone URLs
  const handleExport = () => {
    if (!goneUrls || goneUrls.length === 0) {
      toast.error("No URLs to export");
      return;
    }

    const csv = [
      "url_path,reason,marked_gone_at",
      ...goneUrls.map((u) => `"${u.url_path}","${u.reason || ""}","${u.marked_gone_at}"`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gone-urls-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Ban className="h-8 w-8 text-destructive" />
              410 Gone URL Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage permanently removed URLs to tell Google to stop crawling them
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total 410 URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totalCount || 0}</div>
              <p className="text-xs text-muted-foreground">Marked as permanently gone</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hitStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">All-time 410 responses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{hitStats?.recent || 0}</div>
              <p className="text-xs text-muted-foreground">Recent crawl attempts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Googlebot Hits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{hitStats?.googlebot || 0}</div>
              <p className="text-xs text-muted-foreground">Google crawler requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Import Methods */}
        <Tabs defaultValue="wizard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              GSC Import Wizard
            </TabsTrigger>
            <TabsTrigger value="simple" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Simple CSV Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard">
            <GSCImportWizard />
          </TabsContent>

          <TabsContent value="simple">
            {/* Simple Upload CSV Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
              Import from Google Search Console
            </CardTitle>
            <CardDescription>
              Paste the CSV content exported from GSC → Indexing → Pages → "Alternate page with proper canonical tag"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`Paste CSV content here...\n\nExample:\nURL\nhttps://www.example.com/old-page-1\nhttps://www.example.com/old-page-2`}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <Button onClick={handleCsvUpload} disabled={isUploading || !csvContent.trim()}>
              {isUploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import URLs
                </>
              )}
            </Button>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>

        {/* Add Single URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Single URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="new-url">URL Path</Label>
                <Input
                  id="new-url"
                  placeholder="/en/old-page/example-slug"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={newReason} onValueChange={setNewReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => addUrlMutation.mutate({ url_path: newUrl, reason: newReason })}
              disabled={!newUrl.trim() || addUrlMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add URL to 410 List
            </Button>
          </CardContent>
        </Card>

        {/* Test URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Test URL Status
            </CardTitle>
            <CardDescription>Check if a URL is correctly returning 410 (Gone)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="https://www.delsolprimehomes.com/en/old-page or /en/old-page"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTestUrl} disabled={isTesting || !testUrl.trim()}>
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>
            </div>
            {testResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  testResult.status === 410
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {testResult.status === 410 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-medium">
                  Status: {testResult.status} {testResult.status === 410 ? "(Gone - Correct!)" : "(Not 410 - May need to be added)"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* URL List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Current 410 URLs
                </CardTitle>
                <CardDescription>
                  {totalCount || 0} URLs marked as permanently removed
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search URLs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" onClick={handleExport} disabled={!goneUrls?.length}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : goneUrls && goneUrls.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">URL Path</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goneUrls.map((url) => (
                      <TableRow key={url.id}>
                        <TableCell className="font-mono text-sm">{url.url_path}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {REASON_OPTIONS.find((r) => r.value === url.reason)?.label || url.reason || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(url.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                window.open(`https://www.delsolprimehomes.com${url.url_path}`, "_blank")
                              }
                              title="Test URL"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteUrlMutation.mutate(url.id)}
                              disabled={deleteUrlMutation.isPending}
                              title="Remove from 410 list"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No 410 URLs configured yet</p>
                <p className="text-sm">Import URLs from Google Search Console or add them manually</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How 410 (Gone) works</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>410 Gone</strong> tells search engines: "This page is permanently deleted, stop crawling"</li>
              <li>• Unlike 404, Google will remove 410 pages from its index faster and stop rechecking</li>
              <li>• Saves crawl budget for your 13,000+ actual pages</li>
              <li>• Fixes "Alternate page with proper canonical tag" errors in Google Search Console</li>
              <li>• Pattern matching handles `/uncategorized/`, `/draft-`, `/preview-` automatically</li>
              <li>• Legacy URLs like `/blog/slug` are 301 redirected to `/en/blog/slug` (not 410)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default GoneURLsManager;
