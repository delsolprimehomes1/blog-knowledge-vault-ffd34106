import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  processWithRateLimit, 
  ProgressState, 
  BulkOperationResult, 
  BulkOperationCheckpoint,
  getCheckpoint,
  clearCheckpoint,
  API_RATE_LIMITS 
} from "@/lib/rateLimiter";

export type OperationType = 'fix_images' | 'fix_citations' | 'regenerate_all_images' | 'refresh_all_citations';

export interface BulkOperationState {
  isRunning: boolean;
  isPaused: boolean;
  progress: ProgressState | null;
  errors: Array<{ index: number; id: string; error: string }>;
  result: BulkOperationResult | null;
}

interface ArticleMinimal {
  id: string;
  headline: string;
  language?: string;
  detailed_content?: string;
}

export function useBulkOperation() {
  const queryClient = useQueryClient();
  const isPausedRef = useRef(false);
  const [pendingCheckpoint, setPendingCheckpoint] = useState<BulkOperationCheckpoint | null>(null);
  
  const [state, setState] = useState<BulkOperationState>({
    isRunning: false,
    isPaused: false,
    progress: null,
    errors: [],
    result: null,
  });

  // Check for pending checkpoint on mount
  useEffect(() => {
    const checkpoint = getCheckpoint();
    if (checkpoint) {
      setPendingCheckpoint(checkpoint);
    }
  }, []);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const reset = useCallback(() => {
    isPausedRef.current = false;
    clearCheckpoint();
    setPendingCheckpoint(null);
    setState({
      isRunning: false,
      isPaused: false,
      progress: null,
      errors: [],
      result: null,
    });
  }, []);

  const dismissCheckpoint = useCallback(() => {
    clearCheckpoint();
    setPendingCheckpoint(null);
  }, []);

  // Fix missing images mutation
  const fixMissingImagesMutation = useMutation({
    mutationFn: async (articleIds: string[] | undefined = undefined) => {
      setState(prev => ({ ...prev, isRunning: true, errors: [], result: null }));
      
      // Query articles missing images
      let query = supabase
        .from("blog_articles")
        .select("id, headline, language, cluster_id, funnel_stage")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      
      if (articleIds && articleIds.length > 0) {
        query = query.in("id", articleIds);
      } else {
        query = query.is("featured_image_url", null);
      }
      
      const { data: articles, error } = await query;
      
      if (error) throw error;
      if (!articles?.length) {
        toast.info("No articles missing images");
        return { success: 0, failed: 0, errors: [] };
      }

      toast.info(`Found ${articles.length} articles to process`);

      const result = await processWithRateLimit<ArticleMinimal>(
        articles,
        async (article) => {
          const { error } = await supabase.functions.invoke('regenerate-article-image', {
            body: { articleId: article.id }
          });
          if (error) throw error;
        },
        {
          delayMs: API_RATE_LIMITS.FAL_AI.delayMs,
          onProgress: (progress) => setState(prev => ({ ...prev, progress })),
          isPausedRef,
          operationType: 'fix_images',
        }
      );

      return result;
    },
    onSuccess: (result) => {
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        result,
        errors: result.errors 
      }));
      queryClient.invalidateQueries({ queryKey: ["cluster-manager-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-image-health"] });
      
      if (result.failed > 0) {
        toast.warning(`Completed: ${result.success} succeeded, ${result.failed} failed`);
      } else {
        toast.success(`Successfully regenerated ${result.success} images`);
      }
    },
    onError: (error) => {
      setState(prev => ({ ...prev, isRunning: false }));
      toast.error(`Operation failed: ${error.message}`);
    },
  });

  // Fix missing citations mutation
  const fixMissingCitationsMutation = useMutation({
    mutationFn: async (articleIds: string[] | undefined = undefined) => {
      setState(prev => ({ ...prev, isRunning: true, errors: [], result: null }));
      
      // Query articles missing citations
      let query = supabase
        .from("blog_articles")
        .select("id, headline, language, detailed_content, cluster_id")
        .eq("status", "published");
      
      if (articleIds && articleIds.length > 0) {
        query = query.in("id", articleIds);
      } else {
        query = query.or("external_citations.is.null,external_citations.eq.[]");
      }
      
      const { data: articles, error } = await query;
      
      if (error) throw error;
      if (!articles?.length) {
        toast.info("No articles missing citations");
        return { success: 0, failed: 0, errors: [] };
      }

      toast.info(`Found ${articles.length} articles to process`);

      const result = await processWithRateLimit<ArticleMinimal>(
        articles,
        async (article) => {
          const { data, error } = await supabase.functions.invoke('find-citations-perplexity', {
            body: { 
              articleId: article.id,
              articleTopic: article.headline,
              articleContent: article.detailed_content?.substring(0, 3000) || '',
              articleLanguage: article.language
            }
          });
          if (error) throw error;
          
          // Update article with citations
          if (data?.citations?.length) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ external_citations: data.citations })
              .eq('id', article.id);
            if (updateError) throw updateError;
          }
        },
        {
          delayMs: API_RATE_LIMITS.PERPLEXITY.delayMs,
          onProgress: (progress) => setState(prev => ({ ...prev, progress })),
          isPausedRef,
          operationType: 'fix_citations',
        }
      );

      return result;
    },
    onSuccess: (result) => {
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        result,
        errors: result.errors 
      }));
      queryClient.invalidateQueries({ queryKey: ["cluster-manager-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      
      if (result.failed > 0) {
        toast.warning(`Completed: ${result.success} succeeded, ${result.failed} failed`);
      } else {
        toast.success(`Successfully added citations to ${result.success} articles`);
      }
    },
    onError: (error) => {
      setState(prev => ({ ...prev, isRunning: false }));
      toast.error(`Operation failed: ${error.message}`);
    },
  });

  // Regenerate ALL images (with confirmation)
  const regenerateAllImagesMutation = useMutation({
    mutationFn: async () => {
      setState(prev => ({ ...prev, isRunning: true, errors: [], result: null }));
      
      const { data: articles, error } = await supabase
        .from("blog_articles")
        .select("id, headline, language, cluster_id, funnel_stage")
        .not("cluster_id", "is", null)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (!articles?.length) {
        toast.info("No articles found");
        return { success: 0, failed: 0, errors: [] };
      }

      toast.info(`Regenerating images for ${articles.length} articles. This will take a while...`);

      const result = await processWithRateLimit<ArticleMinimal>(
        articles,
        async (article) => {
          const { error } = await supabase.functions.invoke('regenerate-article-image', {
            body: { articleId: article.id }
          });
          if (error) throw error;
        },
        {
          delayMs: API_RATE_LIMITS.FAL_AI.delayMs,
          onProgress: (progress) => setState(prev => ({ ...prev, progress })),
          isPausedRef,
          operationType: 'regenerate_all_images',
        }
      );

      return result;
    },
    onSuccess: (result) => {
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        result,
        errors: result.errors 
      }));
      queryClient.invalidateQueries({ queryKey: ["cluster-manager-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-image-health"] });
      
      toast.success(`Regenerated ${result.success} images (${result.failed} failed)`);
    },
    onError: (error) => {
      setState(prev => ({ ...prev, isRunning: false }));
      toast.error(`Operation failed: ${error.message}`);
    },
  });

  // Refresh ALL citations (with confirmation)
  const refreshAllCitationsMutation = useMutation({
    mutationFn: async () => {
      setState(prev => ({ ...prev, isRunning: true, errors: [], result: null }));
      
      const { data: articles, error } = await supabase
        .from("blog_articles")
        .select("id, headline, language, detailed_content, cluster_id")
        .not("cluster_id", "is", null)
        .eq("status", "published");
      
      if (error) throw error;
      if (!articles?.length) {
        toast.info("No articles found");
        return { success: 0, failed: 0, errors: [] };
      }

      toast.info(`Refreshing citations for ${articles.length} articles. This will take a while...`);

      const result = await processWithRateLimit<ArticleMinimal>(
        articles,
        async (article) => {
          const { data, error } = await supabase.functions.invoke('find-citations-perplexity', {
            body: { 
              articleId: article.id,
              articleTopic: article.headline,
              articleContent: article.detailed_content?.substring(0, 3000) || '',
              articleLanguage: article.language
            }
          });
          if (error) throw error;
          
          if (data?.citations?.length) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ external_citations: data.citations })
              .eq('id', article.id);
            if (updateError) throw updateError;
          }
        },
        {
          delayMs: API_RATE_LIMITS.PERPLEXITY.delayMs,
          onProgress: (progress) => setState(prev => ({ ...prev, progress })),
          isPausedRef,
          operationType: 'refresh_all_citations',
        }
      );

      return result;
    },
    onSuccess: (result) => {
      setState(prev => ({ 
        ...prev, 
        isRunning: false, 
        result,
        errors: result.errors 
      }));
      queryClient.invalidateQueries({ queryKey: ["cluster-manager-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
      
      toast.success(`Refreshed citations for ${result.success} articles (${result.failed} failed)`);
    },
    onError: (error) => {
      setState(prev => ({ ...prev, isRunning: false }));
      toast.error(`Operation failed: ${error.message}`);
    },
  });

  return {
    state,
    pendingCheckpoint,
    pause,
    resume,
    reset,
    dismissCheckpoint,
    fixMissingImages: fixMissingImagesMutation.mutate,
    fixMissingCitations: fixMissingCitationsMutation.mutate,
    regenerateAllImages: regenerateAllImagesMutation.mutate,
    refreshAllCitations: refreshAllCitationsMutation.mutate,
    isFixingImages: fixMissingImagesMutation.isPending,
    isFixingCitations: fixMissingCitationsMutation.isPending,
    isRegeneratingAll: regenerateAllImagesMutation.isPending,
    isRefreshingAll: refreshAllCitationsMutation.isPending,
  };
}
