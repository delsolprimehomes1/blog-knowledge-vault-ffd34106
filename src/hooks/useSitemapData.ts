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
  goneUrls: number;
}

// Fetch all gone URL paths for filtering (paginated)
export const fetchGoneUrls = async (): Promise<Set<string>> => {
  const allPaths: string[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("gone_urls")
      .select("url_path")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allPaths.push(...data.map(g => g.url_path));
    if (data.length < pageSize) break;
    page++;
  }

  return new Set(allPaths);
};

// Accurate COUNT queries for stats display (no 1000 row limit)
export const useSitemapCounts = () => {
  return useQuery({
    queryKey: ["sitemap-counts"],
    queryFn: async (): Promise<SitemapCounts> => {
      const [blogCount, qaCount, compCount, locCount, goneCount] = await Promise.all([
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("qa_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("comparison_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("location_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("gone_urls").select("id", { count: "exact", head: true }),
      ]);
      return {
        articles: blogCount.count || 0,
        qa: qaCount.count || 0,
        comparisons: compCount.count || 0,
        locations: locCount.count || 0,
        goneUrls: goneCount.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch all articles with pagination for XML generation (filters out gone_urls)
export const fetchAllArticles = async (
  onProgress?: (fetched: number) => void,
  goneUrls?: Set<string>
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

    // Filter out gone URLs if set is provided
    const filtered = goneUrls 
      ? data.filter(a => !goneUrls.has(`/${a.language}/blog/${a.slug}`))
      : data;
    
    allRecords.push(...(filtered as ArticleData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};

// Fetch all QA pages with pagination (filters out gone_urls)
export const fetchAllQAPages = async (
  onProgress?: (fetched: number) => void,
  goneUrls?: Set<string>
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

    // Filter out gone URLs if set is provided
    const filtered = goneUrls 
      ? data.filter(q => !goneUrls.has(`/${q.language}/qa/${q.slug}`))
      : data;
    
    allRecords.push(...(filtered as QAPageData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};

// Fetch all comparison pages with pagination (filters out gone_urls)
export const fetchAllComparisonPages = async (
  onProgress?: (fetched: number) => void,
  goneUrls?: Set<string>
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

    // Filter out gone URLs if set is provided
    const filtered = goneUrls 
      ? data.filter(c => !goneUrls.has(`/${c.language}/compare/${c.slug}`))
      : data;
    
    allRecords.push(...(filtered as ComparisonPageData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};

// Fetch all location pages with pagination (filters out gone_urls)
export const fetchAllLocationPages = async (
  onProgress?: (fetched: number) => void,
  goneUrls?: Set<string>
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

    // Filter out gone URLs if set is provided
    const filtered = goneUrls 
      ? data.filter(l => !goneUrls.has(`/${l.language}/locations/${l.city_slug}/${l.topic_slug}`))
      : data;
    
    allRecords.push(...(filtered as LocationPageData[]));
    onProgress?.(allRecords.length);

    if (data.length < pageSize) break;
    page++;
  }

  return allRecords;
};
