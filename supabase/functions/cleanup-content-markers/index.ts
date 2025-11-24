import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  article_ids: string[];
  backup_enabled: boolean;
  user_id: string;
  dry_run?: boolean;
}

interface CleanupResult {
  article_id: string;
  headline: string;
  success: boolean;
  changes_made: {
    citations_replaced: number;
    citations_removed: number;
    internal_links_replaced: number;
    internal_links_removed: number;
    code_fences_removed: number;
  };
  preview?: {
    before: string;
    after: string;
  };
  error?: string;
}

async function findCitation(searchTerm: string, language: string, perplexityKey: string): Promise<{ url: string; source: string } | null> {
  try {
    const prompt = `Find ONE highly authoritative source about: "${searchTerm}"
    
Language: ${language}
Priority: Government sources (.gov), WHO, EU institutions, national health authorities
Return ONLY a JSON object with this exact structure:
{"url": "https://...", "source": "Source Name"}

If no good source exists, return: {"url": null, "source": null}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a citation finder. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*?\})/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[1]);
    if (result.url && result.source) {
      return { url: result.url, source: result.source };
    }
    return null;
  } catch (error) {
    console.error('Error finding citation:', error);
    return null;
  }
}

async function findInternalLink(searchTerm: string, language: string, currentArticleId: string, supabase: any): Promise<{ url: string; text: string } | null> {
  try {
    // Search for matching articles in the same language
    const { data: articles } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, meta_description')
      .eq('language', language)
      .eq('status', 'published')
      .neq('id', currentArticleId)
      .limit(50);

    if (!articles || articles.length === 0) return null;

    // Simple keyword matching - find best match
    const searchTermLower = searchTerm.toLowerCase();
    const keywords = searchTermLower.split(/\s+/).filter(w => w.length > 3);

    let bestMatch = null;
    let bestScore = 0;

    for (const article of articles) {
      const combinedText = `${article.headline} ${article.meta_description || ''}`.toLowerCase();
      let score = 0;

      // Count keyword matches
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          score += 1;
        }
      }

      // Bonus if headline contains search term
      if (article.headline.toLowerCase().includes(searchTermLower)) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = article;
      }
    }

    // Require at least 2 keyword matches or exact phrase match
    if (bestScore >= 2 && bestMatch) {
      return {
        url: `/blog/${bestMatch.slug}`,
        text: bestMatch.headline,
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding internal link:', error);
    return null;
  }
}

function cleanCodeFences(content: string): { cleaned: string; removedCount: number } {
  let cleaned = content;
  let count = 0;

  // Remove leading code fence with language identifier
  const leadingPattern = /^```[\w]*\n/;
  if (leadingPattern.test(cleaned)) {
    cleaned = cleaned.replace(leadingPattern, '');
    count++;
  }

  // Remove trailing code fence
  const trailingPattern = /```$/;
  if (trailingPattern.test(cleaned)) {
    cleaned = cleaned.replace(trailingPattern, '');
    count++;
  }

  return { cleaned, removedCount: count };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_ids, backup_enabled, user_id, dry_run }: CleanupRequest = await req.json();

    if (!article_ids || article_ids.length === 0) {
      throw new Error('No article IDs provided');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🧹 Starting cleanup for ${article_ids.length} articles (dry_run: ${dry_run})`);

    const results: CleanupResult[] = [];

    for (const articleId of article_ids) {
      try {
        // Fetch article
        const { data: article, error: fetchError } = await supabase
          .from('blog_articles')
          .select('id, headline, detailed_content, language, updated_at')
          .eq('id', articleId)
          .single();

        if (fetchError || !article) {
          results.push({
            article_id: articleId,
            headline: 'Unknown',
            success: false,
            changes_made: { citations_replaced: 0, citations_removed: 0, internal_links_replaced: 0, internal_links_removed: 0, code_fences_removed: 0 },
            error: 'Article not found',
          });
          continue;
        }

        let cleanedContent = article.detailed_content;
        const changes = {
          citations_replaced: 0,
          citations_removed: 0,
          internal_links_replaced: 0,
          internal_links_removed: 0,
          code_fences_removed: 0,
        };

        // 1. Process citation markers
        const citationPattern = /\[CITATION_NEEDED:([^\]]+)\]/g;
        const citationMatches: RegExpMatchArray[] = Array.from(cleanedContent.matchAll(citationPattern));

        for (const match of citationMatches) {
          const searchTerm = match[1].trim();
          const citation = await findCitation(searchTerm, article.language, perplexityKey);

          if (citation) {
            // Replace with proper link
            cleanedContent = cleanedContent.replace(
              match[0],
              `<a href="${citation.url}" target="_blank" rel="noopener noreferrer">${citation.source}</a>`
            );
            changes.citations_replaced++;
          } else {
            // Remove marker if no citation found
            cleanedContent = cleanedContent.replace(match[0], '');
            changes.citations_removed++;
          }
        }

        // 2. Process internal link markers
        const internalLinkPattern = /\[INTERNAL_LINK:([^\]]+)\]/g;
        const internalLinkMatches: RegExpMatchArray[] = Array.from(cleanedContent.matchAll(internalLinkPattern));

        for (const match of internalLinkMatches) {
          const searchTerm = match[1].trim();
          const internalLink = await findInternalLink(searchTerm, article.language, article.id, supabase);

          if (internalLink) {
            // Replace with internal link
            cleanedContent = cleanedContent.replace(
              match[0],
              `<a href="${internalLink.url}">${internalLink.text}</a>`
            );
            changes.internal_links_replaced++;
          } else {
            // Remove marker if no link found
            cleanedContent = cleanedContent.replace(match[0], '');
            changes.internal_links_removed++;
          }
        }

        // 3. Clean code fences
        const { cleaned: finalContent, removedCount } = cleanCodeFences(cleanedContent);
        cleanedContent = finalContent;
        changes.code_fences_removed = removedCount;

        const totalChanges = changes.citations_replaced + changes.citations_removed + 
                           changes.internal_links_replaced + changes.internal_links_removed + 
                           changes.code_fences_removed;

        if (totalChanges === 0) {
          results.push({
            article_id: article.id,
            headline: article.headline,
            success: true,
            changes_made: changes,
          });
          continue;
        }

        // If dry run, just return preview
        if (dry_run) {
          results.push({
            article_id: article.id,
            headline: article.headline,
            success: true,
            changes_made: changes,
            preview: {
              before: article.detailed_content.substring(0, 500),
              after: cleanedContent.substring(0, 500),
            },
          });
          continue;
        }

        // Create backup if enabled
        if (backup_enabled) {
          await supabase.from('article_revisions').insert({
            article_id: article.id,
            previous_content: article.detailed_content,
            revision_type: 'content_marker_cleanup',
            changed_by: user_id,
            change_reason: `Cleaned ${totalChanges} content markers`,
            can_rollback: true,
            rollback_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        // Update article
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            detailed_content: cleanedContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', article.id);

        if (updateError) {
          throw updateError;
        }

        // Log to content_updates
        await supabase.from('content_updates').insert({
          article_id: article.id,
          update_type: 'content_marker_cleanup',
          updated_fields: ['detailed_content'],
          update_notes: `Cleaned ${totalChanges} content markers: ${changes.citations_replaced} citations replaced, ${changes.internal_links_replaced} internal links added`,
          updated_by: user_id,
          previous_date_modified: article.updated_at,
          new_date_modified: new Date().toISOString(),
        });

        results.push({
          article_id: article.id,
          headline: article.headline,
          success: true,
          changes_made: changes,
        });

        console.log(`✅ Cleaned ${article.headline}: ${totalChanges} markers`);

      } catch (error) {
        console.error(`❌ Error processing article ${articleId}:`, error);
        results.push({
          article_id: articleId,
          headline: 'Error',
          success: false,
          changes_made: { citations_replaced: 0, citations_removed: 0, internal_links_replaced: 0, internal_links_removed: 0, code_fences_removed: 0 },
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          dry_run: dry_run || false,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
