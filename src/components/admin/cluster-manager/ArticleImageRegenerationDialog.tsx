import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ImageIcon, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { getLanguageFlag } from "./types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArticleImageRegenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: string;
  clusterTheme?: string;
}

interface ArticleWithImage {
  id: string;
  headline: string;
  language: string;
  funnel_stage: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  featured_image_caption: string | null;
}

type RegenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export const ArticleImageRegenerationDialog = ({
  open,
  onOpenChange,
  clusterId,
  clusterTheme,
}: ArticleImageRegenerationDialogProps) => {
  const queryClient = useQueryClient();
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, RegenerationStatus>>({});
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Fetch articles for this cluster
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['cluster-articles-images', clusterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, language, funnel_stage, featured_image_url, featured_image_alt, featured_image_caption')
        .eq('cluster_id', clusterId)
        .order('language')
        .order('funnel_stage');
      
      if (error) throw error;
      return (data || []) as ArticleWithImage[];
    },
    enabled: open,
  });

  // Group articles by language
  const articlesByLanguage = articles.reduce((acc, article) => {
    if (!acc[article.language]) {
      acc[article.language] = [];
    }
    acc[article.language].push(article);
    return acc;
  }, {} as Record<string, ArticleWithImage[]>);

  const handleRegenerateImage = async (article: ArticleWithImage) => {
    setRegeneratingId(article.id);
    setStatusMap(prev => ({ ...prev, [article.id]: 'loading' }));

    try {
      toast.info(`Generating content-based image for "${article.headline.substring(0, 40)}..."`, {
        description: "This takes about 30-60 seconds",
      });

      const { data, error } = await supabase.functions.invoke('regenerate-article-image', {
        body: { articleId: article.id }
      });

      if (error) throw error;

      if (data.success) {
        setStatusMap(prev => ({ ...prev, [article.id]: 'success' }));
        setSuccessCount(prev => prev + 1);
        
        toast.success(`Image regenerated!`, {
          description: `${getLanguageFlag(article.language)} Alt: "${data.altText?.substring(0, 50)}..."`,
        });

        // Refresh article data
        queryClient.invalidateQueries({ queryKey: ['cluster-articles-images', clusterId] });
        queryClient.invalidateQueries({ queryKey: ['cluster-articles', clusterId] });
      } else {
        throw new Error(data.error || 'Regeneration failed');
      }
    } catch (error: any) {
      console.error('Image regeneration failed:', error);
      setStatusMap(prev => ({ ...prev, [article.id]: 'error' }));
      setErrorCount(prev => prev + 1);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setRegeneratingId(null);
    }
  };

  const getStatusIcon = (articleId: string) => {
    const status = statusMap[articleId];
    if (regeneratingId === articleId) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getFunnelBadgeColor = (stage: string) => {
    switch (stage) {
      case "TOFU":
        return "bg-blue-500";
      case "MOFU":
        return "bg-yellow-500";
      case "BOFU":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Smart Image Regeneration
          </DialogTitle>
          <DialogDescription>
            Regenerate images individually based on article content. Each image will have{" "}
            <strong>language-matched alt text and caption</strong> optimized for SEO/AEO.
          </DialogDescription>
        </DialogHeader>

        {(successCount > 0 || errorCount > 0) && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            {successCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{successCount} regenerated</span>
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                <span>{errorCount} failed</span>
              </div>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(articlesByLanguage).map(([lang, langArticles]) => (
                <div key={lang} className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2 sticky top-0 bg-background py-1">
                    <span className="text-lg">{getLanguageFlag(lang)}</span>
                    <span className="uppercase">{lang}</span>
                    <Badge variant="outline" className="text-xs">
                      {langArticles.length} articles
                    </Badge>
                  </h3>
                  
                  <div className="space-y-2">
                    {langArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                          {article.featured_image_url ? (
                            <img
                              src={article.featured_image_url}
                              alt={article.featured_image_alt || 'Article image'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=100';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge className={`${getFunnelBadgeColor(article.funnel_stage)} text-white text-xs`}>
                              {article.funnel_stage}
                            </Badge>
                            {getStatusIcon(article.id)}
                          </div>
                          <p className="text-sm font-medium truncate" title={article.headline}>
                            {article.headline}
                          </p>
                          {article.featured_image_alt && statusMap[article.id] !== 'success' && (
                            <p className="text-xs text-muted-foreground truncate">
                              Alt: {article.featured_image_alt.substring(0, 60)}...
                            </p>
                          )}
                        </div>

                        {/* Action */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateImage(article)}
                          disabled={regeneratingId !== null}
                          className="flex-shrink-0"
                        >
                          {regeneratingId === article.id ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              Regenerate
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {articles.length} articles • Images use Nano Banana Pro with content-based prompts
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
