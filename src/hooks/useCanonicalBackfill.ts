import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BASE_URL = "https://www.delsolprimehomes.com";

export interface MissingCanonical {
  id: string;
  type: 'blog' | 'qa' | 'comparison' | 'location';
  headline: string;
  slug: string;
  language: string;
  currentCanonical: string | null;
  expectedCanonical: string;
  status: string;
}

export interface BackfillStats {
  total: number;
  byType: {
    blog: number;
    qa: number;
    comparison: number;
    location: number;
  };
  byLanguage: Record<string, number>;
}

function buildCanonicalUrl(type: string, language: string, slug: string, city?: string): string {
  switch (type) {
    case 'blog':
      return `${BASE_URL}/${language}/blog/${slug}`;
    case 'qa':
      return `${BASE_URL}/${language}/qa/${slug}`;
    case 'comparison':
      return `${BASE_URL}/${language}/compare/${slug}`;
    case 'location':
      return city 
        ? `${BASE_URL}/${language}/locations/${city}/${slug}`
        : `${BASE_URL}/${language}/locations/${slug}`;
    default:
      return `${BASE_URL}/${language}/${slug}`;
  }
}

export function useMissingCanonicals() {
  return useQuery({
    queryKey: ['missing-canonicals'],
    queryFn: async (): Promise<{ items: MissingCanonical[]; stats: BackfillStats }> => {
      const items: MissingCanonical[] = [];

      // Fetch blog articles with missing/invalid canonical
      const { data: blogs, error: blogError } = await supabase
        .from('blog_articles')
        .select('id, headline, slug, language, canonical_url, status')
        .eq('status', 'published')
        .or(`canonical_url.is.null,canonical_url.eq.,canonical_url.not.like.${BASE_URL}%`);

      if (blogError) throw blogError;

      for (const article of blogs || []) {
        const expected = buildCanonicalUrl('blog', article.language, article.slug);
        if (article.canonical_url !== expected) {
          items.push({
            id: article.id,
            type: 'blog',
            headline: article.headline,
            slug: article.slug,
            language: article.language,
            currentCanonical: article.canonical_url,
            expectedCanonical: expected,
            status: article.status,
          });
        }
      }

      // Fetch Q&A pages with missing canonical
      const { data: qas, error: qaError } = await supabase
        .from('qa_pages')
        .select('id, title, slug, language, canonical_url, status')
        .eq('status', 'published')
        .or(`canonical_url.is.null,canonical_url.eq.,canonical_url.not.like.${BASE_URL}%`);

      if (qaError) throw qaError;

      for (const qa of qas || []) {
        const expected = buildCanonicalUrl('qa', qa.language, qa.slug);
        if (qa.canonical_url !== expected) {
          items.push({
            id: qa.id,
            type: 'qa',
            headline: qa.title,
            slug: qa.slug,
            language: qa.language,
            currentCanonical: qa.canonical_url,
            expectedCanonical: expected,
            status: qa.status,
          });
        }
      }

      // Fetch comparison pages with missing canonical
      const { data: comparisons, error: compError } = await supabase
        .from('comparison_pages')
        .select('id, headline, slug, language, canonical_url, status')
        .eq('status', 'published')
        .or(`canonical_url.is.null,canonical_url.eq.,canonical_url.not.like.${BASE_URL}%`);

      if (compError) throw compError;

      for (const comp of comparisons || []) {
        const expected = buildCanonicalUrl('comparison', comp.language || 'en', comp.slug);
        if (comp.canonical_url !== expected) {
          items.push({
            id: comp.id,
            type: 'comparison',
            headline: comp.headline,
            slug: comp.slug,
            language: comp.language || 'en',
            currentCanonical: comp.canonical_url,
            expectedCanonical: expected,
            status: comp.status || 'published',
          });
        }
      }

      // Calculate stats
      const stats: BackfillStats = {
        total: items.length,
        byType: {
          blog: items.filter(i => i.type === 'blog').length,
          qa: items.filter(i => i.type === 'qa').length,
          comparison: items.filter(i => i.type === 'comparison').length,
          location: items.filter(i => i.type === 'location').length,
        },
        byLanguage: {},
      };

      for (const item of items) {
        stats.byLanguage[item.language] = (stats.byLanguage[item.language] || 0) + 1;
      }

      return { items, stats };
    },
  });
}

export function useCanonicalBackfill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: MissingCanonical[]): Promise<{ success: number; failed: number; errors: string[] }> => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            let error: Error | null = null;
            
            switch (item.type) {
              case 'blog': {
                const result = await supabase
                  .from('blog_articles')
                  .update({ canonical_url: item.expectedCanonical })
                  .eq('id', item.id);
                if (result.error) error = result.error;
                break;
              }
              case 'qa': {
                const result = await supabase
                  .from('qa_pages')
                  .update({ canonical_url: item.expectedCanonical })
                  .eq('id', item.id);
                if (result.error) error = result.error;
                break;
              }
              case 'comparison': {
                const result = await supabase
                  .from('comparison_pages')
                  .update({ canonical_url: item.expectedCanonical })
                  .eq('id', item.id);
                if (result.error) error = result.error;
                break;
              }
              case 'location': {
                const result = await supabase
                  .from('location_pages')
                  .update({ canonical_url: item.expectedCanonical })
                  .eq('id', item.id);
                if (result.error) error = result.error;
                break;
              }
              default:
                throw new Error(`Unknown type: ${item.type}`);
            }

            if (error) {
              throw error;
            }
            success++;
          } catch (error) {
            failed++;
            errors.push(`${item.type}/${item.slug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return { success, failed, errors };
    },
    onSuccess: (result) => {
      if (result.failed === 0) {
        toast.success('Canonical URLs backfilled', {
          description: `${result.success} URLs updated successfully`,
        });
      } else {
        toast.warning('Backfill completed with errors', {
          description: `${result.success} succeeded, ${result.failed} failed`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['missing-canonicals'] });
    },
    onError: (error) => {
      toast.error('Backfill failed', { description: error.message });
    },
  });
}
