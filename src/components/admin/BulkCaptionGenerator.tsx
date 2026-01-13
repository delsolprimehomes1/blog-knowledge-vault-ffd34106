import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Image, Loader2, Play, Eye, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface CaptionResult {
  id: string;
  headline: string;
  language: string;
  caption?: string;
  error?: string;
}

const LANGUAGES = [
  { value: 'all', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'nl', label: 'Dutch' },
  { value: 'fr', label: 'French' },
  { value: 'sv', label: 'Swedish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'pl', label: 'Polish' },
  { value: 'hu', label: 'Hungarian' },
];

const BATCH_SIZES = [5, 10, 20, 50];

export function BulkCaptionGenerator() {
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [batchSize, setBatchSize] = useState(10);
  const [results, setResults] = useState<CaptionResult[]>([]);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Query for articles missing captions
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['missing-captions-stats', selectedLanguage],
    queryFn: async () => {
      let query = supabase
        .from('blog_articles')
        .select('language', { count: 'exact' })
        .eq('status', 'published')
        .or('featured_image_caption.is.null,featured_image_caption.eq.N/A,featured_image_caption.eq.null,featured_image_caption.eq.N.v.t.');

      if (selectedLanguage !== 'all') {
        query = query.eq('language', selectedLanguage);
      }

      const { count } = await query;
      
      // Get breakdown by language
      const { data: breakdown } = await supabase
        .from('blog_articles')
        .select('language')
        .eq('status', 'published')
        .or('featured_image_caption.is.null,featured_image_caption.eq.N/A,featured_image_caption.eq.null,featured_image_caption.eq.N.v.t.');

      const languageCounts: Record<string, number> = {};
      breakdown?.forEach(article => {
        languageCounts[article.language] = (languageCounts[article.language] || 0) + 1;
      });

      return {
        total: count || 0,
        byLanguage: languageCounts
      };
    }
  });

  // Preview mutation (dry run)
  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-missing-captions', {
        body: {
          batchSize: Math.min(batchSize, 5), // Preview max 5
          language: selectedLanguage,
          dryRun: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      toast.success(`Preview generated for ${data.processed} articles`);
    },
    onError: (error: Error) => {
      toast.error(`Preview failed: ${error.message}`);
    }
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-missing-captions', {
        body: {
          batchSize,
          language: selectedLanguage,
          dryRun: false
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResults(prev => [...data.results, ...prev].slice(0, 100)); // Keep last 100
      setTotalProcessed(prev => prev + data.successful);
      refetchStats();
      
      if (data.remaining > 0 && isRunning) {
        // Continue processing
        setTimeout(() => {
          if (isRunning) {
            generateMutation.mutate();
          }
        }, 2000);
      } else {
        setIsRunning(false);
        toast.success(`Completed! Generated ${data.successful} captions.`);
      }
    },
    onError: (error: Error) => {
      setIsRunning(false);
      toast.error(`Generation failed: ${error.message}`);
    }
  });

  const handleStart = () => {
    setIsRunning(true);
    setTotalProcessed(0);
    setResults([]);
    generateMutation.mutate();
  };

  const handleStop = () => {
    setIsRunning(false);
    toast.info('Stopping after current batch completes...');
  };

  const progressPercentage = stats?.total 
    ? Math.min(100, (totalProcessed / stats.total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Bulk Caption Generator
        </CardTitle>
        <CardDescription>
          Generate missing image captions for published articles using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats?.total || 0}</strong> articles are missing captions
            {selectedLanguage !== 'all' && ` (${selectedLanguage.toUpperCase()})`}
          </AlertDescription>
        </Alert>

        {/* Language breakdown */}
        {stats?.byLanguage && Object.keys(stats.byLanguage).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byLanguage)
              .sort((a, b) => b[1] - a[1])
              .map(([lang, count]) => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang.toUpperCase()}: {count}
                </Badge>
              ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">Language Filter</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium mb-2 block">Batch Size</label>
            <Select value={batchSize.toString()} onValueChange={(v) => setBatchSize(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BATCH_SIZES.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} articles
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress */}
        {(isRunning || totalProcessed > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{totalProcessed} / {stats?.total || 0} ({progressPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending || isRunning}
          >
            {previewMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview Batch
              </>
            )}
          </Button>

          {!isRunning ? (
            <Button
              onClick={handleStart}
              disabled={generateMutation.isPending || !stats?.total}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Captions
                </>
              )}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleStop}>
              Stop
            </Button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Activity</h4>
            <ScrollArea className="h-[200px] border rounded-lg p-3">
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div key={`${result.id}-${idx}`} className="flex items-start gap-2 text-sm">
                    {result.caption ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="text-xs mr-2">
                        {result.language.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {result.headline.substring(0, 40)}...
                      </span>
                      {result.caption && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{result.caption}"
                        </p>
                      )}
                      {result.error && (
                        <p className="text-xs text-red-500 mt-1">
                          Error: {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Estimated time */}
        {stats?.total && stats.total > 0 && (
          <p className="text-xs text-muted-foreground">
            Estimated time for all articles: ~{Math.ceil(stats.total / 60)} minutes 
            ({stats.total} articles × ~1 second each)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
