import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MergeRequest {
  primaryArticleId: string;
  duplicateArticleId: string;
  duplicateSlug: string;
  duplicateLanguage: string;
  mergeCitations: boolean;
}

interface MergeResult {
  success: boolean;
  goneUrlAdded: boolean;
  internalLinksUpdated: number;
  citationsMerged: number;
  error?: string;
}

export function useDuplicateMerge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MergeRequest): Promise<MergeResult> => {
      const { primaryArticleId, duplicateArticleId, duplicateSlug, duplicateLanguage, mergeCitations } = request;

      try {
        // 1. Add duplicate URL to gone_urls table
        const goneUrl = `/${duplicateLanguage}/blog/${duplicateSlug}`;
        const { error: goneError } = await supabase
          .from('gone_urls')
          .upsert({
            url_path: goneUrl,
            reason: 'duplicate_content',
            marked_gone_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }, { onConflict: 'url_path' });

        if (goneError) {
          console.error('Failed to add gone URL:', goneError);
          throw new Error(`Failed to mark as 410: ${goneError.message}`);
        }

        // 2. Find articles with internal links pointing to the duplicate
        const duplicateUrlPatterns = [
          `/${duplicateLanguage}/blog/${duplicateSlug}`,
          `/blog/${duplicateSlug}`,
        ];

        const { data: articlesWithLinks, error: fetchError } = await supabase
          .from('blog_articles')
          .select('id, internal_links')
          .not('internal_links', 'is', null);

        if (fetchError) {
          console.error('Failed to fetch articles with links:', fetchError);
        }

        let internalLinksUpdated = 0;

        // 3. Update internal links in affected articles
        if (articlesWithLinks) {
          const { data: primaryArticle } = await supabase
            .from('blog_articles')
            .select('slug, language')
            .eq('id', primaryArticleId)
            .single();

          if (primaryArticle) {
            const newUrl = `/${primaryArticle.language}/blog/${primaryArticle.slug}`;

            for (const article of articlesWithLinks) {
              if (!article.internal_links) continue;
              
              const links = article.internal_links as Array<{ url: string; text: string }>;
              let updated = false;
              
              const newLinks = links.map(link => {
                if (duplicateUrlPatterns.some(pattern => link.url.includes(pattern))) {
                  updated = true;
                  return { ...link, url: newUrl };
                }
                return link;
              });

              if (updated) {
                await supabase
                  .from('blog_articles')
                  .update({ internal_links: newLinks })
                  .eq('id', article.id);
                internalLinksUpdated++;
              }
            }
          }
        }

        // 4. Optionally merge citations from duplicate to primary
        let citationsMerged = 0;
        if (mergeCitations) {
          const { data: duplicateArticle } = await supabase
            .from('blog_articles')
            .select('external_citations')
            .eq('id', duplicateArticleId)
            .single();

          const { data: primaryArticle } = await supabase
            .from('blog_articles')
            .select('external_citations')
            .eq('id', primaryArticleId)
            .single();

          if (duplicateArticle?.external_citations && primaryArticle) {
            const existingCitations = (primaryArticle.external_citations as Array<{ url: string }>) || [];
            const dupCitations = (duplicateArticle.external_citations as Array<{ url: string; source: string; text: string }>) || [];
            
            const existingUrls = new Set(existingCitations.map(c => c.url));
            const newCitations = dupCitations.filter(c => !existingUrls.has(c.url));
            
            if (newCitations.length > 0) {
              const mergedCitations = [...existingCitations, ...newCitations];
              await supabase
                .from('blog_articles')
                .update({ external_citations: mergedCitations })
                .eq('id', primaryArticleId);
              citationsMerged = newCitations.length;
            }
          }
        }

        // 5. Mark duplicate article as archived/deleted
        await supabase
          .from('blog_articles')
          .update({ 
            status: 'archived',
            is_redirect: true,
            redirect_to: `/${duplicateLanguage}/blog/${duplicateSlug}`,
          })
          .eq('id', duplicateArticleId);

        return {
          success: true,
          goneUrlAdded: true,
          internalLinksUpdated,
          citationsMerged,
        };
      } catch (error) {
        console.error('Merge failed:', error);
        return {
          success: false,
          goneUrlAdded: false,
          internalLinksUpdated: 0,
          citationsMerged: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Articles merged successfully', {
          description: `410 added, ${result.internalLinksUpdated} links updated, ${result.citationsMerged} citations merged`,
        });
        queryClient.invalidateQueries({ queryKey: ['duplicate-detection'] });
      } else {
        toast.error('Merge failed', { description: result.error });
      }
    },
    onError: (error) => {
      toast.error('Merge failed', { description: error.message });
    },
  });
}
