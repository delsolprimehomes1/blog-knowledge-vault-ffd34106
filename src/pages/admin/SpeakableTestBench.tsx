import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Sparkles,
  FileText,
  Check,
  X,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Article {
  id: string;
  headline: string;
  language: string;
  speakable_answer: string;
  detailed_content: string;
}

interface TestResult {
  original: {
    text: string;
    wordCount: number;
    hasList: boolean;
  };
  regenerated: {
    text: string;
    wordCount: number;
    hasList: boolean;
  };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'German', nl: 'Dutch', fr: 'French',
  pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian',
  fi: 'Finnish', no: 'Norwegian',
};

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0).length;
}

function hasBadFormatting(text: string): boolean {
  const patterns = [
    /^\d+\.\s/m,
    /^[-*•]\s/m,
    /\n\s*\d+\.\s/,
    /\n\s*[-*•]\s/,
  ];
  return patterns.some(p => p.test(text));
}

export default function SpeakableTestBench() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fetchUnderweightArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, language, speakable_answer, detailed_content')
        .eq('status', 'published')
        .eq('language', selectedLanguage)
        .not('speakable_answer', 'is', null)
        .limit(50);

      if (error) throw error;

      // Filter for underweight (< 80 words) or bad formatting
      const underweight = (data || []).filter(article => {
        const wordCount = countWords(article.speakable_answer || '');
        return wordCount < 80 || hasBadFormatting(article.speakable_answer || '');
      });

      setArticles(underweight);
      setSelectedArticle(null);
      setTestResult(null);

    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch articles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnderweightArticles();
  }, [selectedLanguage]);

  const testRegeneration = async () => {
    if (!selectedArticle) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await supabase.functions.invoke('regenerate-aeo-answers', {
        body: {
          articleId: selectedArticle.id,
          contentType: 'blog_articles',
          dryRun: true
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      if (data.results?.details?.[0]) {
        const detail = data.results.details[0];
        setTestResult({
          original: {
            text: selectedArticle.speakable_answer,
            wordCount: countWords(selectedArticle.speakable_answer),
            hasList: hasBadFormatting(selectedArticle.speakable_answer)
          },
          regenerated: {
            text: detail.after?.text?.replace('...', '') || detail.newAnswer || '',
            wordCount: detail.after?.words || 0,
            hasList: detail.after?.hasList || false
          }
        });
      } else {
        throw new Error('No regeneration result returned');
      }

    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const applyRegeneration = async () => {
    if (!selectedArticle || !testResult) return;

    setApplying(true);

    try {
      const response = await supabase.functions.invoke('regenerate-aeo-answers', {
        body: {
          articleId: selectedArticle.id,
          contentType: 'blog_articles',
          dryRun: false,
          batchSize: 1
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Applied Successfully",
        description: "The regenerated speakable answer has been saved.",
      });

      // Refresh the list
      await fetchUnderweightArticles();
      setTestResult(null);
      setSelectedArticle(null);

    } catch (error) {
      console.error('Apply error:', error);
      toast({
        title: "Apply Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setApplying(false);
    }
  };

  const getWordCountBadge = (count: number) => {
    if (count >= 80 && count <= 120) {
      return <Badge className="bg-green-100 text-green-800">{count} words ✓</Badge>;
    } else if (count < 80) {
      return <Badge className="bg-red-100 text-red-800">{count} words (too short)</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">{count} words (long)</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Speakable Test Bench</h1>
            <p className="text-muted-foreground mt-1">
              Test AEO speakable answer regeneration on individual articles before bulk updates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchUnderweightArticles} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Underweight Articles ({LANGUAGE_NAMES[selectedLanguage]})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Below 80 words or with list formatting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Target Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">80-120 words</div>
              <p className="text-xs text-muted-foreground mt-1">
                Single paragraph, factual verdict style
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Article Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Article to Test
              </CardTitle>
              <CardDescription>
                Choose an underweight article to preview the regeneration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-3" />
                  <p className="text-green-600 font-medium">All articles meet AEO standards!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No underweight speakable answers found in {LANGUAGE_NAMES[selectedLanguage]}.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Headline</TableHead>
                        <TableHead>Words</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articles.map(article => {
                        const wordCount = countWords(article.speakable_answer || '');
                        const hasList = hasBadFormatting(article.speakable_answer || '');
                        const isSelected = selectedArticle?.id === article.id;
                        
                        return (
                          <TableRow 
                            key={article.id}
                            className={`cursor-pointer ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                            onClick={() => {
                              setSelectedArticle(article);
                              setTestResult(null);
                            }}
                          >
                            <TableCell className="max-w-[250px] truncate font-medium">
                              {article.headline}
                            </TableCell>
                            <TableCell>
                              <Badge variant={wordCount < 80 ? "destructive" : "secondary"}>
                                {wordCount}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {wordCount < 80 && (
                                  <Badge variant="outline" className="text-xs">Short</Badge>
                                )}
                                {hasList && (
                                  <Badge variant="outline" className="text-xs">Lists</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Test Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Regeneration Preview
              </CardTitle>
              <CardDescription>
                {selectedArticle 
                  ? `Testing: ${selectedArticle.headline.substring(0, 50)}...`
                  : 'Select an article to test regeneration'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedArticle ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>← Select an article to begin testing</p>
                </div>
              ) : (
                <>
                  <Button 
                    onClick={testRegeneration} 
                    disabled={testing}
                    className="w-full"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Preview
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <div className="space-y-4">
                      {/* Original */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Current</span>
                          <div className="flex gap-2">
                            {getWordCountBadge(testResult.original.wordCount)}
                            {testResult.original.hasList && (
                              <Badge variant="destructive">Has Lists</Badge>
                            )}
                          </div>
                        </div>
                        <Textarea 
                          value={testResult.original.text}
                          readOnly
                          className="min-h-[120px] text-sm bg-muted"
                        />
                      </div>

                      <div className="flex justify-center">
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      </div>

                      {/* Regenerated */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-primary">Regenerated (AEO Compliant)</span>
                          <div className="flex gap-2">
                            {getWordCountBadge(testResult.regenerated.wordCount)}
                            {testResult.regenerated.hasList ? (
                              <Badge variant="destructive">Has Lists</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">No Lists ✓</Badge>
                            )}
                          </div>
                        </div>
                        <Textarea 
                          value={testResult.regenerated.text}
                          readOnly
                          className="min-h-[120px] text-sm border-primary"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={applyRegeneration}
                          disabled={applying}
                          className="flex-1"
                        >
                          {applying ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Apply This Version
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setTestResult(null);
                            setSelectedArticle(null);
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-start gap-4 py-4">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Hans' AEO Rules (Enforced)</p>
              <ul className="mt-1 space-y-1 text-blue-700">
                <li>• Single paragraph "verdict" format (80-120 words, max 150)</li>
                <li>• NO lists, bullets, or numbered points</li>
                <li>• Neutral, factual tone (no "we", no marketing language)</li>
                <li>• Self-contained content that AI can quote verbatim</li>
                <li>• Complete sentences ending with period</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
