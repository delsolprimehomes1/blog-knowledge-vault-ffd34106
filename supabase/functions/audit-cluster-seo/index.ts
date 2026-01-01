import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const EXPECTED_ARTICLES_PER_LANGUAGE = 6;
const EXPECTED_QAS_PER_ARTICLE = 4;

interface BlogArticle {
  id: string;
  slug: string;
  language: string;
  status: string;
  canonical_url: string | null;
  hreflang_group_id: string | null;
  translations: Record<string, string> | null;
}

interface QAPage {
  id: string;
  slug: string;
  language: string;
  status: string;
  canonical_url: string | null;
  hreflang_group_id: string | null;
  source_article_id: string | null;
}

interface SEOIssue {
  id: string;
  slug: string;
  language: string;
  issue: string;
  expected?: string;
  actual?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cluster_id } = await req.json();

    if (!cluster_id) {
      return new Response(
        JSON.stringify({ error: 'cluster_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[audit-cluster-seo] Starting audit for cluster: ${cluster_id}`);

    // Fetch all blog articles in the cluster
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, language, status, canonical_url, hreflang_group_id, translations, cluster_theme')
      .eq('cluster_id', cluster_id);

    if (articlesError) throw articlesError;

    // Fetch all QA pages in the cluster
    const { data: qaPages, error: qaPagesError } = await supabase
      .from('qa_pages')
      .select('id, slug, language, status, canonical_url, hreflang_group_id, source_article_id')
      .eq('cluster_id', cluster_id);

    if (qaPagesError) throw qaPagesError;

    const clusterTheme = articles?.[0]?.cluster_theme || 'Unknown Cluster';

    // === BLOG ARTICLE AUDIT ===
    const blogAudit = auditBlogArticles(articles || []);

    // === QA PAGE AUDIT ===
    const qaAudit = auditQAPages(qaPages || [], articles || []);

    // Calculate overall health score
    const blogWeight = 0.6;
    const qaWeight = 0.4;
    const overallHealthScore = Math.round(
      (blogAudit.health_score * blogWeight) + (qaAudit.health_score * qaWeight)
    );

    const totalIssues = 
      blogAudit.missing_canonicals.length +
      blogAudit.invalid_canonicals.length +
      blogAudit.missing_hreflang_group.length +
      blogAudit.missing_translations.length +
      blogAudit.self_reference_errors.length +
      blogAudit.missing_english.length +
      qaAudit.missing_canonicals.length +
      qaAudit.invalid_canonicals.length +
      qaAudit.duplicate_language_groups.length +
      qaAudit.language_mismatch.length;

    const response = {
      cluster_id,
      cluster_theme: clusterTheme,
      blog_audit: blogAudit,
      qa_audit: qaAudit,
      overall_health_score: overallHealthScore,
      issues_count: totalIssues,
      is_seo_ready: overallHealthScore >= 95,
      audited_at: new Date().toISOString(),
    };

    console.log(`[audit-cluster-seo] Audit complete. Health score: ${overallHealthScore}%, Issues: ${totalIssues}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[audit-cluster-seo] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function auditBlogArticles(articles: BlogArticle[]) {
  const languagesFound = [...new Set(articles.map(a => a.language))];
  const missingLanguages = SUPPORTED_LANGUAGES.filter(lang => !languagesFound.includes(lang));
  
  const missingCanonicals: SEOIssue[] = [];
  const invalidCanonicals: SEOIssue[] = [];
  const missingHreflangGroup: SEOIssue[] = [];
  const missingTranslations: SEOIssue[] = [];
  const selfReferenceErrors: SEOIssue[] = [];
  const missingEnglish: SEOIssue[] = [];

  // Group articles by hreflang_group_id to check for English version
  const hreflangGroups = new Map<string, BlogArticle[]>();
  
  for (const article of articles) {
    // Check canonical URL
    if (!article.canonical_url) {
      missingCanonicals.push({
        id: article.id,
        slug: article.slug,
        language: article.language,
        issue: 'Missing canonical URL',
      });
    } else {
      const expectedPattern = `/${article.language}/blog/${article.slug}`;
      if (!article.canonical_url.includes(expectedPattern)) {
        invalidCanonicals.push({
          id: article.id,
          slug: article.slug,
          language: article.language,
          issue: 'Invalid canonical URL pattern',
          expected: expectedPattern,
          actual: article.canonical_url,
        });
      }

      // Check self-referencing (language in canonical matches article language)
      const canonicalLangMatch = article.canonical_url.match(/^https?:\/\/[^/]+\/([a-z]{2})\//);
      if (canonicalLangMatch && canonicalLangMatch[1] !== article.language) {
        selfReferenceErrors.push({
          id: article.id,
          slug: article.slug,
          language: article.language,
          issue: 'Canonical URL language does not match article language',
          expected: article.language,
          actual: canonicalLangMatch[1],
        });
      }
    }

    // Check hreflang_group_id
    if (!article.hreflang_group_id) {
      missingHreflangGroup.push({
        id: article.id,
        slug: article.slug,
        language: article.language,
        issue: 'Missing hreflang_group_id',
      });
    } else {
      if (!hreflangGroups.has(article.hreflang_group_id)) {
        hreflangGroups.set(article.hreflang_group_id, []);
      }
      hreflangGroups.get(article.hreflang_group_id)!.push(article);
    }

    // Check translations JSONB
    const translations = article.translations || {};
    const translationCount = Object.keys(translations).length;
    // Should have translations for all other languages (9 others + might include self)
    if (translationCount < SUPPORTED_LANGUAGES.length - 1) {
      missingTranslations.push({
        id: article.id,
        slug: article.slug,
        language: article.language,
        issue: 'Incomplete translations JSONB',
        expected: `${SUPPORTED_LANGUAGES.length - 1}+ entries`,
        actual: `${translationCount} entries`,
      });
    }
  }

  // Check each hreflang group has an English version (for x-default)
  for (const [groupId, groupArticles] of hreflangGroups) {
    const hasEnglish = groupArticles.some(a => a.language === 'en');
    if (!hasEnglish && groupArticles.length > 0) {
      missingEnglish.push({
        id: groupId,
        slug: groupArticles[0].slug,
        language: 'en',
        issue: 'Hreflang group missing English version (x-default)',
      });
    }
  }

  // Calculate health score
  const totalChecks = articles.length * 4; // canonical, hreflang_group, translations, self-reference
  const issuesCount = 
    missingCanonicals.length + 
    invalidCanonicals.length + 
    missingHreflangGroup.length + 
    missingTranslations.length + 
    selfReferenceErrors.length;
  
  const healthScore = totalChecks > 0 
    ? Math.round(((totalChecks - issuesCount) / totalChecks) * 100) 
    : 100;

  return {
    total_articles: articles.length,
    languages_found: languagesFound.sort(),
    missing_languages: missingLanguages,
    articles_per_language: languagesFound.reduce((acc, lang) => {
      acc[lang] = articles.filter(a => a.language === lang).length;
      return acc;
    }, {} as Record<string, number>),
    missing_canonicals: missingCanonicals,
    invalid_canonicals: invalidCanonicals,
    missing_hreflang_group: missingHreflangGroup,
    missing_translations: missingTranslations,
    self_reference_errors: selfReferenceErrors,
    missing_english: missingEnglish,
    health_score: healthScore,
  };
}

function auditQAPages(qaPages: QAPage[], articles: BlogArticle[]) {
  const languagesFound = [...new Set(qaPages.map(q => q.language))];
  const missingLanguages = SUPPORTED_LANGUAGES.filter(lang => !languagesFound.includes(lang));
  
  const perLanguage: Record<string, number> = {};
  for (const lang of languagesFound) {
    perLanguage[lang] = qaPages.filter(q => q.language === lang).length;
  }

  const missingCanonicals: SEOIssue[] = [];
  const invalidCanonicals: SEOIssue[] = [];
  const duplicateLanguageGroups: { hreflang_group_id: string; language: string; count: number }[] = [];
  const languageMismatch: SEOIssue[] = [];

  // Check for duplicate languages in hreflang groups
  const hreflangGroups = new Map<string, QAPage[]>();

  for (const qa of qaPages) {
    // Check canonical URL
    if (!qa.canonical_url) {
      missingCanonicals.push({
        id: qa.id,
        slug: qa.slug,
        language: qa.language,
        issue: 'Missing canonical URL',
      });
    } else {
      const expectedPattern = `/${qa.language}/qa/${qa.slug}`;
      if (!qa.canonical_url.includes(expectedPattern)) {
        invalidCanonicals.push({
          id: qa.id,
          slug: qa.slug,
          language: qa.language,
          issue: 'Invalid canonical URL pattern',
          expected: expectedPattern,
          actual: qa.canonical_url,
        });
      }
    }

    // Group by hreflang_group_id
    if (qa.hreflang_group_id) {
      if (!hreflangGroups.has(qa.hreflang_group_id)) {
        hreflangGroups.set(qa.hreflang_group_id, []);
      }
      hreflangGroups.get(qa.hreflang_group_id)!.push(qa);
    }

    // Check Q&A language matches source article language
    if (qa.source_article_id) {
      const sourceArticle = articles.find(a => a.id === qa.source_article_id);
      if (sourceArticle && sourceArticle.language !== qa.language) {
        languageMismatch.push({
          id: qa.id,
          slug: qa.slug,
          language: qa.language,
          issue: 'Q&A language does not match source article language',
          expected: sourceArticle.language,
          actual: qa.language,
        });
      }
    }
  }

  // Check for duplicate languages in each hreflang group
  for (const [groupId, groupQAs] of hreflangGroups) {
    const langCounts = new Map<string, number>();
    for (const qa of groupQAs) {
      langCounts.set(qa.language, (langCounts.get(qa.language) || 0) + 1);
    }
    for (const [lang, count] of langCounts) {
      if (count > 1) {
        duplicateLanguageGroups.push({
          hreflang_group_id: groupId,
          language: lang,
          count,
        });
      }
    }
  }

  // Calculate expected Q&As per language (articles × 4)
  const articlesPerLang: Record<string, number> = {};
  for (const article of articles) {
    articlesPerLang[article.language] = (articlesPerLang[article.language] || 0) + 1;
  }
  const expectedPerLanguage: Record<string, number> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    expectedPerLanguage[lang] = (articlesPerLang[lang] || 0) * EXPECTED_QAS_PER_ARTICLE;
  }

  // Calculate health score
  const totalChecks = qaPages.length * 2; // canonical + no duplicates
  const issuesCount = 
    missingCanonicals.length + 
    invalidCanonicals.length + 
    duplicateLanguageGroups.length +
    languageMismatch.length;
  
  const healthScore = totalChecks > 0 
    ? Math.round(((totalChecks - issuesCount) / totalChecks) * 100) 
    : 100;

  return {
    total_pages: qaPages.length,
    languages_found: languagesFound.sort(),
    missing_languages: missingLanguages,
    per_language: perLanguage,
    expected_per_language: expectedPerLanguage,
    missing_canonicals: missingCanonicals,
    invalid_canonicals: invalidCanonicals,
    duplicate_language_groups: duplicateLanguageGroups,
    language_mismatch: languageMismatch,
    health_score: healthScore,
  };
}
