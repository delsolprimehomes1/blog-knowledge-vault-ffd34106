import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false } = await req.json();

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: 'clusterId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[complete-incomplete-cluster] Starting for cluster: ${clusterId}`);

    // Step 1: Get all articles in this cluster
    const { data: existingArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, language, funnel_stage, status, detailed_content, meta_title, meta_description, speakable_answer, qa_entities, featured_image_url, featured_image_alt, category, cluster_id, hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!existingArticles || existingArticles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No articles found in this cluster' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[complete-incomplete-cluster] Found ${existingArticles.length} articles in cluster`);

    // Analyze current state - find the source language (language with most articles)
    const articlesByLang = existingArticles.reduce((acc, article) => {
      acc[article.language] = (acc[article.language] || []).concat(article);
      return acc;
    }, {} as Record<string, typeof existingArticles>);

    // Detect source language dynamically (prefer English if it exists and has articles)
    const langCounts = Object.entries(articlesByLang)
      .map(([lang, articles]) => ({ lang, count: articles.length }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (a.lang === 'en') return -1;
        if (b.lang === 'en') return 1;
        return 0;
      });
    
    const sourceLanguage = langCounts[0]?.lang || 'en';
    const sourceCount = articlesByLang[sourceLanguage]?.length || 0;
    
    console.log(`[complete-incomplete-cluster] Detected source language: ${sourceLanguage} with ${sourceCount} articles`);

    // Filter target languages to exclude source language
    const targetLanguages = ['en', ...TARGET_LANGUAGES].filter(lang => lang !== sourceLanguage);

    // Build plan
    const plan = {
      clusterId,
      currentState: {
        totalArticles: existingArticles.length,
        sourceLanguage,
        sourceCount,
        languages: Object.keys(articlesByLang),
        languageCounts: Object.fromEntries(
          Object.entries(articlesByLang).map(([lang, articles]) => [lang, articles.length])
        )
      },
      steps: [] as string[],
      estimatedNewArticles: 0
    };

    // Step 1: Need to complete source cluster to 6 articles?
    if (sourceCount < 6) {
      const needed = 6 - sourceCount;
      plan.steps.push(`Generate ${needed} more ${sourceLanguage.toUpperCase()} articles to complete the cluster (TOFU/MOFU/BOFU)`);
      plan.estimatedNewArticles += needed;
    }

    // Step 2: Translate to all other languages (including English if source isn't English)
    const missingLanguages = targetLanguages.filter(lang => !articlesByLang[lang] || articlesByLang[lang].length < 6);
    if (missingLanguages.length > 0) {
      const articlesToTranslate = Math.max(6, sourceCount);
      plan.steps.push(`Translate ${articlesToTranslate} ${sourceLanguage.toUpperCase()} articles to ${missingLanguages.length} languages: ${missingLanguages.join(', ')}`);
      plan.estimatedNewArticles += articlesToTranslate * missingLanguages.length;
    }

    // Dry run - just return the plan
    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          dryRun: true, 
          plan,
          message: `Would create ${plan.estimatedNewArticles} new articles`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update cluster_generations status
    await supabase
      .from('cluster_generations')
      .update({ 
        completion_status: 'in_progress',
        completion_started_at: new Date().toISOString(),
        english_articles_count: sourceCount
      })
      .eq('id', clusterId);

    let newSourceCount = sourceCount;
    let translatedCount = existingArticles.length - sourceCount;

    // STEP 1: Complete the source cluster (6 articles in source language)
    // Note: complete-cluster works with any source language articles in the cluster
    if (newSourceCount < 6) {
      console.log(`[complete-incomplete-cluster] Completing ${sourceLanguage.toUpperCase()} cluster (currently ${newSourceCount} articles)...`);
      
      try {
        const completeResponse = await fetch(`${supabaseUrl}/functions/v1/complete-cluster`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            clusterId,
            sourceLanguage, // Pass the detected source language
            dryRun: false
          })
        });

        if (!completeResponse.ok) {
          const errorText = await completeResponse.text();
          console.error(`[complete-incomplete-cluster] Complete cluster failed: ${errorText}`);
        } else {
          const completeResult = await completeResponse.json();
          newSourceCount = 6;
          console.log(`[complete-incomplete-cluster] Cluster completed with ${completeResult.articlesGenerated || 'unknown'} new articles`);
          
          // Wait 5 seconds for articles to be fully saved
          console.log(`[complete-incomplete-cluster] Waiting 5 seconds for articles to save...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (completeError) {
        console.error(`[complete-incomplete-cluster] Error completing cluster:`, completeError);
      }
    }

    // Update progress
    await supabase
      .from('cluster_generations')
      .update({ 
        completion_status: 'translating',
        english_articles_count: newSourceCount
      })
      .eq('id', clusterId);

    // STEP 2: Re-fetch ALL source language articles (including newly generated ones) and translate to all languages
    console.log(`[complete-incomplete-cluster] Re-fetching all ${sourceLanguage.toUpperCase()} articles for translation...`);
    
    // Re-fetch all source language articles in this cluster
    const { data: allSourceArticles, error: srcFetchError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('cluster_id', clusterId)
      .eq('language', sourceLanguage)
      .eq('status', 'published');

    if (srcFetchError) {
      console.error(`[complete-incomplete-cluster] Failed to fetch ${sourceLanguage} articles: ${srcFetchError.message}`);
    }

    const sourceArticlesToTranslate = allSourceArticles || [];
    console.log(`[complete-incomplete-cluster] Found ${sourceArticlesToTranslate.length} ${sourceLanguage.toUpperCase()} articles to translate`);

    // Get existing translations to skip already-translated articles
    const { data: existingTranslations } = await supabase
      .from('blog_articles')
      .select('hreflang_group_id, language')
      .eq('cluster_id', clusterId)
      .neq('language', sourceLanguage)
      .eq('status', 'published');

    const existingTranslationMap = new Set(
      (existingTranslations || []).map(t => `${t.hreflang_group_id}-${t.language}`)
    );

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    if (sourceArticlesToTranslate.length > 0) {
      // Translate each source article to all target languages (including English if source isn't English)
      for (const article of sourceArticlesToTranslate) {
        const groupId = article.hreflang_group_id || article.id;
        
        for (const targetLang of targetLanguages) {
          // Skip if translation already exists
          const translationKey = `${groupId}-${targetLang}`;
          if (existingTranslationMap.has(translationKey)) {
            console.log(`[complete-incomplete-cluster] Skipping existing ${targetLang} translation for article ${article.id}`);
            skipCount++;
            continue;
          }
          
          try {
            console.log(`[complete-incomplete-cluster] Translating article "${article.headline}" to ${targetLang}...`);
            
            const translateResponse = await fetch(`${supabaseUrl}/functions/v1/translate-article`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                englishArticle: { ...article, hreflang_group_id: groupId }, // Works with any source language
                targetLanguage: targetLang
              })
            });

            if (translateResponse.ok) {
              const responseData = await translateResponse.json();
              const translatedArticle = responseData.article;
              
              if (!translatedArticle) {
                console.error(`[complete-incomplete-cluster] No article in translation response for ${targetLang}`);
                errorCount++;
                continue;
              }
              
              // Save translated article
              const translatedSlug = translatedArticle.slug || article.slug;
              const langPrefix = targetLang === 'en' ? '' : `/${targetLang}`;
              const { error: insertError } = await supabase
                .from('blog_articles')
                .insert({
                  ...translatedArticle,
                  cluster_id: clusterId,
                  language: targetLang,
                  status: 'published',
                  date_published: new Date().toISOString(),
                  date_modified: new Date().toISOString(),
                  hreflang_group_id: groupId,
                  source_language: sourceLanguage,
                  canonical_url: `https://www.delsolprimehomes.com${langPrefix}/blog/${translatedSlug}`
                });

              if (insertError) {
                if (insertError.message.includes('duplicate') || insertError.code === '23505') {
                  console.log(`[complete-incomplete-cluster] Skipping duplicate ${targetLang} article`);
                  skipCount++;
                } else {
                  console.error(`[complete-incomplete-cluster] Failed to save ${targetLang} article: ${insertError.message}`);
                  errorCount++;
                }
              } else {
                successCount++;
                existingTranslationMap.add(translationKey); // Prevent duplicates in same run
              }
            } else {
              const errText = await translateResponse.text();
              console.error(`[complete-incomplete-cluster] Translation to ${targetLang} failed: ${errText}`);
              errorCount++;
            }
          } catch (translateError) {
            console.error(`[complete-incomplete-cluster] Error translating to ${targetLang}:`, translateError);
            errorCount++;
          }
        }
      }
      
      console.log(`[complete-incomplete-cluster] Translation complete: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);
    } else {
      console.warn(`[complete-incomplete-cluster] No ${sourceLanguage.toUpperCase()} articles found to translate`);
    }

    // Get final count
    const { count: finalCount } = await supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    // Mark as completed
    await supabase
      .from('cluster_generations')
      .update({ 
        completion_status: 'completed',
        completion_completed_at: new Date().toISOString(),
        translated_articles_count: (finalCount || 0) - newSourceCount
      })
      .eq('id', clusterId);

    console.log(`[complete-incomplete-cluster] Completed! Final article count: ${finalCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        clusterId,
        originalCount: existingArticles.length,
        finalCount: finalCount || 0,
        plan
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[complete-incomplete-cluster] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
