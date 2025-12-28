import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

const LANGUAGE_INFO: Record<string, { name: string; flag: string }> = {
  'en': { name: 'English', flag: '🇬🇧' },
  'de': { name: 'German', flag: '🇩🇪' },
  'nl': { name: 'Dutch', flag: '🇳🇱' },
  'fr': { name: 'French', flag: '🇫🇷' },
  'pl': { name: 'Polish', flag: '🇵🇱' },
  'sv': { name: 'Swedish', flag: '🇸🇪' },
  'da': { name: 'Danish', flag: '🇩🇰' },
  'hu': { name: 'Hungarian', flag: '🇭🇺' },
  'fi': { name: 'Finnish', flag: '🇫🇮' },
  'no': { name: 'Norwegian', flag: '🇳🇴' },
};

interface TranslationProgress {
  article: number;
  total: number;
  currentHeadline: string;
  status: 'translating' | 'saving' | 'complete' | 'error';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { clusterId, targetLanguage, forceRegenerate = false } = await req.json();

    if (!clusterId) {
      throw new Error('clusterId is required');
    }

    if (!targetLanguage || !TARGET_LANGUAGES.includes(targetLanguage)) {
      throw new Error(`targetLanguage must be one of: ${TARGET_LANGUAGES.join(', ')}`);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const langInfo = LANGUAGE_INFO[targetLanguage];

    console.log(`[translate-cluster-to-language] Starting translation of cluster ${clusterId} to ${langInfo.name} (${langInfo.flag})`);

    // Step 1: Get all English articles in the cluster
    const { data: englishArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('cluster_id', clusterId)
      .eq('language', 'en')
      .eq('status', 'published')
      .order('cluster_number', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch English articles: ${fetchError.message}`);
    }

    if (!englishArticles || englishArticles.length === 0) {
      throw new Error(`No English articles found in cluster ${clusterId}`);
    }

    console.log(`[translate-cluster-to-language] Found ${englishArticles.length} English articles to translate`);

    // Step 2: Check which translations already exist
    const { data: existingTranslations, error: existingError } = await supabase
      .from('blog_articles')
      .select('id, hreflang_group_id, headline')
      .eq('cluster_id', clusterId)
      .eq('language', targetLanguage)
      .eq('status', 'published');

    if (existingError) {
      console.warn(`[translate-cluster-to-language] Warning checking existing translations: ${existingError.message}`);
    }

    const existingHreflangGroups = new Set(
      (existingTranslations || []).map(t => t.hreflang_group_id).filter(Boolean)
    );

    console.log(`[translate-cluster-to-language] Found ${existingHreflangGroups.size} existing ${targetLanguage} translations`);

    // Step 3: Filter articles that need translation
    const articlesToTranslate = forceRegenerate 
      ? englishArticles 
      : englishArticles.filter(article => !existingHreflangGroups.has(article.hreflang_group_id));

    if (articlesToTranslate.length === 0) {
      console.log(`[translate-cluster-to-language] All articles already translated to ${targetLanguage}`);
      return new Response(
        JSON.stringify({
          success: true,
          clusterId,
          targetLanguage,
          languageName: langInfo.name,
          languageFlag: langInfo.flag,
          articlesTranslated: 0,
          articlesSkipped: englishArticles.length,
          message: `All ${englishArticles.length} articles already translated to ${langInfo.name}`,
          duration: `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[translate-cluster-to-language] Will translate ${articlesToTranslate.length} articles (skipping ${englishArticles.length - articlesToTranslate.length})`);

    // Step 4: Translate each article sequentially
    const results: { success: boolean; headline?: string; error?: string }[] = [];
    let translatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < articlesToTranslate.length; i++) {
      const article = articlesToTranslate[i];
      console.log(`[translate-cluster-to-language] Translating article ${i + 1}/${articlesToTranslate.length}: "${article.headline}"`);

      try {
        // Call the translate-article edge function with 2-minute timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 minutes
        
        let translateResponse: Response;
        try {
          translateResponse = await fetch(`${SUPABASE_URL}/functions/v1/translate-article`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              englishArticle: article,
              targetLanguage: targetLanguage
            }),
            signal: controller.signal,
          });
        } catch (fetchError) {
          clearTimeout(timeout);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`Translation timed out after 2 minutes - article may be too long (${(article.detailed_content?.length || 0).toLocaleString()} chars)`);
          }
          throw fetchError;
        }
        
        clearTimeout(timeout);

        if (!translateResponse.ok) {
          const errorText = await translateResponse.text();
          // Provide clearer error messages
          if (translateResponse.status === 504) {
            throw new Error(`Translation gateway timeout - article too long (${(article.detailed_content?.length || 0).toLocaleString()} chars)`);
          }
          if (errorText.includes('aborted') || errorText.includes('timeout')) {
            throw new Error(`Translation timed out - article content: ${(article.detailed_content?.length || 0).toLocaleString()} chars`);
          }
          throw new Error(`Translation API error (${translateResponse.status}): ${errorText}`);
        }

        const translateResult = await translateResponse.json();

        if (!translateResult.success || !translateResult.article) {
          throw new Error(translateResult.error || 'Translation failed - no article returned');
        }

        const translatedArticle = translateResult.article;

        // If force regenerating, delete existing translation first
        if (forceRegenerate && existingHreflangGroups.has(article.hreflang_group_id)) {
          await supabase
            .from('blog_articles')
            .delete()
            .eq('hreflang_group_id', article.hreflang_group_id)
            .eq('language', targetLanguage);
        }

        // Insert the translated article
        const { data: insertedArticle, error: insertError } = await supabase
          .from('blog_articles')
          .insert({
            ...translatedArticle,
            status: 'published',
            date_published: new Date().toISOString(),
            date_modified: new Date().toISOString(),
            canonical_url: null, // Will be set based on slug
          })
          .select('id, slug, headline')
          .single();

        if (insertError) {
          throw new Error(`Failed to save translation: ${insertError.message}`);
        }

        // Update English article's translations JSONB with link to new translation
        if (insertedArticle) {
          const updatedTranslations = {
            ...(article.translations || {}),
            [targetLanguage]: insertedArticle.slug
          };

          await supabase
            .from('blog_articles')
            .update({ translations: updatedTranslations })
            .eq('id', article.id);
        }

        console.log(`[translate-cluster-to-language] ✅ Saved: "${insertedArticle?.headline}" (${insertedArticle?.slug})`);
        results.push({ success: true, headline: insertedArticle?.headline });
        translatedCount++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[translate-cluster-to-language] ❌ Failed to translate "${article.headline}": ${errorMessage}`);
        results.push({ success: false, headline: article.headline, error: errorMessage });
        errorCount++;
      }
    }

    // Step 5: Update cluster progress tracking
    try {
      // Get or create cluster progress record
      const { data: progress, error: progressError } = await supabase
        .from('cluster_completion_progress')
        .select('*')
        .eq('cluster_id', clusterId)
        .single();

      const languagesStatus = progress?.languages_status || {};
      languagesStatus[targetLanguage] = {
        count: translatedCount + (englishArticles.length - articlesToTranslate.length),
        completed: (translatedCount + (englishArticles.length - articlesToTranslate.length)) >= englishArticles.length,
        completed_at: new Date().toISOString(),
        errors: errorCount
      };

      if (progress) {
        await supabase
          .from('cluster_completion_progress')
          .update({
            languages_status: languagesStatus,
            translations_completed: (progress.translations_completed || 0) + translatedCount,
            articles_completed: (progress.articles_completed || 0) + translatedCount,
            last_updated: new Date().toISOString()
          })
          .eq('cluster_id', clusterId);
      } else {
        // Get cluster info for new record
        const firstArticle = englishArticles[0];
        await supabase
          .from('cluster_completion_progress')
          .insert({
            cluster_id: clusterId,
            cluster_theme: firstArticle.cluster_theme,
            status: 'in_progress',
            tier: 'tier1',
            english_articles: englishArticles.length,
            total_articles_needed: englishArticles.length * 10, // 10 languages
            translations_completed: translatedCount,
            articles_completed: translatedCount + englishArticles.length,
            languages_status: languagesStatus,
            started_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
          });
      }
    } catch (progressError) {
      console.warn(`[translate-cluster-to-language] Warning updating progress: ${progressError}`);
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const skippedCount = englishArticles.length - articlesToTranslate.length;

    // Suggest next language
    const allLanguages = ['en', ...TARGET_LANGUAGES];
    const completedLanguages = [targetLanguage];
    const nextLanguage = TARGET_LANGUAGES.find(lang => !completedLanguages.includes(lang) && lang !== targetLanguage);

    console.log(`[translate-cluster-to-language] ✅ Complete! Translated ${translatedCount}, skipped ${skippedCount}, errors ${errorCount}. Duration: ${duration} minutes`);

    return new Response(
      JSON.stringify({
        success: true,
        clusterId,
        targetLanguage,
        languageName: langInfo.name,
        languageFlag: langInfo.flag,
        articlesTranslated: translatedCount,
        articlesSkipped: skippedCount,
        articlesFailed: errorCount,
        totalEnglishArticles: englishArticles.length,
        duration: `${duration} minutes`,
        results,
        nextLanguage: nextLanguage ? {
          code: nextLanguage,
          name: LANGUAGE_INFO[nextLanguage].name,
          flag: LANGUAGE_INFO[nextLanguage].flag
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[translate-cluster-to-language] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
