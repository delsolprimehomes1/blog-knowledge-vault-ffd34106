import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DuplicatePair {
  id: string;
  articleA: {
    id: string;
    headline: string;
    slug: string;
    language: string;
    status: string;
    contentLength: number;
    citationsCount: number;
    datePublished: string | null;
    hreflangGroupId: string | null;
    clusterId: string | null;
  };
  articleB: {
    id: string;
    headline: string;
    slug: string;
    language: string;
    status: string;
    contentLength: number;
    citationsCount: number;
    datePublished: string | null;
    hreflangGroupId: string | null;
    clusterId: string | null;
  };
  matchType: 'near-duplicate-slug' | 'identical-headline';
  recommendation: 'keep-a' | 'keep-b' | 'review';
}

export interface DuplicateStats {
  totalPairs: number;
  byMatchType: {
    nearDuplicateSlug: number;
    identicalHeadline: number;
  };
  byLanguage: Record<string, number>;
  potentialImpact: number;
}

// Extract base slug by stripping numeric suffixes
function getBaseSlug(slug: string): string {
  return slug.replace(/-\d+$/, '');
}

// Calculate recommendation based on quality signals
function calculateRecommendation(
  articleA: DuplicatePair['articleA'],
  articleB: DuplicatePair['articleB']
): 'keep-a' | 'keep-b' | 'review' {
  let scoreA = 0;
  let scoreB = 0;

  // Longer content is better
  if (articleA.contentLength > articleB.contentLength) scoreA += 2;
  else if (articleB.contentLength > articleA.contentLength) scoreB += 2;

  // More citations is better
  if (articleA.citationsCount > articleB.citationsCount) scoreA += 1;
  else if (articleB.citationsCount > articleA.citationsCount) scoreB += 1;

  // Older publication date is canonical
  if (articleA.datePublished && articleB.datePublished) {
    if (new Date(articleA.datePublished) < new Date(articleB.datePublished)) scoreA += 1;
    else if (new Date(articleB.datePublished) < new Date(articleA.datePublished)) scoreB += 1;
  } else if (articleA.datePublished) {
    scoreA += 1;
  } else if (articleB.datePublished) {
    scoreB += 1;
  }

  // Has hreflang linking is better
  if (articleA.hreflangGroupId && !articleB.hreflangGroupId) scoreA += 2;
  else if (articleB.hreflangGroupId && !articleA.hreflangGroupId) scoreB += 2;

  // Published is better than draft
  if (articleA.status === 'published' && articleB.status !== 'published') scoreA += 1;
  else if (articleB.status === 'published' && articleA.status !== 'published') scoreB += 1;

  if (scoreA > scoreB + 1) return 'keep-a';
  if (scoreB > scoreA + 1) return 'keep-b';
  return 'review';
}

export function useDuplicateDetection() {
  return useQuery({
    queryKey: ['duplicate-detection'],
    queryFn: async (): Promise<{ pairs: DuplicatePair[]; stats: DuplicateStats }> => {
      // Fetch all published articles with relevant fields
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, headline, slug, language, status, detailed_content, external_citations, date_published, hreflang_group_id, cluster_id')
        .in('status', ['published', 'draft']);

      if (error) throw error;

      const pairs: DuplicatePair[] = [];
      const seenPairs = new Set<string>();

      // Group articles by base slug within same language
      const slugGroups: Record<string, typeof articles> = {};
      for (const article of articles || []) {
        const baseSlug = getBaseSlug(article.slug);
        const key = `${article.language}:${baseSlug}`;
        if (!slugGroups[key]) slugGroups[key] = [];
        slugGroups[key].push(article);
      }

      // Find near-duplicate slugs (same base slug in same language)
      for (const [key, group] of Object.entries(slugGroups)) {
        if (group.length > 1) {
          // Sort by slug to get consistent pairs
          const sorted = group.sort((a, b) => a.slug.localeCompare(b.slug));
          for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
              const a = sorted[i];
              const b = sorted[j];
              const pairKey = [a.id, b.id].sort().join(':');
              
              if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                const citations = (arr: unknown) => Array.isArray(arr) ? arr.length : 0;
                
                const articleA = {
                  id: a.id,
                  headline: a.headline,
                  slug: a.slug,
                  language: a.language,
                  status: a.status,
                  contentLength: a.detailed_content?.length || 0,
                  citationsCount: citations(a.external_citations),
                  datePublished: a.date_published,
                  hreflangGroupId: a.hreflang_group_id,
                  clusterId: a.cluster_id,
                };
                const articleB = {
                  id: b.id,
                  headline: b.headline,
                  slug: b.slug,
                  language: b.language,
                  status: b.status,
                  contentLength: b.detailed_content?.length || 0,
                  citationsCount: citations(b.external_citations),
                  datePublished: b.date_published,
                  hreflangGroupId: b.hreflang_group_id,
                  clusterId: b.cluster_id,
                };

                pairs.push({
                  id: pairKey,
                  articleA,
                  articleB,
                  matchType: 'near-duplicate-slug',
                  recommendation: calculateRecommendation(articleA, articleB),
                });
              }
            }
          }
        }
      }

      // Find identical headlines within same language
      const headlineGroups: Record<string, typeof articles> = {};
      for (const article of articles || []) {
        const key = `${article.language}:${article.headline.toLowerCase().trim()}`;
        if (!headlineGroups[key]) headlineGroups[key] = [];
        headlineGroups[key].push(article);
      }

      for (const [key, group] of Object.entries(headlineGroups)) {
        if (group.length > 1) {
          const sorted = group.sort((a, b) => a.id.localeCompare(b.id));
          for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
              const a = sorted[i];
              const b = sorted[j];
              const pairKey = [a.id, b.id].sort().join(':');
              
              if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                const citations = (arr: unknown) => Array.isArray(arr) ? arr.length : 0;
                
                const articleA = {
                  id: a.id,
                  headline: a.headline,
                  slug: a.slug,
                  language: a.language,
                  status: a.status,
                  contentLength: a.detailed_content?.length || 0,
                  citationsCount: citations(a.external_citations),
                  datePublished: a.date_published,
                  hreflangGroupId: a.hreflang_group_id,
                  clusterId: a.cluster_id,
                };
                const articleB = {
                  id: b.id,
                  headline: b.headline,
                  slug: b.slug,
                  language: b.language,
                  status: b.status,
                  contentLength: b.detailed_content?.length || 0,
                  citationsCount: citations(b.external_citations),
                  datePublished: b.date_published,
                  hreflangGroupId: b.hreflang_group_id,
                  clusterId: b.cluster_id,
                };

                pairs.push({
                  id: pairKey,
                  articleA,
                  articleB,
                  matchType: 'identical-headline',
                  recommendation: calculateRecommendation(articleA, articleB),
                });
              }
            }
          }
        }
      }

      // Calculate stats
      const stats: DuplicateStats = {
        totalPairs: pairs.length,
        byMatchType: {
          nearDuplicateSlug: pairs.filter(p => p.matchType === 'near-duplicate-slug').length,
          identicalHeadline: pairs.filter(p => p.matchType === 'identical-headline').length,
        },
        byLanguage: {},
        potentialImpact: pairs.length * 2, // Each pair affects 2 URLs
      };

      for (const pair of pairs) {
        const lang = pair.articleA.language;
        stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
      }

      return { pairs, stats };
    },
  });
}
