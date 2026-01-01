// Cluster Manager Types

export interface ClusterData {
  cluster_id: string;
  cluster_theme: string | null;
  languages: Record<string, { total: number; draft: number; published: number }>;
  total_articles: number;
  all_draft: boolean;
  all_published: boolean;
  created_at: string;
  job_status?: string;
  languages_queue?: string[] | null;
  job_error?: string | null;
  job_progress?: any;
  qa_pages: Record<string, { total: number; published: number; draft: number }>;
  total_qa_pages: number;
  total_qa_published: number;
  expected_qa_pages: number;
  qa_completion_percent: number;
}

export interface QAJobProgress {
  jobId: string;
  clusterId: string;
  status: string;
  processedArticles: number;
  totalArticles: number;
  generatedPages: number;
  totalExpected: number;
  currentArticle?: string;
  currentLanguage?: string;
}

export interface SEOIssue {
  id: string;
  slug: string;
  language: string;
  issue: string;
  expected?: string;
  actual?: string;
  missing?: string;
}

export interface ClusterSEOAuditResult {
  cluster_id: string;
  cluster_theme: string;
  blog_audit: {
    total_articles: number;
    languages_found: string[];
    missing_languages: string[];
    articles_per_language: Record<string, number>;
    missing_canonicals: SEOIssue[];
    invalid_canonicals: SEOIssue[];
    missing_hreflang_group: SEOIssue[];
    missing_translations: SEOIssue[];
    self_reference_errors: SEOIssue[];
    missing_english: SEOIssue[];
    health_score: number;
  };
  qa_audit: {
    total_pages: number;
    languages_found: string[];
    missing_languages: string[];
    per_language: Record<string, number>;
    expected_per_language: Record<string, number>;
    missing_canonicals: SEOIssue[];
    invalid_canonicals: SEOIssue[];
    duplicate_language_groups: { hreflang_group_id: string; language: string; count: number }[];
    language_mismatch: SEOIssue[];
    health_score: number;
  };
  overall_health_score: number;
  issues_count: number;
  is_seo_ready: boolean;
  audited_at: string;
}

export interface DryRunPreview {
  type: 'blog' | 'qa';
  clusterId: string;
  clusterTheme: string;
  result: any;
}

// Backend default translation languages (English + these = 10 languages total)
export const DEFAULT_TRANSLATION_LANGUAGES = ["de", "nl", "fr", "pl", "sv", "da", "hu", "fi", "no"];

export const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
  nl: "🇳🇱",
  fr: "🇫🇷",
  es: "🇪🇸",
  pl: "🇵🇱",
  sv: "🇸🇪",
  da: "🇩🇰",
  hu: "🇭🇺",
  fi: "🇫🇮",
  no: "🇳🇴",
};

export const getLanguageFlag = (lang: string): string => {
  return LANGUAGE_FLAGS[lang] || lang.toUpperCase();
};

export const getAllExpectedLanguages = (cluster?: Pick<ClusterData, "languages_queue">): string[] => {
  const queue =
    cluster?.languages_queue && cluster.languages_queue.length > 0
      ? cluster.languages_queue
      : DEFAULT_TRANSLATION_LANGUAGES;

  return ["en", ...queue.filter((l) => l !== "en")];
};

export const getMissingLanguages = (cluster: ClusterData): string[] => {
  const existingLanguages = new Set(Object.keys(cluster.languages));
  return getAllExpectedLanguages(cluster).filter((lang) => !existingLanguages.has(lang));
};

export const getSourceLanguageInfo = (cluster: ClusterData) => {
  const langCounts = Object.entries(cluster.languages).map(([lang, stats]) => ({
    lang,
    count: stats.total
  }));
  
  langCounts.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.lang === 'en') return -1;
    if (b.lang === 'en') return 1;
    return 0;
  });
  
  const sourceInfo = langCounts[0];
  if (!sourceInfo) return { sourceLanguage: 'en', sourceCount: 0, needsMoreSource: true };
  
  return {
    sourceLanguage: sourceInfo.lang,
    sourceCount: sourceInfo.count,
    needsMoreSource: sourceInfo.count < 6
  };
};

export const getIncompleteLanguages = (cluster: ClusterData) => {
  return Object.entries(cluster.languages)
    .filter(([lang, stats]) => stats.total > 0 && stats.total < 6)
    .map(([lang, stats]) => ({ lang, count: stats.total }));
};
