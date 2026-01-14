import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Image, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Play, 
  Square, 
  Eye,
  RefreshCw,
  Clock,
  Layers
} from "lucide-react";

interface ClusterInfo {
  id: string;
  theme: string | null;
  articleCount: number;
  languageCount: number;
}

interface ClusterResult {
  clusterId: string;
  theme: string | null;
  success: boolean;
  uniqueImagesGenerated: number;
  imagesPreserved: number;
  imagesShared: number;
  totalArticles: number;
  error?: string;
}

interface DryRunSummary {
  totalClusters: number;
  totalArticles: number;
  uniqueImagesNeeded: number;
  translationsToShare: number;
  estimatedTimeMinutes: number;
}

const BulkImageUpdate = () => {
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCluster, setCurrentCluster] = useState<string | null>(null);
  const [results, setResults] = useState<ClusterResult[]>([]);
  const [dryRunSummary, setDryRunSummary] = useState<DryRunSummary | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [preserveEnglishImages, setPreserveEnglishImages] = useState(true);
  const abortRef = useRef(false);

  // Fetch clusters on mount
  useEffect(() => {
    fetchClusters();
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [processing, startTime]);

  const fetchClusters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('cluster_id, cluster_theme, language')
        .not('cluster_id', 'is', null)
        .eq('status', 'published');

      if (error) throw error;

      // Group by cluster_id
      const clusterMap = (data || []).reduce((acc, article) => {
        const id = article.cluster_id!;
        if (!acc[id]) {
          acc[id] = {
            id,
            theme: article.cluster_theme,
            articleCount: 0,
            languages: new Set<string>()
          };
        }
        acc[id].articleCount++;
        acc[id].languages.add(article.language);
        return acc;
      }, {} as Record<string, { id: string; theme: string | null; articleCount: number; languages: Set<string> }>);

      const clusterList = Object.values(clusterMap).map(c => ({
        id: c.id,
        theme: c.theme,
        articleCount: c.articleCount,
        languageCount: c.languages.size
      })).sort((a, b) => (b.theme || '').localeCompare(a.theme || ''));

      setClusters(clusterList);
    } catch (err) {
      console.error('Error fetching clusters:', err);
      toast.error('Failed to fetch clusters');
    } finally {
      setLoading(false);
    }
  };

  const filteredClusters = clusters.filter(c => 
    !searchQuery || 
    c.theme?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCluster = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === filteredClusters.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredClusters.map(c => c.id)));
    }
  };

  const runDryRun = () => {
    const selectedClusters = clusters.filter(c => selected.has(c.id));
    const totalArticles = selectedClusters.reduce((sum, c) => sum + c.articleCount, 0);
    const englishArticles = selectedClusters.length * 6; // 6 funnel stages per cluster
    const translationsToShare = totalArticles - englishArticles;
    
    // If preserving, no new images needed
    const uniqueImagesNeeded = preserveEnglishImages ? 0 : englishArticles;
    const estimatedTimeMinutes = preserveEnglishImages 
      ? Math.ceil((selectedClusters.length * 10) / 60)  // ~10s per cluster (metadata only)
      : Math.ceil((selectedClusters.length * 30) / 60); // ~30s per cluster (with image gen)

    setDryRunSummary({
      totalClusters: selectedClusters.length,
      totalArticles,
      uniqueImagesNeeded,
      translationsToShare: Math.max(0, translationsToShare),
      estimatedTimeMinutes
    });
  };

  const processSelected = async () => {
    if (selected.size === 0) {
      toast.error('Please select at least one cluster');
      return;
    }

    setShowConfirmDialog(false);
    setProcessing(true);
    setCurrentIndex(0);
    setResults([]);
    setStartTime(new Date());
    setElapsedTime(0);
    abortRef.current = false;

    const clusterIds = Array.from(selected);
    const newResults: ClusterResult[] = [];

    for (let i = 0; i < clusterIds.length; i++) {
      if (abortRef.current) {
        toast.info('Processing stopped by user');
        break;
      }

      setCurrentIndex(i);
      const clusterId = clusterIds[i];
      const cluster = clusters.find(c => c.id === clusterId);
      setCurrentCluster(cluster?.theme || clusterId);

      try {
        const { data, error } = await supabase.functions.invoke(
          'regenerate-cluster-images',
          { body: { clusterId, dryRun: false, preserveEnglishImages } }
        );

        if (error) throw error;

        newResults.push({
          clusterId,
          theme: cluster?.theme || null,
          success: true,
          uniqueImagesGenerated: data?.uniqueImagesGenerated || 0,
          imagesPreserved: data?.imagesPreserved || 0,
          imagesShared: data?.imagesShared || 0,
          totalArticles: data?.totalArticles || cluster?.articleCount || 0
        });

        toast.success(`Cluster ${i + 1}/${clusterIds.length} completed`);
      } catch (err) {
        console.error(`Error processing cluster ${clusterId}:`, err);
        newResults.push({
          clusterId,
          theme: cluster?.theme || null,
          success: false,
          uniqueImagesGenerated: 0,
          imagesPreserved: 0,
          imagesShared: 0,
          totalArticles: cluster?.articleCount || 0,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      setResults([...newResults]);

      // 3-second delay between clusters (unless last or aborted)
      if (i < clusterIds.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    setProcessing(false);
    setCurrentCluster(null);
    
    const successCount = newResults.filter(r => r.success).length;
    const totalGenerated = newResults.reduce((sum, r) => sum + r.uniqueImagesGenerated, 0);
    const totalPreserved = newResults.reduce((sum, r) => sum + r.imagesPreserved, 0);
    const totalShared = newResults.reduce((sum, r) => sum + r.imagesShared, 0);
    
    const message = preserveEnglishImages
      ? `Completed! ${successCount}/${newResults.length} clusters. ${totalPreserved} preserved, ${totalShared} shared.`
      : `Completed! ${successCount}/${newResults.length} clusters. ${totalGenerated} generated, ${totalShared} shared.`;
    
    toast.success(message);
  };

  const stopProcessing = () => {
    abortRef.current = true;
    toast.info('Stopping after current cluster completes...');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Stats calculations
  const selectedCount = selected.size;
  const estimatedImages = selectedCount * 6;
  const estimatedShares = clusters
    .filter(c => selected.has(c.id))
    .reduce((sum, c) => sum + c.articleCount, 0) - estimatedImages;

  return (
    <AdminLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Bulk Image Update</h1>
          <p className="text-muted-foreground mt-1">
            Update existing clusters to share images across language translations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{clusters.length}</p>
                  <p className="text-sm text-muted-foreground">Total Clusters</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{selectedCount}</p>
                  <p className="text-sm text-muted-foreground">Selected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Image className={`h-5 w-5 ${preserveEnglishImages ? 'text-green-500' : 'text-blue-500'}`} />
                <div>
                  <p className="text-2xl font-bold">{preserveEnglishImages ? estimatedImages : estimatedImages}</p>
                  <p className="text-sm text-muted-foreground">
                    {preserveEnglishImages ? 'Images Preserved' : 'New Images'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{Math.max(0, estimatedShares)}</p>
                  <p className="text-sm text-muted-foreground">Shared</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cluster Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Clusters</span>
              <Button variant="outline" size="sm" onClick={fetchClusters} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Choose which clusters to update with shared images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Select All */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clusters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selected.size === filteredClusters.length && filteredClusters.length > 0}
                  onCheckedChange={selectAll}
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select All ({filteredClusters.length} clusters)
                </label>
              </div>
            </div>

            {/* Preserve Images Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Checkbox
                id="preserve-images"
                checked={preserveEnglishImages}
                onCheckedChange={(checked) => setPreserveEnglishImages(checked === true)}
                disabled={processing}
              />
              <div className="flex-1">
                <label htmlFor="preserve-images" className="text-sm font-medium cursor-pointer">
                  Preserve existing English images
                </label>
                <p className="text-xs text-muted-foreground">
                  {preserveEnglishImages 
                    ? "✅ Keep existing images, only copy to translations (faster, no API costs)"
                    : "⚠️ Generate NEW images for English articles (slower, uses API credits)"}
                </p>
              </div>
            </div>

            {/* Cluster List */}
            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading clusters...
                </div>
              ) : filteredClusters.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No clusters found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredClusters.map(cluster => (
                    <label
                      key={cluster.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.has(cluster.id)}
                        onCheckedChange={() => toggleCluster(cluster.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {cluster.theme || cluster.id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {cluster.id}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {cluster.articleCount} articles
                      </Badge>
                      <Badge variant="secondary" className="shrink-0">
                        {cluster.languageCount}L
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={runDryRun}
            disabled={selected.size === 0 || processing}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Changes
          </Button>
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={selected.size === 0 || processing}
          >
            <Play className="h-4 w-4 mr-2" />
            Update Selected Clusters
          </Button>
          {processing && (
            <Button variant="destructive" onClick={stopProcessing}>
              <Square className="h-4 w-4 mr-2" />
              Stop Processing
            </Button>
          )}
        </div>

        {/* Dry Run Summary */}
        {dryRunSummary && !processing && results.length === 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-blue-700">Preview Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="font-semibold">{dryRunSummary.totalClusters}</p>
                  <p className="text-muted-foreground">Clusters</p>
                </div>
                <div>
                  <p className="font-semibold">{dryRunSummary.totalArticles}</p>
                  <p className="text-muted-foreground">Total Articles</p>
                </div>
                <div>
                  <p className="font-semibold text-blue-600">{dryRunSummary.uniqueImagesNeeded}</p>
                  <p className="text-muted-foreground">Images to Generate</p>
                </div>
                <div>
                  <p className="font-semibold text-green-600">{dryRunSummary.translationsToShare}</p>
                  <p className="text-muted-foreground">Images to Share</p>
                </div>
                <div>
                  <p className="font-semibold">{dryRunSummary.estimatedTimeMinutes} min</p>
                  <p className="text-muted-foreground">Estimated Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Section */}
        {processing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processing...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Cluster {currentIndex + 1} / {selected.size}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <Progress value={((currentIndex + 1) / selected.size) * 100} />
              {currentCluster && (
                <p className="text-sm text-muted-foreground truncate">
                  Processing: {currentCluster}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results Summary</CardTitle>
              <CardDescription>
                {results.filter(r => r.success).length} succeeded, {results.filter(r => !r.success).length} failed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Processed</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {results.reduce((sum, r) => sum + r.uniqueImagesGenerated, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Generated</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {results.reduce((sum, r) => sum + r.imagesShared, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Shared</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">
                    {formatTime(elapsedTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Cluster</TableHead>
                      <TableHead className="text-right">Generated</TableHead>
                      <TableHead className="text-right">Shared</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.clusterId}>
                        <TableCell>
                          {result.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[300px]">
                              {result.theme || result.clusterId}
                            </p>
                            {result.error && (
                              <p className="text-xs text-red-500">{result.error}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {result.uniqueImagesGenerated}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {result.imagesShared}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {result.totalArticles}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Bulk Image Update</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    You are about to update <strong>{selected.size}</strong> clusters.
                  </p>
                  <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                    <p>This will:</p>
                    {preserveEnglishImages ? (
                      <ul className="list-disc list-inside space-y-1">
                        <li>✅ Keep existing English images</li>
                        <li>📋 Copy images to up to <strong>{Math.max(0, estimatedShares)}</strong> translations</li>
                        <li>📝 Generate localized alt text & captions for all articles</li>
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        <li>🖼️ Generate <strong>{estimatedImages}</strong> NEW images (replaces existing)</li>
                        <li>📋 Share to up to <strong>{Math.max(0, estimatedShares)}</strong> translations</li>
                        <li>📝 Generate localized metadata for all articles</li>
                      </ul>
                    )}
                    <p className="mt-4">
                      Estimated time: <strong>
                        {preserveEnglishImages 
                          ? `${Math.max(1, Math.ceil((selected.size * 10) / 60))} minutes`
                          : `${Math.ceil((selected.size * 30) / 60)}-${Math.ceil((selected.size * 45) / 60)} minutes`
                        }
                      </strong>
                    </p>
                    {preserveEnglishImages ? (
                      <p className="text-green-600 font-medium">💰 No image generation costs</p>
                    ) : (
                      <p className="text-amber-600 font-medium">💰 Uses API credits for image generation</p>
                    )}
                  </div>
                  <p className="text-amber-600 font-medium">
                    This cannot be undone. Are you sure?
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={processSelected}>
                Yes, Proceed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default BulkImageUpdate;
