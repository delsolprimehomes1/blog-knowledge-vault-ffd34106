import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClusterManagerStats {
  // Overview
  totalClusters: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  publishedPercent: number;
  languageCount: number;
  
  // Content Health
  articlesWithImages: number;
  articlesMissingImages: number;
  articlesWithCitations: number;
  articlesMissingCitations: number;
  
  // Validation
  wordCountTooShort: number;
  wordCountTooLong: number;
  wordCountOk: number;
  missingFaqSchema: number;
  
  // By language breakdown
  languageBreakdown: Record<string, { total: number; published: number; draft: number }>;
  
  // By funnel stage
  funnelBreakdown: Record<string, number>;
  
  // Missing data articles for bulk operations
  articlesMissingImagesIds: string[];
  articlesMissingCitationsIds: string[];
}

export function useClusterManagerStats() {
  return useQuery({
    queryKey: ["cluster-manager-stats"],
    queryFn: async (): Promise<ClusterManagerStats> => {
      // Fetch all clustered articles with required fields for stats
      const { data: articles, error } = await supabase
        .from("blog_articles")
        .select(`
          id, 
          cluster_id, 
          language, 
          status, 
          funnel_stage,
          featured_image_url, 
          external_citations,
          qa_entities,
          detailed_content
        `)
        .not("cluster_id", "is", null);

      if (error) throw error;
      if (!articles) return getEmptyStats();

      // Calculate stats
      const uniqueClusters = new Set(articles.map(a => a.cluster_id));
      const languages = new Set(articles.map(a => a.language));
      
      const publishedArticles = articles.filter(a => a.status === "published");
      const draftArticles = articles.filter(a => a.status === "draft");
      
      // Image stats
      const withImages = articles.filter(a => a.featured_image_url);
      const missingImages = articles.filter(a => !a.featured_image_url);
      
      // Citation stats
      const withCitations = articles.filter(a => {
        const citations = a.external_citations as any[] | null;
        return citations && Array.isArray(citations) && citations.length > 0;
      });
      const missingCitations = articles.filter(a => {
        const citations = a.external_citations as any[] | null;
        return !citations || !Array.isArray(citations) || citations.length === 0;
      });
      
      // Word count helper
      const countWords = (html: string): number => {
        const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return text.split(/\s+/).filter(w => w.length > 0).length;
      };
      
      // Word count stats
      let wordCountTooShort = 0;
      let wordCountTooLong = 0;
      let wordCountOk = 0;
      
      articles.forEach(a => {
        const wordCount = countWords(a.detailed_content || '');
        if (wordCount < 1500) wordCountTooShort++;
        else if (wordCount > 2500) wordCountTooLong++;
        else wordCountOk++;
      });
      
      // FAQ schema
      const missingFaqSchema = articles.filter(a => {
        const qa = a.qa_entities as any[] | null;
        return !qa || !Array.isArray(qa) || qa.length === 0;
      }).length;
      
      // Language breakdown
      const languageBreakdown: Record<string, { total: number; published: number; draft: number }> = {};
      articles.forEach(a => {
        if (!languageBreakdown[a.language]) {
          languageBreakdown[a.language] = { total: 0, published: 0, draft: 0 };
        }
        languageBreakdown[a.language].total++;
        if (a.status === "published") languageBreakdown[a.language].published++;
        if (a.status === "draft") languageBreakdown[a.language].draft++;
      });
      
      // Funnel breakdown
      const funnelBreakdown: Record<string, number> = {};
      articles.forEach(a => {
        const stage = a.funnel_stage || 'unknown';
        funnelBreakdown[stage] = (funnelBreakdown[stage] || 0) + 1;
      });

      return {
        totalClusters: uniqueClusters.size,
        totalArticles: articles.length,
        publishedArticles: publishedArticles.length,
        draftArticles: draftArticles.length,
        publishedPercent: articles.length > 0 
          ? Math.round((publishedArticles.length / articles.length) * 100) 
          : 0,
        languageCount: languages.size,
        
        articlesWithImages: withImages.length,
        articlesMissingImages: missingImages.length,
        articlesWithCitations: withCitations.length,
        articlesMissingCitations: missingCitations.length,
        
        wordCountTooShort,
        wordCountTooLong,
        wordCountOk,
        missingFaqSchema,
        
        languageBreakdown,
        funnelBreakdown,
        
        articlesMissingImagesIds: missingImages.map(a => a.id),
        articlesMissingCitationsIds: missingCitations.map(a => a.id),
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

function getEmptyStats(): ClusterManagerStats {
  return {
    totalClusters: 0,
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    publishedPercent: 0,
    languageCount: 0,
    articlesWithImages: 0,
    articlesMissingImages: 0,
    articlesWithCitations: 0,
    articlesMissingCitations: 0,
    wordCountTooShort: 0,
    wordCountTooLong: 0,
    wordCountOk: 0,
    missingFaqSchema: 0,
    languageBreakdown: {},
    funnelBreakdown: {},
    articlesMissingImagesIds: [],
    articlesMissingCitationsIds: [],
  };
}
