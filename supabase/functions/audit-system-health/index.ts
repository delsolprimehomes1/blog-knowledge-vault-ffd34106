import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QAPage {
  id: string;
  language: string;
  qa_type: string;
  slug: string;
  hreflang_group_id: string | null;
  canonical_url: string | null;
  translations: Record<string, string> | null;
}

interface GroupAnalysis {
  hreflang_group_id: string;
  languages: string[];
  qa_count: number;
  has_duplicates: boolean;
  duplicate_languages: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const auditTimestamp = new Date().toISOString();
    console.log(`Starting comprehensive system audit at ${auditTimestamp}`);

    // ============================================
    // 1. Q&A HREFLANG ANALYSIS
    // ============================================
    
    // Fetch all Q&A pages
    const { data: qaPages, error: qaError } = await supabase
      .from('qa_pages')
      .select('id, language, qa_type, slug, hreflang_group_id, canonical_url, translations, status')
      .eq('status', 'published');

    if (qaError) {
      throw new Error(`Failed to fetch Q&A pages: ${qaError.message}`);
    }

    const totalQAs = qaPages?.length || 0;
    
    // Group Q&As by hreflang_group_id
    const groupMap = new Map<string, QAPage[]>();
    let orphanedQAs = 0;
    
    for (const qa of qaPages || []) {
      if (!qa.hreflang_group_id) {
        orphanedQAs++;
        continue;
      }
      
      if (!groupMap.has(qa.hreflang_group_id)) {
        groupMap.set(qa.hreflang_group_id, []);
      }
      groupMap.get(qa.hreflang_group_id)!.push(qa);
    }

    const uniqueGroups = groupMap.size;
    
    // Analyze each group
    const groupAnalyses: GroupAnalysis[] = [];
    const groupSizeDistribution: Record<number, number> = {};
    let multiLanguageGroups = 0;
    let singleLanguageGroups = 0;
    let groupsWithDuplicates = 0;
    const duplicateLanguageIssues: { hreflang_group_id: string; language: string; count: number }[] = [];

    for (const [groupId, qas] of groupMap) {
      const languages = qas.map(q => q.language);
      const uniqueLanguages = [...new Set(languages)];
      const qaCount = qas.length;
      
      // Check for duplicate languages
      const languageCounts = languages.reduce((acc, lang) => {
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const duplicateLangs = Object.entries(languageCounts)
        .filter(([_, count]) => count > 1)
        .map(([lang]) => lang);
      
      const hasDuplicates = duplicateLangs.length > 0;
      if (hasDuplicates) {
        groupsWithDuplicates++;
        for (const lang of duplicateLangs) {
          duplicateLanguageIssues.push({
            hreflang_group_id: groupId,
            language: lang,
            count: languageCounts[lang]
          });
        }
      }
      
      // Count by unique languages
      const uniqueLangCount = uniqueLanguages.length;
      groupSizeDistribution[uniqueLangCount] = (groupSizeDistribution[uniqueLangCount] || 0) + 1;
      
      if (uniqueLangCount > 1) {
        multiLanguageGroups++;
      } else {
        singleLanguageGroups++;
      }
      
      groupAnalyses.push({
        hreflang_group_id: groupId,
        languages: uniqueLanguages,
        qa_count: qaCount,
        has_duplicates: hasDuplicates,
        duplicate_languages: duplicateLangs
      });
    }
    
    // Sort by QA count and get top 10
    const largestGroups = groupAnalyses
      .sort((a, b) => b.qa_count - a.qa_count)
      .slice(0, 10)
      .map(g => ({
        hreflang_group_id: g.hreflang_group_id,
        languages: g.languages,
        qa_count: g.qa_count,
        has_duplicates: g.has_duplicates
      }));

    // ============================================
    // 2. CANONICAL URL COVERAGE
    // ============================================
    
    // Blog articles
    const { count: blogTotal } = await supabase
      .from('blog_articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    const { count: blogMissing } = await supabase
      .from('blog_articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('canonical_url', null);

    // Q&A pages
    const qaMissing = (qaPages || []).filter(q => !q.canonical_url).length;

    // Comparison pages
    const { count: compTotal } = await supabase
      .from('comparison_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    const { count: compMissing } = await supabase
      .from('comparison_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('canonical_url', null);

    // Location pages
    const { count: locTotal } = await supabase
      .from('location_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    const { count: locMissing } = await supabase
      .from('location_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('canonical_url', null);

    // Sample canonical URLs
    const { data: sampleBlogCanonicals } = await supabase
      .from('blog_articles')
      .select('canonical_url')
      .eq('status', 'published')
      .not('canonical_url', 'is', null)
      .limit(5);

    const { data: sampleQACanonicals } = await supabase
      .from('qa_pages')
      .select('canonical_url')
      .eq('status', 'published')
      .not('canonical_url', 'is', null)
      .limit(5);

    // ============================================
    // 3. HREFLANG TAG VALIDATION
    // ============================================
    
    // Find a multi-language group Q&A
    const multiLangGroup = groupAnalyses.find(g => g.languages.length >= 2 && !g.has_duplicates);
    let multiLanguageExample = null;
    
    if (multiLangGroup) {
      const qasInGroup = groupMap.get(multiLangGroup.hreflang_group_id);
      if (qasInGroup && qasInGroup.length > 0) {
        const sampleQA = qasInGroup[0];
        const hreflangTags = qasInGroup.map(qa => 
          `<link rel="alternate" hreflang="${qa.language}" href="https://www.delsolprimehomes.com/${qa.language}/qa/${qa.slug}" />`
        );
        hreflangTags.push(`<link rel="alternate" hreflang="x-default" href="https://www.delsolprimehomes.com/en/qa/${qasInGroup.find(q => q.language === 'en')?.slug || sampleQA.slug}" />`);
        
        multiLanguageExample = {
          qa_id: sampleQA.id,
          language: sampleQA.language,
          group_size: qasInGroup.length,
          hreflang_tags: hreflangTags
        };
      }
    }

    // Find a standalone Q&A (single language group)
    const standaloneGroup = groupAnalyses.find(g => g.languages.length === 1);
    let standaloneExample = null;
    
    if (standaloneGroup) {
      const qasInGroup = groupMap.get(standaloneGroup.hreflang_group_id);
      if (qasInGroup && qasInGroup.length > 0) {
        const sampleQA = qasInGroup[0];
        standaloneExample = {
          qa_id: sampleQA.id,
          language: sampleQA.language,
          hreflang_tags: [
            `<link rel="alternate" hreflang="${sampleQA.language}" href="https://www.delsolprimehomes.com/${sampleQA.language}/qa/${sampleQA.slug}" />`,
            `<link rel="alternate" hreflang="x-default" href="https://www.delsolprimehomes.com/${sampleQA.language}/qa/${sampleQA.slug}" />`
          ]
        };
      }
    }

    // Find an English Q&A in a multi-language group
    const englishMultiGroup = groupAnalyses.find(g => g.languages.includes('en') && g.languages.length >= 2);
    let englishExample = null;
    
    if (englishMultiGroup) {
      const qasInGroup = groupMap.get(englishMultiGroup.hreflang_group_id);
      const englishQA = qasInGroup?.find(q => q.language === 'en');
      if (englishQA && qasInGroup) {
        const hreflangTags = qasInGroup.map(qa => 
          `<link rel="alternate" hreflang="${qa.language}" href="https://www.delsolprimehomes.com/${qa.language}/qa/${qa.slug}" />`
        );
        hreflangTags.push(`<link rel="alternate" hreflang="x-default" href="https://www.delsolprimehomes.com/en/qa/${englishQA.slug}" />`);
        
        englishExample = {
          qa_id: englishQA.id,
          language: 'en',
          group_size: qasInGroup.length,
          hreflang_tags: hreflangTags
        };
      }
    }

    // ============================================
    // 4. BEFORE VS AFTER COMPARISON
    // ============================================
    
    const beforeV5 = {
      total_groups: totalQAs, // Before: each Q&A in own group
      avg_languages_per_group: 1.0,
      translation_linking: '0%'
    };

    const avgLanguagesAfter = uniqueGroups > 0 
      ? (totalQAs / uniqueGroups).toFixed(2) 
      : '0';
    
    const linkedQAs = (qaPages || []).filter(q => {
      const group = groupMap.get(q.hreflang_group_id || '');
      return group && group.length > 1;
    }).length;
    
    const translationLinkingPercent = totalQAs > 0 
      ? Math.round((linkedQAs / totalQAs) * 100)
      : 0;

    const afterV5 = {
      total_groups: uniqueGroups,
      avg_languages_per_group: parseFloat(avgLanguagesAfter),
      translation_linking: `${translationLinkingPercent}%`
    };

    const groupReduction = totalQAs > 0 
      ? Math.round(((totalQAs - uniqueGroups) / totalQAs) * 100)
      : 0;

    const improvement = `${groupReduction}% group consolidation, +${Math.round((afterV5.avg_languages_per_group - 1) * 100)}% multi-language linking`;

    // ============================================
    // 5. DATA QUALITY CHECKS
    // ============================================
    
    // Missing translations JSONB
    const missingTranslationsJsonb = (qaPages || []).filter(q => 
      q.hreflang_group_id && (!q.translations || Object.keys(q.translations).length === 0)
    ).length;

    // URL/Language mismatches (check if canonical URL matches language)
    const urlLanguageMismatches = (qaPages || []).filter(q => {
      if (!q.canonical_url) return false;
      const expectedPrefix = `/${q.language}/qa/`;
      return !q.canonical_url.includes(expectedPrefix);
    }).length;

    // ============================================
    // 6. HEALTH SCORE CALCULATION
    // ============================================
    
    const totalItems = (blogTotal || 0) + totalQAs + (compTotal || 0) + (locTotal || 0);
    
    // Critical issues (weight: 10 points each)
    const criticalIssues = duplicateLanguageIssues.length + orphanedQAs;
    
    // Warning issues (weight: 1 point each)
    const warningIssues = (blogMissing || 0) + qaMissing + (compMissing || 0) + (locMissing || 0) + 
                          missingTranslationsJsonb + urlLanguageMismatches + singleLanguageGroups;

    // Calculate score (100 - weighted penalties, min 0)
    const criticalPenalty = criticalIssues * 10;
    const warningPenalty = Math.min(warningIssues * 0.5, 30); // Cap warning penalty at 30
    
    const healthScore = Math.max(0, Math.round(100 - criticalPenalty - warningPenalty));

    // ============================================
    // BUILD FINAL REPORT
    // ============================================

    const report = {
      audit_timestamp: auditTimestamp,
      qa_hreflang_analysis: {
        total_qas: totalQAs,
        unique_groups: uniqueGroups,
        multi_language_groups: multiLanguageGroups,
        single_language_groups: singleLanguageGroups,
        groups_with_duplicates: groupsWithDuplicates,
        group_size_distribution: groupSizeDistribution,
        largest_groups: largestGroups,
        duplicate_language_issues: duplicateLanguageIssues.slice(0, 20), // Limit to 20
        orphaned_qas: orphanedQAs
      },
      canonical_urls: {
        blog_articles: {
          total: blogTotal || 0,
          missing: blogMissing || 0,
          coverage: blogTotal ? `${Math.round(((blogTotal - (blogMissing || 0)) / blogTotal) * 100)}%` : '0%'
        },
        qa_pages: {
          total: totalQAs,
          missing: qaMissing,
          coverage: totalQAs ? `${Math.round(((totalQAs - qaMissing) / totalQAs) * 100)}%` : '0%'
        },
        comparison_pages: {
          total: compTotal || 0,
          missing: compMissing || 0,
          coverage: compTotal ? `${Math.round(((compTotal - (compMissing || 0)) / compTotal) * 100)}%` : '0%'
        },
        location_pages: {
          total: locTotal || 0,
          missing: locMissing || 0,
          coverage: locTotal ? `${Math.round(((locTotal - (locMissing || 0)) / locTotal) * 100)}%` : '0%'
        },
        total_missing: (blogMissing || 0) + qaMissing + (compMissing || 0) + (locMissing || 0),
        sample_urls: {
          blog: (sampleBlogCanonicals || []).map(b => b.canonical_url).slice(0, 5),
          qa: (sampleQACanonicals || []).map(q => q.canonical_url).slice(0, 5)
        }
      },
      hreflang_validation: {
        multi_language_qa_example: multiLanguageExample,
        standalone_qa_example: standaloneExample,
        english_qa_example: englishExample
      },
      before_after_comparison: {
        before_v5: beforeV5,
        after_v5: afterV5,
        improvement: improvement
      },
      data_quality: {
        duplicate_languages_in_groups: duplicateLanguageIssues.length,
        url_language_mismatches: urlLanguageMismatches,
        missing_translations_jsonb: missingTranslationsJsonb,
        orphaned_content: orphanedQAs
      },
      health_score: {
        total_items: totalItems,
        critical_issues: criticalIssues,
        warning_issues: warningIssues,
        score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'needs_attention' : 'critical'
      }
    };

    console.log(`Audit complete. Health score: ${healthScore}/100`);

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit error:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      audit_timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
