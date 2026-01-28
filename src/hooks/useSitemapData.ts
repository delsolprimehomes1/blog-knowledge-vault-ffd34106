import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleData {
  slug: string;
  language: string;
  cluster_id: string | null;
  is_primary: boolean;
  date_modified: string | null;
  date_published: string | null;
}

export interface QAPageData {
  slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
}

export interface ComparisonPageData {
  slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
}

export interface LocationPageData {
  city_slug: string;
  topic_slug: string;
  language: string;
  hreflang_group_id: string | null;
  updated_at: string | null;
}

export interface SitemapCounts {
  articles: number;
  qa: number;
  comparisons: number;
  locations: number;
}

// Accurate COUNT queries for stats display (no 1000 row limit)
export const useSitemapCounts = () => {
  return useQuery({
    queryKey: ["sitemap-counts"],
    queryFn: async (): Promise<SitemapCounts> => {
      const [blogCount, qaCount, compCount, locCount] = await Promise.all([
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("qa_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("comparison_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("location_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      return {
        articles: blogCount.count || 0,
        qa: qaCount.count || 0,
        comparisons: compCount.count || 0,
        locations: locCount.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch all articles with pagination for XML generation
export const fetchAllArticles = async (
  onProgress?: (fetched: number) => void
): Promise<ArticleData[]> => {
  const allRecords: ArticleData[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("blog_articles")
      .select("slug, date_modified, date_published, language, cluster_id, is_primary")
      .eq("status", "published")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRecords.push(...(data as ArticleData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};

// Fetch all QA pages with pagination
export const fetchAllQAPages = async (
  onProgress?: (fetched: number) => void
): Promise<QAPageData[]> => {
  const allRecords: QAPageData[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("qa_pages")
      .select("slug, language, hreflang_group_id, updated_at")
      .eq("status", "published")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRecords.push(...(data as QAPageData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};

// Fetch all comparison pages with pagination
export const fetchAllComparisonPages = async (
  onProgress?: (fetched: number) => void
): Promise<ComparisonPageData[]> => {
  const allRecords: ComparisonPageData[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("comparison_pages")
      .select("slug, language, hreflang_group_id, updated_at")
      .eq("status", "published")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRecords.push(...(data as ComparisonPageData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};

// Fetch all location pages with pagination
export const fetchAllLocationPages = async (
  onProgress?: (fetched: number) => void
): Promise<LocationPageData[]> => {
  const allRecords: LocationPageData[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("location_pages")
      .select("city_slug, topic_slug, language, hreflang_group_id, updated_at")
      .eq("status", "published")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRecords.push(...(data as LocationPageData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};
