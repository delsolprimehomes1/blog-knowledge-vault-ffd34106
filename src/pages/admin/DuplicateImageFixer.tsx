import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Copy,
  RefreshCw,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DuplicateImageGroup {
  featured_image_url: string;
  usage_count: number;
  article_ids: string[];
  headlines: string[];
  cluster_ids: string[];
}

interface QueueItem {
  id: string;
  article_id: string;
  priority: number;
  status: string;
  reason: string | null;
  original_image_url: string | null;
  new_image_url: string | null;
  image_prompt: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface ArticleInfo {
  id: string;
  headline: string;
  cluster_id: string | null;
  language: string;
}

export default function DuplicateImageFixer() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);

  // Fetch duplicate images
  const { data: duplicateGroups = [], isLoading: loadingDuplicates, refetch: refetchDuplicates } = useQuery({
    queryKey: ['duplicate-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duplicate_image_articles')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as DuplicateImageGroup[];
    },
  });

  // Fetch queue items
  const { data: queueItems = [], isLoading: loadingQueue, refetch: refetchQueue } = useQuery({
    queryKey: ['image-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_regeneration_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as QueueItem[];
    },
  });

  // Fetch article details for queue items
  const articleIds = queueItems.map(q => q.article_id);
  const { data: articleDetails = [] } = useQuery({
    queryKey: ['queue-article-details', articleIds],
    queryFn: async () => {
      if (articleIds.length === 0) return [];
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, cluster_id, language')
        .in('id', articleIds);

      if (error) throw error;
      return data as ArticleInfo[];
    },
    enabled: articleIds.length > 0,
  });

  const articleMap = Object.fromEntries(articleDetails.map(a => [a.id, a]));

  // Queue all duplicates for regeneration
  const queueAllDuplicates = async () => {
    try {
      const articlesToQueue: { article_id: string; priority: number; reason: string; original_image_url: string }[] = [];
      
      for (const group of duplicateGroups) {
        // Skip the first article (keep its image), queue the rest
        for (let i = 1; i < group.article_ids.length; i++) {
          articlesToQueue.push({
            article_id: group.article_ids[i],
            priority: group.usage_count, // Higher usage = higher priority
            reason: `Duplicate image used by ${group.usage_count} articles`,
            original_image_url: group.featured_image_url
          });
        }
      }

      if (articlesToQueue.length === 0) {
        toast({ title: "No duplicates to queue" });
        return;
      }

      const { error } = await supabase
        .from('image_regeneration_queue')
        .upsert(articlesToQueue, { onConflict: 'article_id' });

      if (error) throw error;

      toast({
        title: "Duplicates Queued",
        description: `Added ${articlesToQueue.length} articles to regeneration queue`,
      });

      refetchQueue();
    } catch (error) {
      console.error('Error queueing duplicates:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to queue duplicates",
        variant: "destructive",
      });
    }
  };

  // Process next item in queue
  const processNextItem = async () => {
    const pendingItem = queueItems.find(q => q.status === 'pending');
    if (!pendingItem) return null;

    const article = articleMap[pendingItem.article_id];
    if (!article) return null;

    // Mark as processing
    await supabase
      .from('image_regeneration_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', pendingItem.id);

    try {
      // Generate topic-specific prompt based on headline
      const prompt = `Professional real estate photography for article about: ${article.headline}. Costa del Sol, Spain. High quality, modern, aspirational. 16:9 aspect ratio.`;

      // Call generate-image function
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { headline: article.headline }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const tempImageUrl = data.images[0].url;

      // Download image
      const imageResponse = await fetch(tempImageUrl);
      if (!imageResponse.ok) throw new Error('Failed to download image');

      const imageBlob = await imageResponse.blob();
      const fileName = `article-${pendingItem.article_id}-${Date.now()}.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(fileName, imageBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('article-images')
        .getPublicUrl(fileName);

      // Update article with new image URL
      const { error: updateError } = await supabase
        .from('blog_articles')
        .update({
          featured_image_url: publicUrlData.publicUrl,
          featured_image_alt: `${article.headline} - Costa del Sol real estate`,
        })
        .eq('id', pendingItem.article_id);

      if (updateError) throw updateError;

      // Mark as completed
      await supabase
        .from('image_regeneration_queue')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          new_image_url: publicUrlData.publicUrl,
          image_prompt: prompt
        })
        .eq('id', pendingItem.id);

      return { success: true, articleId: pendingItem.article_id };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark as failed or retry
      const newRetryCount = pendingItem.retry_count + 1;
      const newStatus = newRetryCount >= (pendingItem.max_retries || 3) ? 'failed' : 'pending';
      
      await supabase
        .from('image_regeneration_queue')
        .update({ 
          status: newStatus,
          error_message: errorMessage,
          retry_count: newRetryCount
        })
        .eq('id', pendingItem.id);

      return { success: false, articleId: pendingItem.article_id, error: errorMessage };
    }
  };

  // Process all pending items
  const processAllPending = async () => {
    const pendingItems = queueItems.filter(q => q.status === 'pending');
    if (pendingItems.length === 0) {
      toast({ title: "No pending items to process" });
      return;
    }

    setIsProcessing(true);
    setTotalToProcess(pendingItems.length);
    setProcessedCount(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      if (!isProcessing) break; // Allow stopping

      const result = await processNextItem();
      if (result?.success) {
        successCount++;
      } else if (result) {
        errorCount++;
      }
      
      setProcessedCount(i + 1);
      await refetchQueue();

      // Small delay to avoid rate limiting
      if (i < pendingItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsProcessing(false);
    toast({
      title: "Processing Complete",
      description: `✅ ${successCount} successful, ❌ ${errorCount} failed`,
    });

    refetchDuplicates();
  };

  // Clear completed items
  const clearCompleted = async () => {
    const { error } = await supabase
      .from('image_regeneration_queue')
      .delete()
      .eq('status', 'completed');

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cleared completed items" });
      refetchQueue();
    }
  };

  // Retry failed items
  const retryFailed = async () => {
    const { error } = await supabase
      .from('image_regeneration_queue')
      .update({ status: 'pending', retry_count: 0, error_message: null })
      .eq('status', 'failed');

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset failed items to pending" });
      refetchQueue();
    }
  };

  const pendingCount = queueItems.filter(q => q.status === 'pending').length;
  const processingCount = queueItems.filter(q => q.status === 'processing').length;
  const completedCount = queueItems.filter(q => q.status === 'completed').length;
  const failedCount = queueItems.filter(q => q.status === 'failed').length;

  const totalDuplicateArticles = duplicateGroups.reduce((sum, g) => sum + g.usage_count - 1, 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Duplicate Image Fixer</h1>
          <p className="text-muted-foreground">
            Identify and regenerate unique images for articles sharing the same featured image
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{duplicateGroups.length}</div>
              <div className="text-sm text-muted-foreground">Duplicate Groups</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{totalDuplicateArticles}</div>
              <div className="text-sm text-muted-foreground">Articles to Fix</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="duplicates">
          <TabsList>
            <TabsTrigger value="duplicates">
              <Copy className="h-4 w-4 mr-2" />
              Duplicates ({duplicateGroups.length})
            </TabsTrigger>
            <TabsTrigger value="queue">
              <RefreshCw className="h-4 w-4 mr-2" />
              Queue ({queueItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="duplicates" className="space-y-4">
            {loadingDuplicates ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : duplicateGroups.length === 0 ? (
              <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>No duplicate images found!</strong> All articles have unique featured images.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Queue All Duplicates</CardTitle>
                    <CardDescription>
                      Add all {totalDuplicateArticles} articles with duplicate images to the regeneration queue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={queueAllDuplicates} size="lg">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Queue All Duplicates for Regeneration
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Duplicate Image Groups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {duplicateGroups.map((group, idx) => (
                        <div key={idx} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-4">
                            <img 
                              src={group.featured_image_url} 
                              alt="Duplicate" 
                              className="w-24 h-16 object-cover rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">{group.usage_count} articles</Badge>
                                <Badge variant="outline">
                                  {new Set(group.cluster_ids.filter(Boolean)).size} clusters
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                {group.headlines.slice(0, 3).map((headline, i) => (
                                  <div key={i} className="truncate">{headline}</div>
                                ))}
                                {group.headlines.length > 3 && (
                                  <div className="text-xs">+{group.headlines.length - 3} more...</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Process Queue</CardTitle>
                <CardDescription>
                  Generate new unique images for queued articles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={processAllPending} 
                    disabled={isProcessing || pendingCount === 0}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Process All Pending ({pendingCount})</>
                    )}
                  </Button>
                  
                  {isProcessing && (
                    <Button variant="outline" onClick={() => setIsProcessing(false)}>
                      <Pause className="h-4 w-4 mr-2" /> Stop
                    </Button>
                  )}
                  
                  <Button variant="outline" onClick={retryFailed} disabled={failedCount === 0}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Retry Failed ({failedCount})
                  </Button>
                  
                  <Button variant="ghost" onClick={clearCompleted} disabled={completedCount === 0}>
                    Clear Completed ({completedCount})
                  </Button>
                </div>

                {isProcessing && totalToProcess > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{processedCount} / {totalToProcess}</span>
                    </div>
                    <Progress value={(processedCount / totalToProcess) * 100} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {loadingQueue ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : queueItems.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Queue is empty. Add duplicate images to the queue from the Duplicates tab.
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Queue Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {queueItems.map((item) => {
                      const article = articleMap[item.article_id];
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex-shrink-0">
                            {item.status === 'pending' && (
                              <div className="h-4 w-4 rounded-full border-2 border-muted" />
                            )}
                            {item.status === 'processing' && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            {item.status === 'completed' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {item.status === 'failed' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {article?.headline || item.article_id}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {article?.language?.toUpperCase() || 'Unknown'}
                              </Badge>
                              {item.reason && <span>{item.reason}</span>}
                              {item.error_message && (
                                <span className="text-red-500">{item.error_message}</span>
                              )}
                            </div>
                          </div>
                          
                          <Badge variant={
                            item.status === 'completed' ? 'default' :
                            item.status === 'failed' ? 'destructive' :
                            item.status === 'processing' ? 'secondary' : 'outline'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
