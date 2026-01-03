import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, RefreshCw, Play, Eye, Zap } from 'lucide-react';
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

type ContentType = 'qa_pages' | 'blog_articles';

export default function AEOAnswerFixer() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentType>('qa_pages');
  const [isScanning, setIsScanning] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);

  // Fetch bad answers for analysis
  const { data: qaStats } = useQuery({
    queryKey: ['aeo-qa-stats'],
    queryFn: async () => {
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

  const { data: blogStats } = useQuery({
    queryKey: ['aeo-blog-stats'],
    queryFn: async () => {
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

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async ({ contentType, dryRun }: { contentType: ContentType; dryRun: boolean }) => {
      const { data, error } = await supabase.functions.invoke('regenerate-aeo-answers', {
        body: { contentType, batchSize: 10, dryRun, fixListsOnly: true },
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
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleScan = async (dryRun: boolean) => {
    setIsScanning(true);
    try {
      await scanMutation.mutateAsync({ contentType: activeTab, dryRun });
    } finally {
      setIsScanning(false);
    }
  };

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

        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Q&A Pages</CardTitle>
              <CardDescription>speakable_answer field</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total pages:</span>
                  <Badge variant="outline">{qaStats?.total || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">With list formatting:</span>
                  <Badge variant="destructive">{qaStats?.withLists || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Too long (&gt;150 words):</span>
                  <Badge variant="secondary">{qaStats?.tooLong || 0}</Badge>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Needs fixing:</span>
                  <Badge variant={qaStats?.needsFix ? 'destructive' : 'outline'}>
                    {qaStats?.needsFix || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Blog Articles</CardTitle>
              <CardDescription>speakable_answer field</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total articles:</span>
                  <Badge variant="outline">{blogStats?.total || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">With list formatting:</span>
                  <Badge variant="destructive">{blogStats?.withLists || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">Too long (&gt;150 words):</span>
                  <Badge variant="secondary">{blogStats?.tooLong || 0}</Badge>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Needs fixing:</span>
                  <Badge variant={blogStats?.needsFix ? 'destructive' : 'outline'}>
                    {blogStats?.needsFix || 0}
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
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
              <TabsList className="mb-4">
                <TabsTrigger value="qa_pages">Q&A Pages</TabsTrigger>
                <TabsTrigger value="blog_articles">Blog Articles</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleScan(true)}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview (Dry Run)
                </Button>
                <Button
                  onClick={() => handleScan(false)}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Fix 10 Items
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview Results */}
        {previewResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Results</CardTitle>
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
                        {result.question}
                      </span>
                      <Badge>{result.language}</Badge>
                    </div>
                    
                    {result.before && (
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-red-700 dark:text-red-400">Before</span>
                            <Badge variant="destructive" className="text-xs">
                              {result.before.words} words
                            </Badge>
                            {result.before.hasList && (
                              <Badge variant="destructive" className="text-xs">Has lists</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{result.before.text}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-green-700 dark:text-green-400">After</span>
                            <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900">
                              {result.after.words} words
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{result.after.text}</p>
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
