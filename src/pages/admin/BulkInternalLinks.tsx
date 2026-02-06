import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, Loader2, Eye, CheckCircle, AlertCircle, Sparkles, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { BlogArticle, InternalLink } from "@/types/blog";

interface LinkSuggestion {
  articleId: string;
  links: InternalLink[];
  confidenceScore: number;
  status: 'pending' | 'applied';
}

interface GenerationResult {
  articleId: string;
  headline?: string;
  success: boolean;
  error?: string;
  linkCount: number;
}

export default function BulkInternalLinks() {
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [generatingArticles, setGeneratingArticles] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Record<string, LinkSuggestion>>({});
  const [previewArticle, setPreviewArticle] = useState<{ id: string; headline: string; links: InternalLink[] } | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [linkCountFilter, setLinkCountFilter] = useState<string>("0");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, completed: 0 });
  const [generationResults, setGenerationResults] = useState<GenerationResult[] | null>(null);
  const [showFailedArticles, setShowFailedArticles] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch articles needing links
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles-needing-links", languageFilter, linkCountFilter],
    queryFn: async () => {
      let query = supabase
        .from("blog_articles")
        .select("*")
        .eq("status", "published")
        .order("date_published", { ascending: false });

      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const maxLinks = parseInt(linkCountFilter);
      return (data || []).filter((article: any) => {
        const linkCount = article.internal_links?.length || 0;
        return linkCount <= maxLinks;
      }).map((article: any) => ({
        ...article,
        priority: calculatePriority(article)
      })).sort((a, b) => b.priority - a.priority);
    }
  });

  function calculatePriority(article: BlogArticle): number {
    let score = 0;
    const linkCount = article.internal_links?.length || 0;
    
    if (linkCount === 0) score += 100;
    else if (linkCount < 3) score += 50;
    else if (linkCount < 5) score += 25;
    
    if (article.funnel_stage === 'BOFU') score += 30;
    else if (article.funnel_stage === 'MOFU') score += 20;
    else score += 10;
    
    if (article.date_published) {
      const daysSince = Math.floor((Date.now() - new Date(article.date_published).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 30) score += 20;
      else if (daysSince < 90) score += 10;
    }
    
    if (article.language === 'fr') score += 15;
    
    return score;
  }

  const generateLinksMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      setGeneratingArticles(new Set(articleIds));
      
      const { data, error } = await supabase.functions.invoke('find-internal-links', {
        body: {
          mode: 'batch',
          articleIds: articleIds
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (data?.results) {
        const newSuggestions: Record<string, LinkSuggestion> = {};
        const results: GenerationResult[] = [];
        
        data.results.forEach((result: any) => {
          // Find the article headline for better error reporting
          const article = articles.find((a: BlogArticle) => a.id === result.articleId);
          
          if (result.success && result.links?.length > 0) {
            newSuggestions[result.articleId] = {
              articleId: result.articleId,
              links: result.links,
              confidenceScore: result.confidenceScore || 85,
              status: 'pending'
            };
          }
          
          results.push({
            articleId: result.articleId,
            headline: article?.headline || 'Unknown article',
            success: result.success,
            error: result.error,
            linkCount: result.linkCount || 0
          });
        });
        
        setSuggestions(prev => ({ ...prev, ...newSuggestions }));
        setGenerationResults(prev => prev ? [...prev, ...results] : results);
        
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        if (failedCount === results.length) {
          // All failed - show specific error
          const firstError = results.find(r => r.error)?.error || 'Unknown error';
          toast.error(`All ${failedCount} articles failed: ${firstError}`);
        } else if (failedCount > 0) {
          toast.warning(`Generated links for ${successCount} articles, ${failedCount} failed`);
        } else {
          toast.success(`Generated links for ${successCount} article${successCount !== 1 ? 's' : ''}`);
        }
      }
      setGeneratingArticles(new Set());
    },
    onError: (error: any) => {
      toast.error(`Failed to generate links: ${error.message}`);
      setGeneratingArticles(new Set());
    }
  });

  const applyLinksMutation = useMutation({
    mutationFn: async ({ articleId, links }: { articleId: string; links: InternalLink[] }) => {
      const article = articles.find((a: BlogArticle) => a.id === articleId);
      if (!article) throw new Error("Article not found");

      // Create revision backup
      await supabase.from('article_revisions').insert({
        article_id: articleId,
        revision_type: 'link_update',
        previous_content: article.detailed_content,
        previous_citations: JSON.parse(JSON.stringify(article.internal_links || [])),
        change_reason: 'Bulk internal link generation',
        can_rollback: true,
        rollback_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Merge with existing links
      const existingLinks = article.internal_links || [];
      const newLinks = links.filter(newLink => 
        !existingLinks.some((existing: InternalLink) => existing.url === newLink.url)
      );
      const updatedLinks = [...existingLinks, ...newLinks];

      // Update article
      const { error } = await supabase
        .from('blog_articles')
        .update({ internal_links: JSON.parse(JSON.stringify(updatedLinks)) })
        .eq('id', articleId);

      if (error) throw error;

      // Update suggestion status
      await supabase
        .from('internal_link_suggestions')
        .update({ 
          status: 'applied', 
          applied_at: new Date().toISOString()
        })
        .eq('article_id', articleId)
        .eq('status', 'pending');

      return { articleId, addedCount: newLinks.length };
    },
    onSuccess: ({ articleId, addedCount }) => {
      setSuggestions(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], status: 'applied' }
      }));
      queryClient.invalidateQueries({ queryKey: ["articles-needing-links"] });
      toast.success(`Added ${addedCount} new link${addedCount !== 1 ? 's' : ''}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to apply links: ${error.message}`);
    }
  });

  const handleSelectArticle = (articleId: string, checked: boolean) => {
    const newSelected = new Set(selectedArticles);
    if (checked) {
      newSelected.add(articleId);
    } else {
      newSelected.delete(articleId);
    }
    setSelectedArticles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedArticles(new Set(articles.map((a: BlogArticle) => a.id)));
    } else {
      setSelectedArticles(new Set());
    }
  };

  const handleBulkGenerate = async () => {
    const articleIds = Array.from(selectedArticles);
    if (articleIds.length === 0) {
      toast.error("Please select at least one article");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ total: articleIds.length, completed: 0 });
    setGenerationResults([]); // Reset results for new generation

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < articleIds.length; i += batchSize) {
      const batch = articleIds.slice(i, i + batchSize);
      await generateLinksMutation.mutateAsync(batch);
      setBulkProgress(prev => ({ ...prev, completed: prev.completed + batch.length }));
    }

    setBulkGenerating(false);
    setSelectedArticles(new Set());
    setShowFailedArticles(true); // Auto-expand failed articles section
  };

  const handleBulkApply = async () => {
    const applicableArticles = Array.from(selectedArticles).filter(id => 
      suggestions[id]?.status === 'pending' && suggestions[id]?.links?.length > 0
    );

    if (applicableArticles.length === 0) {
      toast.error("No articles with pending suggestions selected");
      return;
    }

    for (const articleId of applicableArticles) {
      await applyLinksMutation.mutateAsync({
        articleId,
        links: suggestions[articleId].links
      });
    }

    setSelectedArticles(new Set());
  };

  const getPriorityBadge = (linkCount: number) => {
    if (linkCount === 0) return <Badge variant="destructive" className="gap-1">🔴 Critical</Badge>;
    if (linkCount < 3) return <Badge variant="default" className="gap-1 bg-amber-500">🟡 Low</Badge>;
    return <Badge variant="secondary" className="gap-1">🟢 Fair</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bulk Internal Links</h1>
            <p className="text-muted-foreground mt-1">
              Generate and apply contextual internal links to improve SEO and navigation
            </p>
          </div>
          {selectedArticles.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedArticles.size} selected
              </span>
              <Button onClick={handleBulkGenerate} disabled={bulkGenerating}>
                {bulkGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Links
                  </>
                )}
              </Button>
              <Button onClick={handleBulkApply} variant="secondary">
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply All
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>

              <Select value={linkCountFilter} onValueChange={setLinkCountFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Max Links" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 links only</SelectItem>
                  <SelectItem value="2">0-2 links</SelectItem>
                  <SelectItem value="4">0-4 links</SelectItem>
                  <SelectItem value="9">0-9 links</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        {bulkGenerating && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Generating links...</span>
                  <span>{bulkProgress.completed} / {bulkProgress.total}</span>
                </div>
                <Progress value={(bulkProgress.completed / bulkProgress.total) * 100} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Results Card */}
        {generationResults && generationResults.length > 0 && !bulkGenerating && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Generation Results
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => setGenerationResults(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {generationResults.filter(r => r.success).length} succeeded
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {generationResults.filter(r => !r.success).length} failed
                </Badge>
              </div>
              
              {generationResults.some(r => !r.success) && (
                <Collapsible open={showFailedArticles} onOpenChange={setShowFailedArticles}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-900">
                    {showFailedArticles ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    View failed articles ({generationResults.filter(r => !r.success).length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {generationResults.filter(r => !r.success).map((result) => (
                      <div key={result.articleId} className="flex items-start justify-between py-2 px-3 bg-white rounded border border-amber-200">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{result.headline}</span>
                        </div>
                        <span className="text-red-600 text-sm ml-4 max-w-[300px] text-right">{result.error || 'Unknown error'}</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {/* Articles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Articles Needing Links ({articles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All articles have adequate internal links!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center gap-4 pb-2 border-b font-medium text-sm">
                  <Checkbox
                    checked={selectedArticles.size === articles.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <div className="flex-1 grid grid-cols-6 gap-4">
                    <span className="col-span-2">Article</span>
                    <span>Language</span>
                    <span>Links</span>
                    <span>Priority</span>
                    <span className="text-right">Actions</span>
                  </div>
                </div>

                {/* Rows */}
                {articles.map((article: BlogArticle & { priority: number }) => {
                  const linkCount = article.internal_links?.length || 0;
                  const isGenerating = generatingArticles.has(article.id);
                  const suggestion = suggestions[article.id];
                  const hasApplied = suggestion?.status === 'applied';

                  return (
                    <div key={article.id} className="flex items-center gap-4 py-3 border-b last:border-0 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedArticles.has(article.id)}
                        onCheckedChange={(checked) => handleSelectArticle(article.id, checked as boolean)}
                      />
                      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                        <div className="col-span-2">
                          <p className="font-medium line-clamp-1">{article.headline}</p>
                          <p className="text-xs text-muted-foreground">{article.slug}</p>
                        </div>
                        <Badge variant="outline">{article.language.toUpperCase()}</Badge>
                        <span className="text-sm">{linkCount} links</span>
                        {getPriorityBadge(linkCount)}
                        <div className="flex justify-end gap-2">
                          {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : hasApplied ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : suggestion ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewArticle({
                                  id: article.id,
                                  headline: article.headline,
                                  links: suggestion.links
                                })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => applyLinksMutation.mutate({
                                  articleId: article.id,
                                  links: suggestion.links
                                })}
                              >
                                Apply
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateLinksMutation.mutate([article.id])}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewArticle} onOpenChange={() => setPreviewArticle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Suggestions</DialogTitle>
            <DialogDescription>{previewArticle?.headline}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {previewArticle?.links.map((link, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="font-medium">{link.text}</p>
                    <p className="text-sm text-muted-foreground">→ {link.title}</p>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      {link.url}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewArticle(null)}>Close</Button>
            <Button onClick={() => {
              if (previewArticle) {
                applyLinksMutation.mutate({
                  articleId: previewArticle.id,
                  links: previewArticle.links
                });
                setPreviewArticle(null);
              }
            }}>
              Apply Links
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
