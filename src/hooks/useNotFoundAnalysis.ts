import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MalformedUrl {
  id: string;
  url_path: string;
  created_at: string;
}

export interface LanguageMismatch {
  id: string;
  url_path: string;
  url_lang: string;
  content_type: string;
  slug: string;
  actual_language: string;
  correct_url: string;
}

export interface ConfirmedGoneUrl {
  id: string;
  url_path: string;
  reason: string | null;
  created_at: string;
}

export interface AnalysisSummary {
  total: number;
  malformed: number;
  languageMismatch: number;
  trulyMissing: number;
}

interface GoneUrl {
  id: string;
  url_path: string;
  reason: string | null;
  created_at: string;
}

// Helper function to fetch ALL gone_urls using batch pagination
// Supabase limits queries to 1000 rows by default
async function fetchAllGoneUrls(): Promise<GoneUrl[]> {
  const allData: GoneUrl[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("gone_urls")
      .select("id, url_path, reason, created_at")
      .range(offset, offset + batchSize - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData.push(...data);

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return allData;
}

// Fetch summary counts
export function useNotFoundSummary() {
  return useQuery({
    queryKey: ["not-found-summary"],
    queryFn: async (): Promise<AnalysisSummary> => {
      // Total count using exact count (fast, no row limit)
      const { count: total } = await supabase
        .from("gone_urls")
        .select("*", { count: "exact", head: true });

      // Fetch ALL URLs to analyze (bypasses 1000-row limit)
      const allUrls = await fetchAllGoneUrls();

      const datePattern = /[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
      const malformedCount = allUrls.filter(u => datePattern.test(u.url_path)).length;

      // Language mismatch count - uses the same fetched data
      const languageMismatchCount = await countLanguageMismatches(allUrls);

      const trulyMissing = (total || 0) - malformedCount - languageMismatchCount;

      return {
        total: total || 0,
        malformed: malformedCount,
        languageMismatch: languageMismatchCount,
        trulyMissing: Math.max(0, trulyMissing),
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Helper to count language mismatches - accepts pre-fetched data
async function countLanguageMismatches(goneUrls: GoneUrl[]): Promise<number> {
  if (goneUrls.length === 0) return 0;

  // Parse URLs to extract language and slug
  const parsed = goneUrls
    .map(u => {
      const match = u.url_path.match(/^\/([a-z]{2})\/(blog|qa)\/(.+)$/);
      if (!match) return null;
      return {
        id: u.id,
        url_path: u.url_path,
        url_lang: match[1],
        content_type: match[2],
        slug: match[3],
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      url_path: string;
      url_lang: string;
      content_type: string;
      slug: string;
    }>;

  if (parsed.length === 0) return 0;

  // Get all slugs from blog and qa tables
  const blogSlugs = parsed.filter(p => p.content_type === "blog").map(p => p.slug);
  const qaSlugs = parsed.filter(p => p.content_type === "qa").map(p => p.slug);

  let mismatchCount = 0;

  // Check blog articles (batch fetch to handle large slug lists)
  if (blogSlugs.length > 0) {
    const uniqueBlogSlugs = [...new Set(blogSlugs)];
    const { data: blogArticles } = await supabase
      .from("blog_articles")
      .select("slug, language")
      .in("slug", uniqueBlogSlugs.slice(0, 500)) // Supabase IN limit
      .eq("status", "published");

    const blogMap = new Map(blogArticles?.map(a => [a.slug, a.language]) || []);
    
    for (const p of parsed.filter(p => p.content_type === "blog")) {
      const actualLang = blogMap.get(p.slug);
      if (actualLang && actualLang !== p.url_lang) {
        mismatchCount++;
      }
    }
  }

  // Check Q&A pages
  if (qaSlugs.length > 0) {
    const uniqueQaSlugs = [...new Set(qaSlugs)];
    const { data: qaPages } = await supabase
      .from("qa_pages")
      .select("slug, language")
      .in("slug", uniqueQaSlugs.slice(0, 500))
      .eq("status", "published");

    const qaMap = new Map(qaPages?.map(a => [a.slug, a.language]) || []);
    
    for (const p of parsed.filter(p => p.content_type === "qa")) {
      const actualLang = qaMap.get(p.slug);
      if (actualLang && actualLang !== p.url_lang) {
        mismatchCount++;
      }
    }
  }

  return mismatchCount;
}

// Fetch malformed URLs (date pattern) - fetches ALL rows
export function useMalformedUrls() {
  return useQuery({
    queryKey: ["malformed-urls"],
    queryFn: async (): Promise<MalformedUrl[]> => {
      const allUrls = await fetchAllGoneUrls();
      const datePattern = /[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
      return allUrls.filter(u => datePattern.test(u.url_path));
    },
  });
}

// Fetch language mismatches - fetches ALL rows
export function useLanguageMismatches() {
  return useQuery({
    queryKey: ["language-mismatches"],
    queryFn: async (): Promise<LanguageMismatch[]> => {
      const goneUrls = await fetchAllGoneUrls();

      if (goneUrls.length === 0) return [];

      const parsed = goneUrls
        .map(u => {
          const match = u.url_path.match(/^\/([a-z]{2})\/(blog|qa)\/(.+)$/);
          if (!match) return null;
          return {
            id: u.id,
            url_path: u.url_path,
            url_lang: match[1],
            content_type: match[2],
            slug: match[3],
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          url_path: string;
          url_lang: string;
          content_type: string;
          slug: string;
        }>;

      if (parsed.length === 0) return [];

      const blogSlugs = [...new Set(parsed.filter(p => p.content_type === "blog").map(p => p.slug))];
      const qaSlugs = [...new Set(parsed.filter(p => p.content_type === "qa").map(p => p.slug))];

      const results: LanguageMismatch[] = [];

      // Check blog articles
      if (blogSlugs.length > 0) {
        const { data: blogArticles } = await supabase
          .from("blog_articles")
          .select("slug, language")
          .in("slug", blogSlugs.slice(0, 500))
          .eq("status", "published");

        const blogMap = new Map(blogArticles?.map(a => [a.slug, a.language]) || []);
        
        for (const p of parsed.filter(p => p.content_type === "blog")) {
          const actualLang = blogMap.get(p.slug);
          if (actualLang && actualLang !== p.url_lang) {
            results.push({
              ...p,
              actual_language: actualLang,
              correct_url: `/${actualLang}/blog/${p.slug}`,
            });
          }
        }
      }

      // Check Q&A pages
      if (qaSlugs.length > 0) {
        const { data: qaPages } = await supabase
          .from("qa_pages")
          .select("slug, language")
          .in("slug", qaSlugs.slice(0, 500))
          .eq("status", "published");

        const qaMap = new Map(qaPages?.map(a => [a.slug, a.language]) || []);
        
        for (const p of parsed.filter(p => p.content_type === "qa")) {
          const actualLang = qaMap.get(p.slug);
          if (actualLang && actualLang !== p.url_lang) {
            results.push({
              ...p,
              actual_language: actualLang,
              correct_url: `/${actualLang}/qa/${p.slug}`,
            });
          }
        }
      }

      return results;
    },
  });
}

// Fetch confirmed gone URLs (truly missing) - fetches ALL rows
export function useConfirmedGoneUrls() {
  return useQuery({
    queryKey: ["confirmed-gone-urls"],
    queryFn: async (): Promise<ConfirmedGoneUrl[]> => {
      const goneUrls = await fetchAllGoneUrls();

      if (goneUrls.length === 0) return [];

      const datePattern = /[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
      
      // Get language mismatch IDs to exclude
      const parsed = goneUrls
        .map(u => {
          const match = u.url_path.match(/^\/([a-z]{2})\/(blog|qa)\/(.+)$/);
          if (!match) return null;
          return {
            id: u.id,
            url_lang: match[1],
            content_type: match[2],
            slug: match[3],
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          url_lang: string;
          content_type: string;
          slug: string;
        }>;

      const blogSlugs = [...new Set(parsed.filter(p => p.content_type === "blog").map(p => p.slug))];
      const qaSlugs = [...new Set(parsed.filter(p => p.content_type === "qa").map(p => p.slug))];

      const mismatchIds = new Set<string>();

      if (blogSlugs.length > 0) {
        const { data: blogArticles } = await supabase
          .from("blog_articles")
          .select("slug, language")
          .in("slug", blogSlugs.slice(0, 500))
          .eq("status", "published");

        const blogMap = new Map(blogArticles?.map(a => [a.slug, a.language]) || []);
        
        for (const p of parsed.filter(p => p.content_type === "blog")) {
          const actualLang = blogMap.get(p.slug);
          if (actualLang && actualLang !== p.url_lang) {
            mismatchIds.add(p.id);
          }
        }
      }

      if (qaSlugs.length > 0) {
        const { data: qaPages } = await supabase
          .from("qa_pages")
          .select("slug, language")
          .in("slug", qaSlugs.slice(0, 500))
          .eq("status", "published");

        const qaMap = new Map(qaPages?.map(a => [a.slug, a.language]) || []);
        
        for (const p of parsed.filter(p => p.content_type === "qa")) {
          const actualLang = qaMap.get(p.slug);
          if (actualLang && actualLang !== p.url_lang) {
            mismatchIds.add(p.id);
          }
        }
      }

      // Filter out malformed and mismatches
      return goneUrls.filter(u => 
        !datePattern.test(u.url_path) && !mismatchIds.has(u.id)
      );
    },
  });
}

// Delete malformed URLs mutation
export function useDeleteMalformedUrls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error } = await supabase
          .from("gone_urls")
          .delete()
          .in("id", batch);
        if (error) throw error;
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["not-found-summary"] });
      queryClient.invalidateQueries({ queryKey: ["malformed-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
      toast.success(`Deleted ${ids.length} malformed URLs`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete URLs: ${error.message}`);
    },
  });
}

// Delete language mismatch URLs mutation
export function useDeleteMismatchUrls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error } = await supabase
          .from("gone_urls")
          .delete()
          .in("id", batch);
        if (error) throw error;
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["not-found-summary"] });
      queryClient.invalidateQueries({ queryKey: ["language-mismatches"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
      toast.success(`Fixed ${ids.length} language mismatch URLs - they will now redirect properly`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to fix URLs: ${error.message}`);
    },
  });
}

// Delete single URL mutation
export function useDeleteGoneUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gone_urls")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["not-found-summary"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls"] });
      queryClient.invalidateQueries({ queryKey: ["gone-urls-count"] });
      toast.success("URL removed from 410 list");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete URL: ${error.message}`);
    },
  });
}

// Export URLs to CSV
export function exportUrlsToCsv(urls: Array<{ url_path: string; [key: string]: any }>, filename: string) {
  if (urls.length === 0) {
    toast.error("No URLs to export");
    return;
  }

  const csv = [
    "url_path",
    ...urls.map(u => `"${u.url_path}"`),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${urls.length} URLs`);
}
