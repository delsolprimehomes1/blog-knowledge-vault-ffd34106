import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, RefreshCw, Play, Eye, Zap, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

const BAD_PATTERNS = [
  /^\d+\.\s/m,
  /^[-*•]\s/m,
  /\n\s*\d+\.\s/,
  /\n\s*[-*•]\s/,
];

function hasBadFormatting(text: string): boolean {
  return BAD_PATTERNS.some(p => p.test(text));
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0).length;
}

type ContentType = 'qa_pages' | 'blog_articles' | 'comparison_pages' | 'location_pages';

interface ContentStats {
  total: number;
  withLists: number;
  tooLong: number;
  tooShort?: number;
  needsFix: number;
}

export default function AEOAnswerFixer() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentType>('qa_pages');
  const [isScanning, setIsScanning] = useState(false);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0, fixed: 0 });
  const abortRef = useRef(false);

  // Stats queries for all content types
  const { data: qaStats, isLoading: qaLoading } = useQuery({
    queryKey: ['aeo-qa-stats'],
    queryFn: async (): Promise<ContentStats> => {
      const { data, error } = await supabase
        .from('qa_pages')
        .select('id, speakable_answer, language')
        .not('speakable_answer', 'is', null);
      
      if (error) throw error;
      
      const withLists = (data || []).filter(qa => hasBadFormatting(qa.speakable_answer || ''));
      const tooLong = (data || []).filter(qa => countWords(qa.speakable_answer || '') > 150);
      const tooShort = (data || []).filter(qa => {
        const words = countWords(qa.speakable_answer || '');
        return words > 0 && words < 60;
      });
      
      return {
        total: data?.length || 0,
        withLists: withLists.length,
        tooLong: tooLong.length,
        tooShort: tooShort.length,
        needsFix: withLists.length + tooLong.length,
      };
    },
  });

  const { data: blogStats, isLoading: blogLoading } = useQuery({
    queryKey: ['aeo-blog-stats'],
    queryFn: async (): Promise<ContentStats> => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, speakable_answer, language')
        .eq('status', 'published')
        .not('speakable_answer', 'is', null);
      
      if (error) throw error;
      
      const withLists = (data || []).filter(a => hasBadFormatting(a.speakable_answer || ''));
      const tooLong = (data || []).filter(a => countWords(a.speakable_answer || '') > 150);
      
      return {
        total: data?.length || 0,
        withLists: withLists.length,
        tooLong: tooLong.length,
        needsFix: withLists.length + tooLong.length,
      };
    },
  });

  const { data: comparisonStats, isLoading: comparisonLoading } = useQuery({
    queryKey: ['aeo-comparison-stats'],
    queryFn: async (): Promise<ContentStats> => {
      const { data, error } = await supabase
        .from('comparison_pages')
        .select('id, speakable_answer, language')
        .eq('status', 'published')
        .not('speakable_answer', 'is', null);
      
      if (error) throw error;
      
      const withLists = (data || []).filter(a => hasBadFormatting(a.speakable_answer || ''));
      const tooLong = (data || []).filter(a => countWords(a.speakable_answer || '') > 150);
      
      return {
        total: data?.length || 0,
        withLists: withLists.length,
        tooLong: tooLong.length,
        needsFix: withLists.length + tooLong.length,
      };
    },
  });

  const { data: locationStats, isLoading: locationLoading } = useQuery({
    queryKey: ['aeo-location-stats'],
    queryFn: async (): Promise<ContentStats> => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('id, speakable_answer, language')
        .eq('status', 'published')
        .not('speakable_answer', 'is', null);
      
      if (error) throw error;
      
      const withLists = (data || []).filter(a => hasBadFormatting(a.speakable_answer || ''));
      const tooLong = (data || []).filter(a => countWords(a.speakable_answer || '') > 150);
      
      return {
        total: data?.length || 0,
        withLists: withLists.length,
        tooLong: tooLong.length,
        needsFix: withLists.length + tooLong.length,
      };
    },
  });

  const getStatsForTab = (tab: ContentType): ContentStats | undefined => {
    switch (tab) {
      case 'qa_pages': return qaStats;
      case 'blog_articles': return blogStats;
      case 'comparison_pages': return comparisonStats;
      case 'location_pages': return locationStats;
    }
  };

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async ({ contentType, dryRun, size }: { contentType: ContentType; dryRun: boolean; size: number }) => {
      const { data, error } = await supabase.functions.invoke('regenerate-aeo-answers', {
        body: { contentType, batchSize: size, dryRun, fixListsOnly: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.dryRun) {
        setPreviewResults(data.results.details || []);
        toast.success(`Preview: ${data.results.scanned} items need fixing`);
      } else {
        toast.success(`Fixed ${data.results.fixed} items`);
        queryClient.invalidateQueries({ queryKey: ['aeo-qa-stats'] });
        queryClient.invalidateQueries({ queryKey: ['aeo-blog-stats'] });
        queryClient.invalidateQueries({ queryKey: ['aeo-comparison-stats'] });
        queryClient.invalidateQueries({ queryKey: ['aeo-location-stats'] });
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleScan = async (dryRun: boolean) => {
    setIsScanning(true);
    try {
      await scanMutation.mutateAsync({ contentType: activeTab, dryRun, size: batchSize });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFixAll = async () => {
    const stats = getStatsForTab(activeTab);
    if (!stats || stats.needsFix === 0) {
      toast.info('No items need fixing');
      return;
    }

    setIsFixingAll(true);
    abortRef.current = false;
    const total = stats.needsFix;
    let current = 0;
    let totalFixed = 0;

    setFixProgress({ current: 0, total, fixed: 0 });

    while (current < total && !abortRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke('regenerate-aeo-answers', {
          body: { contentType: activeTab, batchSize, dryRun: false, fixListsOnly: true },
        });

        if (error) throw error;

        const fixedInBatch = data.results?.fixed || 0;
        totalFixed += fixedInBatch;
        current += batchSize;

        setFixProgress({ current: Math.min(current, total), total, fixed: totalFixed });

        // If no items were fixed, we're done
        if (fixedInBatch === 0) break;

        // Small delay between batches
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        toast.error(`Batch error: ${err.message}`);
        break;
      }
    }

    setIsFixingAll(false);
    queryClient.invalidateQueries({ queryKey: ['aeo-qa-stats'] });
    queryClient.invalidateQueries({ queryKey: ['aeo-blog-stats'] });
    queryClient.invalidateQueries({ queryKey: ['aeo-comparison-stats'] });
    queryClient.invalidateQueries({ queryKey: ['aeo-location-stats'] });
    
    if (abortRef.current) {
      toast.info(`Stopped. Fixed ${totalFixed} items.`);
    } else {
      toast.success(`Complete! Fixed ${totalFixed} items total.`);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const progressPercent = fixProgress.total > 0 
    ? Math.round((fixProgress.current / fixProgress.total) * 100) 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AEO Answer Fixer</h1>
          <p className="text-muted-foreground mt-2">
            Fix acceptedAnswer formatting for AI citation compliance (Hans' Rules)
          </p>
        </div>

        {/* Hans' Rules Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Hans' AEO Rules for acceptedAnswer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">✅ Required Format</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Single paragraph only</li>
                  <li>• 80-120 words (max 150)</li>
                  <li>• Max 800 characters</li>
                  <li>• Complete sentences with period</li>
                  <li>• Verdict/conclusion tone</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">❌ Forbidden</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Numbered lists (1., 2., 3.)</li>
                  <li>• Bullet points (-, *, •)</li>
                  <li>• Line breaks or multiple paragraphs</li>
                  <li>• "Here's what you need to know"</li>
                  <li>• Tutorial/step-by-step format</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview - All 4 content types */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={activeTab === 'qa_pages' ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Q&A Pages</CardTitle>
              <CardDescription>speakable_answer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <Badge variant="outline">{qaStats?.total || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-destructive">Lists:</span>
                  <Badge variant="destructive">{qaStats?.withLists || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Too long:</span>
                  <Badge variant="secondary">{qaStats?.tooLong || 0}</Badge>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Needs fix:</span>
                  <Badge variant={qaStats?.needsFix ? 'destructive' : 'outline'}>
                    {qaStats?.needsFix || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={activeTab === 'blog_articles' ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Blog Articles</CardTitle>
              <CardDescription>speakable_answer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <Badge variant="outline">{blogStats?.total || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-destructive">Lists:</span>
                  <Badge variant="destructive">{blogStats?.withLists || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Too long:</span>
                  <Badge variant="secondary">{blogStats?.tooLong || 0}</Badge>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Needs fix:</span>
                  <Badge variant={blogStats?.needsFix ? 'destructive' : 'outline'}>
                    {blogStats?.needsFix || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={activeTab === 'comparison_pages' ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Comparisons</CardTitle>
              <CardDescription>speakable_answer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <Badge variant="outline">{comparisonStats?.total || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-destructive">Lists:</span>
                  <Badge variant="destructive">{comparisonStats?.withLists || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Too long:</span>
                  <Badge variant="secondary">{comparisonStats?.tooLong || 0}</Badge>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Needs fix:</span>
                  <Badge variant={comparisonStats?.needsFix ? 'destructive' : 'outline'}>
                    {comparisonStats?.needsFix || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={activeTab === 'location_pages' ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Locations</CardTitle>
              <CardDescription>speakable_answer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <Badge variant="outline">{locationStats?.total || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-destructive">Lists:</span>
                  <Badge variant="destructive">{locationStats?.withLists || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Too long:</span>
                  <Badge variant="secondary">{locationStats?.tooLong || 0}</Badge>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Needs fix:</span>
                  <Badge variant={locationStats?.needsFix ? 'destructive' : 'outline'}>
                    {locationStats?.needsFix || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fix Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Fix Tool</CardTitle>
            <CardDescription>
              Regenerate non-compliant answers using AI with Hans' rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
              <TabsList className="mb-4">
                <TabsTrigger value="qa_pages">Q&A Pages</TabsTrigger>
                <TabsTrigger value="blog_articles">Blog Articles</TabsTrigger>
                <TabsTrigger value="comparison_pages">Comparisons</TabsTrigger>
                <TabsTrigger value="location_pages">Locations</TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Batch size:</span>
                  <Select 
                    value={batchSize.toString()} 
                    onValueChange={(v) => setBatchSize(parseInt(v))}
                    disabled={isFixingAll}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleScan(true)}
                  disabled={isScanning || isFixingAll}
                >
                  {isScanning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => handleScan(false)}
                  disabled={isScanning || isFixingAll}
                >
                  {isScanning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Fix {batchSize}
                </Button>

                {!isFixingAll ? (
                  <Button
                    onClick={handleFixAll}
                    disabled={isScanning || (getStatsForTab(activeTab)?.needsFix || 0) === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Fix All ({getStatsForTab(activeTab)?.needsFix || 0})
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleStop}>
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </Tabs>

            {/* Progress bar when fixing all */}
            {isFixingAll && (
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                  <span>Progress: {fixProgress.current} / {fixProgress.total}</span>
                  <span className="text-green-600">Fixed: {fixProgress.fixed}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Processing in batches of {batchSize}... {progressPercent}% complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Results */}
        {previewResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Preview Results
              </CardTitle>
              <CardDescription>
                Showing before/after for {previewResults.length} items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previewResults.map((result, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate max-w-[70%]">
                        {result.question || result.headline || `Item ${i + 1}`}
                      </span>
                      <Badge>{result.language}</Badge>
                    </div>
                    
                    {result.before && (
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-destructive/10 p-3 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-destructive">Before</span>
                            <Badge variant="destructive" className="text-xs">
                              {result.before.words} words
                            </Badge>
                            {result.before.hasList && (
                              <Badge variant="destructive" className="text-xs">Has lists</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {result.before.text?.substring(0, 300)}
                            {result.before.text?.length > 300 && '...'}
                          </p>
                        </div>
                        <div className="bg-green-500/10 p-3 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-green-700 dark:text-green-400">After</span>
                            <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900">
                              {result.after?.words || '?'} words
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {result.after?.text?.substring(0, 300)}
                            {result.after?.text?.length > 300 && '...'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
